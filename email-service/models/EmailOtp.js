const mongoose = require('mongoose');

const emailOtpSchema = new mongoose.Schema({
  email: { type: String, required: true },
  otp: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  attempts: { type: Number, default: 0 },
}, { collection: 'Authentication.Email.Otp' });

module.exports = mongoose.model('EmailOtp', emailOtpSchema);