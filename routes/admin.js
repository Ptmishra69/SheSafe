// routes/admin.js
const express = require('express');
const router = express.Router();
const { getReports, verifyReport, listDangerZones, deactivateZone } = require('../controllers/adminController');
// NOTE: for simplicity, admin protection is not implemented — add role-based auth for real app

router.get('/reports', getReports);
router.put('/reports/verify/:reportId', verifyReport);
router.get('/zones', listDangerZones);
router.put('/zones/deactivate/:id', deactivateZone);

module.exports = router;
