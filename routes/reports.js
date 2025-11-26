// routes/reports.js
const express = require('express');
const router = express.Router();
const { createReport, checkLocation } = require('../controllers/reportController');
const { protect } = require('../middlewares/auth');

router.post('/', protect, createReport); // submit report
router.get('/check', protect, checkLocation); // ?lat=&lng=

module.exports = router;
