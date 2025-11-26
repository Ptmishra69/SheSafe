// models/DangerZone.js
const mongoose = require('mongoose');

const DangerZoneSchema = new mongoose.Schema({
  center: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true } // [lng, lat]
  },
  radiusMeters: { type: Number, default: Number(process.env.REDZONE_RADIUS_METERS || 50) },
  reportCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  active: { type: Boolean, default: true }
});

DangerZoneSchema.index({ center: '2dsphere' });

module.exports = mongoose.model('DangerZone', DangerZoneSchema);
