const express = require('express');
const { getDashboardStats } = require('../services/dashboardService');
const authService = require('../services/authService');

const router = express.Router();

// Protect all dashboard routes
router.use(authService.protect, authService.allowedTo('admin', 'manager'));

router.get('/stats', getDashboardStats);

module.exports = router;
