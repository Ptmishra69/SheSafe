// models/SOSAlert.js
const mongoose = require('mongoose');

const SOSAlertSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true }
  },
  contactsNotified: [{ type: String }],
  policeNotified: { type: Boolean, default: false },
  status: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

SOSAlertSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('SOSAlert', SOSAlertSchema);
