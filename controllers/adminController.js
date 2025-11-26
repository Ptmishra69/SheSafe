// controllers/adminController.js
const Report = require('../models/Report');
const DangerZone = require('../models/DangerZone');

exports.getReports = async (req, res) => {
  try {
    const reports = await Report.find().populate('user', 'name phone email');
    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.verifyReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const report = await Report.findById(reportId);
    if (!report) return res.status(404).json({ message: 'Report not found' });
    report.verified = true;
    await report.save();
    res.json({ message: 'Report verified' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.listDangerZones = async (req, res) => {
  try {
    const zones = await DangerZone.find().lean();
    res.json(zones);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deactivateZone = async (req, res) => {
  try {
    const { id } = req.params;
    const z = await DangerZone.findById(id);
    if (!z) return res.status(404).json({ message: 'Zone not found' });
    z.active = false;
    await z.save();
    res.json({ message: 'Zone deactivated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
