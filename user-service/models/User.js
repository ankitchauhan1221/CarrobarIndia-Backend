const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String },
  role: { type: String, enum: ['admin', 'user', 'dealer'], default: 'user' },
  isVerified: { type: Boolean, default: false },
}, { timestamps: true, collection: 'CarrobarIndia.Users' });

module.exports = mongoose.model('User', userSchema);