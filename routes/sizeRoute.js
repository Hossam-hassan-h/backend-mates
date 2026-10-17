const express = require('express');
const {
  getSizes,
  getSize,
  createSize,
  updateSize,
  deleteSize,
} = require('../services/sizeService');
const authService = require('../services/authService');

const router = express.Router();

router
  .route('/')
  .get(getSizes)
  .post(authService.protect, authService.allowedTo('admin', 'manager'), createSize);

router
  .route('/:id')
  .get(getSize)
  .put(authService.protect, authService.allowedTo('admin', 'manager'), updateSize)
  .delete(authService.protect, authService.allowedTo('admin'), deleteSize);

module.exports = router;
