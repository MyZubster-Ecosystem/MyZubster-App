const { JobMap, Notification, ChatMessage, RobotProfile } = require('../models/appFeaturesModel');
const { v4: uuidv4 } = require('uuid');

// #75: Mappa Lavori Interattiva
exports.getJobMap = async (req, res) => {
  try {
    const { lat, lng, maxDist, category } = req.query;
    let query = JobMap.find({ status: 'published' });
    if (lat && lng && maxDist) {
      const d = parseFloat(maxDist);
      query = query.where('lat').gte(parseFloat(lat)-d).lte(parseFloat(lat)+d)
                   .where('lng').gte(parseFloat(lng)-d).lte(parseFloat(lng)+d);
    }
    if (category) query = query.where('category').equals(category);
    const jobs = await query.sort({ createdAt: -1 }).limit(200);
    res.json({ count: jobs.length, jobs: jobs.map(j => ({
      jobId: j.jobId, title: j.title, price: j.price, currency: j.currency,
      category: j.category, status: j.status, lat: j.lat, lng: j.lng,
      address: j.address, createdAt: j.createdAt
    }))});
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.addJobToMap = async (req, res) => {
  try {
    const { jobId, title, price, currency, category, lat, lng, address, customerId } = req.body;
    if (!jobId || !title || lat === undefined || lng === undefined)
      return res.status(400).json({ error: 'jobId, title, lat, lng required' });
    const jm = new JobMap({ jobId, title, price, currency, category, lat, lng, address, customerId });
    await jm.save();
    res.status(201).json({ message: 'Job added to map', jobId });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.updateJobMapStatus = async (req, res) => {
  try {
    const { status, robotId } = req.body;
    const jm = await JobMap.findOne({ jobId: req.params.jobId });
    if (!jm) return res.status(404).json({ error: 'Not found' });
    if (status) jm.status = status;
    if (robotId) jm.robotId = robotId;
    await jm.save();
    res.json({ message: 'Updated', status: jm.status });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// #76: Notifiche Push
exports.createNotification = async (req, res) => {
  try {
    const { userId, type, title, body, data } = req.body;
    if (!userId || !type || !title || !body)
      return res.status(400).json({ error: 'userId, type, title, body required' });
    const n = new Notification({
      notificationId: uuidv4().substring(0, 12),
      userId, type, title, body, data: data || {}
    });
    await n.save();
    res.status(201).json({ message: 'Notification sent', notificationId: n.notificationId });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getNotifications = async (req, res) => {
  try {
    const { userId, unreadOnly } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    let query = Notification.find({ userId });
    if (unreadOnly === 'true') query = query.find({ read: false });
    const notifications = await query.sort({ createdAt: -1 }).limit(50);
    res.json({ count: notifications.length, notifications });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.markNotificationRead = async (req, res) => {
  try {
    const n = await Notification.findOne({ notificationId: req.params.notificationId });
    if (!n) return res.status(404).json({ error: 'Not found' });
    n.read = true; await n.save();
    res.json({ message: 'Marked as read' });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// #77: Chat in-app
exports.sendMessage = async (req, res) => {
  try {
    const { jobId, senderId, senderType, text, attachments } = req.body;
    if (!jobId || !senderId || !senderType || !text)
      return res.status(400).json({ error: 'jobId, senderId, senderType, text required' });
    const msg = new ChatMessage({
      messageId: uuidv4().substring(0, 12),
      jobId, senderId, senderType, text, attachments: attachments || []
    });
    await msg.save();
    res.status(201).json({ message: 'Message sent', messageId: msg.messageId });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getChatHistory = async (req, res) => {
  try {
    const messages = await ChatMessage.find({ jobId: req.params.jobId })
      .sort({ createdAt: 1 }).limit(100);
    res.json({ count: messages.length, messages });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// #78: Profilo Robot Pubblico
exports.createRobotProfile = async (req, res) => {
  try {
    const { robotId, name, model, walletAddress, bio, capabilities } = req.body;
    if (!robotId || !name) return res.status(400).json({ error: 'robotId and name required' });
    const rp = new RobotProfile({
      robotId, name, model: model || 'EVA-IONI',
      walletAddress, bio, capabilities: capabilities || []
    });
    await rp.save();
    res.status(201).json({ message: 'Profile created', robotId });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getRobotProfile = async (req, res) => {
  try {
    const rp = await RobotProfile.findOne({ robotId: req.params.robotId });
    if (!rp) return res.status(404).json({ error: 'Robot not found' });
    res.json({
      robotId: rp.robotId, name: rp.name, model: rp.model,
      walletAddress: rp.walletAddress, avatar: rp.avatar, bio: rp.bio,
      capabilities: rp.capabilities, stats: rp.stats,
      reputation: rp.reputation, isActive: rp.isActive,
      createdAt: rp.createdAt
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.listRobotProfiles = async (req, res) => {
  try {
    const { capability } = req.query;
    let query = RobotProfile.find({ isActive: true });
    if (capability) query = query.find({ capabilities: capability });
    const robots = await query.sort({ reputation: -1 }).limit(50);
    res.json({ count: robots.length, robots: robots.map(r => ({
      robotId: r.robotId, name: r.name, model: r.model,
      capabilities: r.capabilities, stats: r.stats,
      reputation: r.reputation
    }))});
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.updateRobotStats = async (req, res) => {
  try {
    const { jobsCompleted, totalEarnings, avgRating, successRate } = req.body;
    const rp = await RobotProfile.findOne({ robotId: req.params.robotId });
    if (!rp) return res.status(404).json({ error: 'Not found' });
    if (jobsCompleted !== undefined) rp.stats.jobsCompleted = jobsCompleted;
    if (totalEarnings !== undefined) rp.stats.totalEarnings = totalEarnings;
    if (avgRating !== undefined) rp.stats.avgRating = avgRating;
    if (successRate !== undefined) rp.stats.successRate = successRate;
    rp.updatedAt = new Date();
    await rp.save();
    res.json({ message: 'Stats updated', stats: rp.stats });
  } catch (e) { res.status(500).json({ error: e.message }); }
};
