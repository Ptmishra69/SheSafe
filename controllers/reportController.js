// controllers/reportController.js
const Report = require('../models/Report');
const DangerZone = require('../models/DangerZone');
const mongoose = require('mongoose');

// create new report
exports.createReport = async (req, res) => {
  try {
    const { description, lat, lng } = req.body;
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({ message: 'Invalid coordinates' });
    }
    const report = await Report.create({
      user: req.user._id,
      description,
      location: { type: 'Point', coordinates: [lng, lat] }
    });

    // After creating report, aggregate nearby reports to determine if danger zone threshold met
    await checkAndMarkDangerZone(lng, lat);

    res.status(201).json({ message: 'Report submitted', report });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const checkAndMarkDangerZone = async (lng, lat) => {
  const threshold = Number(process.env.REPORT_THRESHOLD || 3);
  // search reports within radius (meters)
  const radiusMeters = Number(process.env.REDZONE_RADIUS_METERS || 50);
  // convert meters to radians for $geoWithin/$centerSphere: meters / earthRadius
  const earthRadius = 6378137;
  const radiusRadians = radiusMeters / earthRadius;

  // Count reports near the point
  const nearbyCount = await Report.countDocuments({
    location: {
      $geoWithin: { $centerSphere: [[lng, lat], radiusRadians] }
    }
  });

  if (nearbyCount >= threshold) {
    // find if an existing DangerZone overlaps (center within radius)
    const overlapping = await DangerZone.findOne({
      center: {
        $geoWithin: { $centerSphere: [[lng, lat], radiusRadians] }
      }
    });

    if (overlapping) {
      overlapping.reportCount = Math.max(overlapping.reportCount, nearbyCount);
      overlapping.active = true;
      await overlapping.save();
    } else {
      // create new danger zone at the reported center
      const dz = await DangerZone.create({
        center: { type: 'Point', coordinates: [lng, lat] },
        radiusMeters,
        reportCount: nearbyCount,
        active: true
      });
      console.log('New DangerZone created:', dz._id);
    }
  }
};

// endpoint: check if coords inside any danger zone
exports.checkLocation = async (req, res) => {
  try {
    const { lat, lng } = req.query;
    const latN = Number(lat);
    const lngN = Number(lng);
    if (isNaN(latN) || isNaN(lngN)) return res.status(400).json({ message: 'Invalid coords' });

    // find danger zones where point is inside center with radiusMeters
    const zones = await DangerZone.find({
      active: true,
      center: {
        $nearSphere: {
          $geometry: { type: 'Point', coordinates: [lngN, latN] },
          $maxDistance: Number(process.env.REDZONE_RADIUS_METERS || 50)
        }
      }
    }).lean();

    if (!zones || zones.length === 0) {
      return res.json({ inDangerZone: false, zones: [] });
    } else {
      return res.json({ inDangerZone: true, zones });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
