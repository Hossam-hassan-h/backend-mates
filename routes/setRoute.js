const express = require('express');
const {
  getSets,
  getSet,
  createSet,
  updateSet,
  deleteSet,
} = require('../services/setService');
const authService = require('../services/authService');

const router = express.Router();

router
  .route('/')
  .get(getSets)
  .post(authService.protect, authService.allowedTo('admin', 'manager'), createSet);

router
  .route('/:id')
  .get(getSet)
  .put(authService.protect, authService.allowedTo('admin', 'manager'), updateSet)
  .delete(authService.protect, authService.allowedTo('admin'), deleteSet);

module.exports = router;
