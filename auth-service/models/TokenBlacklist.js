const mongoose = require('mongoose');

const tokenBlacklistSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true }
}, { collection: 'Authentication.TokenBlacklist' });

module.exports = mongoose.model('TokenBlacklist', tokenBlacklistSchema);