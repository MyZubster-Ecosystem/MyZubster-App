const express = require('express');
const router = express.Router();
const c = require('../controllers/appFeaturesController');
const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try { req.user = jwt.verify(token, process.env.JWT_SECRET || 'secret'); next(); }
  catch (e) { return res.status(401).json({ error: 'Invalid token' }); }
};

const admin = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin required' });
  next();
};

// #75: Job map
router.get('/map/jobs', c.getJobMap);
router.post('/map/jobs', auth, c.addJobToMap);
router.put('/map/jobs/:jobId', auth, c.updateJobMapStatus);

// #76: Notifications
router.post('/notifications', auth, c.createNotification);
router.get('/notifications', c.getNotifications);
router.put('/notifications/:notificationId/read', auth, c.markNotificationRead);

// #77: Chat
router.post('/chat/messages', auth, c.sendMessage);
router.get('/chat/:jobId', c.getChatHistory);

// #78: Robot profiles
router.post('/robots', auth, c.createRobotProfile);
router.get('/robots', c.listRobotProfiles);
router.get('/robots/:robotId', c.getRobotProfile);
router.put('/robots/:robotId/stats', auth, admin, c.updateRobotStats);

module.exports = router;
