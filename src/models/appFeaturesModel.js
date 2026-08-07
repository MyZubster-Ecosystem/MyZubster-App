const mongoose = require('mongoose');

// #75: Job map location
const jobMapSchema = new mongoose.Schema({
  jobId: {type: String, required: true, index: true},
  title: String, price: Number, currency: {type: String, default: 'EUR'},
  category: String, status: {type: String, default: 'published'},
  lat: Number, lng: Number, address: String,
  customerId: String, robotId: {type: String, default: null},
  createdAt: {type: Date, default: Date.now}
});

// #76: Push notifications
const notificationSchema = new mongoose.Schema({
  notificationId: {type: String, required: true, unique: true, index: true},
  userId: {type: String, required: true, index: true},
  type: {type: String, enum: ['job_accepted','job_started','job_completed','job_cancelled','new_message','payment_received','system'], required: true},
  title: {type: String, required: true},
  body: {type: String, required: true},
  data: {type: Object, default: {}},
  read: {type: Boolean, default: false},
  createdAt: {type: Date, default: Date.now}
});

// #77: In-app chat
const chatMessageSchema = new mongoose.Schema({
  messageId: {type: String, required: true, unique: true, index: true},
  jobId: {type: String, required: true, index: true},
  senderId: {type: String, required: true},
  senderType: {type: String, enum: ['customer','robot'], required: true},
  text: {type: String, required: true},
  attachments: [{type: String, url: String, uploadedAt: {type: Date, default: Date.now}}],
  read: {type: Boolean, default: false},
  createdAt: {type: Date, default: Date.now}
});

// #78: Public robot profile
const robotProfileSchema = new mongoose.Schema({
  robotId: {type: String, required: true, unique: true, index: true},
  name: {type: String, required: true},
  model: {type: String, default: 'EVA-IONI'},
  walletAddress: {type: String, default: null},
  avatar: {type: String, default: null},
  bio: {type: String, default: ''},
  capabilities: [String],
  stats: {jobsCompleted: {type: Number, default: 0}, totalEarnings: {type: Number, default: 0}, avgRating: {type: Number, default: 0}, successRate: {type: Number, default: 0}},
  reputation: {type: Number, default: 0},
  isActive: {type: Boolean, default: true},
  createdAt: {type: Date, default: Date.now},
  updatedAt: {type: Date, default: Date.now}
});

module.exports = {
  JobMap: mongoose.model('JobMap', jobMapSchema),
  Notification: mongoose.model('Notification', notificationSchema),
  ChatMessage: mongoose.model('ChatMessage', chatMessageSchema),
  RobotProfile: mongoose.model('RobotProfile', robotProfileSchema)
};
