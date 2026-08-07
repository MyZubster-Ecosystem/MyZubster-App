const Job = require('../models/jobModel');
const { v4: uuidv4 } = require('uuid');

exports.createJob = async (req, res) => {
  try {
    const {title, description, customerId, price, currency, category, lat, lng, address} = req.body;
    if (!title || !description || !customerId || !price)
      return res.status(400).json({error: 'title, description, customerId, price required'});
    const job = new Job({
      jobId: uuidv4().substring(0,12), title, description, customerId, price,
      currency: currency||'EUR', category: category||'other',
      location: {lat, lng, address}, expiresAt: new Date(Date.now()+7*24*60*60*1000)
    });
    await job.save();
    res.status(201).json({message: 'Job published', jobId: job.jobId, status: 'published'});
  } catch (e) { res.status(500).json({error: e.message}); }
};

exports.getJobs = async (req, res) => {
  try {
    const {lat, lng, maxDist, category, status} = req.query;
    let query;
    if (lat && lng) query = Job.findAvailable(parseFloat(lat), parseFloat(lng), parseFloat(maxDist||1));
    else query = Job.find(status ? {status} : {status: 'published'});
    if (category) query = query.where('category').equals(category);
    const jobs = await query.sort({createdAt: -1}).limit(100);
    res.json({count: jobs.length, jobs: jobs.map(j => ({jobId: j.jobId, title: j.title, price: j.price, currency: j.currency, category: j.category, status: j.status, location: j.location, createdAt: j.createdAt}))});
  } catch (e) { res.status(500).json({error: e.message}); }
};

exports.getJob = async (req, res) => {
  try {
    const job = await Job.findOne({jobId: req.params.jobId});
    if (!job) return res.status(404).json({error: 'Job not found'});
    res.json(job);
  } catch (e) { res.status(500).json({error: e.message}); }
};

exports.acceptJob = async (req, res) => {
  try {
    const {robotId} = req.body;
    if (!robotId) return res.status(400).json({error: 'robotId required'});
    const job = await Job.findOne({jobId: req.params.jobId});
    if (!job) return res.status(404).json({error: 'Job not found'});
    if (job.status !== 'published') return res.status(400).json({error: `Job is ${job.status}`});
    job.status = 'accepted'; job.robotId = robotId; job.acceptedAt = new Date();
    await job.save();
    res.json({message: 'Job accepted', jobId: job.jobId, status: job.status});
  } catch (e) { res.status(500).json({error: e.message}); }
};

exports.startJob = async (req, res) => {
  try {
    const job = await Job.findOne({jobId: req.params.jobId});
    if (!job) return res.status(404).json({error: 'Not found'});
    if (job.status !== 'accepted') return res.status(400).json({error: `Must be accepted (current: ${job.status})`});
    job.status = 'in_progress'; await job.save();
    res.json({message: 'Job started', status: job.status});
  } catch (e) { res.status(500).json({error: e.message}); }
};

exports.completeJob = async (req, res) => {
  try {
    const {rating, review} = req.body;
    const job = await Job.findOne({jobId: req.params.jobId});
    if (!job) return res.status(404).json({error: 'Not found'});
    if (job.status !== 'in_progress') return res.status(400).json({error: `Must be in progress (current: ${job.status})`});
    job.status = 'completed'; job.completedAt = new Date();
    if (rating) job.rating = rating; if (review) job.review = review;
    await job.save();
    res.json({message: 'Job completed', status: job.status});
  } catch (e) { res.status(500).json({error: e.message}); }
};

exports.cancelJob = async (req, res) => {
  try {
    const {reason} = req.body;
    const job = await Job.findOne({jobId: req.params.jobId});
    if (!job) return res.status(404).json({error: 'Not found'});
    if (job.status === 'completed') return res.status(400).json({error: 'Already completed'});
    job.status = 'cancelled'; await job.save();
    res.json({message: 'Job cancelled', reason: reason||'No reason provided'});
  } catch (e) { res.status(500).json({error: e.message}); }
};

exports.getStats = async (req, res) => {
  try {
    const total = await Job.countDocuments();
    const published = await Job.countDocuments({status: 'published'});
    const accepted = await Job.countDocuments({status: 'accepted'});
    const inProgress = await Job.countDocuments({status: 'in_progress'});
    const completed = await Job.countDocuments({status: 'completed'});
    const cancelled = await Job.countDocuments({status: 'cancelled'});
    res.json({total, published, accepted, inProgress, completed, cancelled});
  } catch (e) { res.status(500).json({error: e.message}); }
};
