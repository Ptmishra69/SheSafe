// routes/alerts.js
const express = require('express');
const router = express.Router();
const { triggerSOS } = require('../controllers/alertController');
const { protect } = require('../middlewares/auth');

router.post('/sos', protect, triggerSOS);

module.exports = router;
