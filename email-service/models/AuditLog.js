const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  email: { type: String, required: true },
  action: { type: String, enum: ['send', 'resend'], required: true },
  timestamp: { type: Date, default: Date.now },
}, { collection: 'Otp.Audit.log' });

module.exports = mongoose.model('AuditLog', auditLogSchema);