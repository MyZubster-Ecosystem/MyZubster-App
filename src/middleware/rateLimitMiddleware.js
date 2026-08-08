const rateLimit = require('express-rate-limit');
const apiLimiter = rateLimit({windowMs: 15*60*1000, max: 100, standardHeaders: true, legacyHeaders: false, message: {error: 'Too many requests from this IP, please try again later.'}});
const authLimiter = rateLimit({windowMs: 15*60*1000, max: 5, standardHeaders: true, legacyHeaders: false, message: {error: 'Too many auth attempts, please try again later.'}});
const paymentLimiter = rateLimit({windowMs: 60*60*1000, max: 20, standardHeaders: true, legacyHeaders: false, message: {error: 'Too many payment requests, please try again later.'}});
const adminLimiter = rateLimit({windowMs: 5*60*1000, max: 10, standardHeaders: true, legacyHeaders: false, message: {error: 'Too many admin requests.'}});
module.exports = {apiLimiter, authLimiter, paymentLimiter, adminLimiter};
