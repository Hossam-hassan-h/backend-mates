const express = require('express');
const {
  getVariants,
  getVariant,
  createVariant,
  updateVariant,
  deleteVariant,
  createFilterObj,
  setProductIdToBody,
} = require('../services/variantService');
const authService = require('../services/authService');

const router = express.Router({ mergeParams: true });

router
  .route('/')
  .get(createFilterObj, getVariants)
  .post(
    authService.protect,
    authService.allowedTo('admin', 'manager'),
    setProductIdToBody,
    createVariant
  );

router
  .route('/:id')
  .get(getVariant)
  .put(authService.protect, authService.allowedTo('admin', 'manager'), updateVariant)
  .delete(authService.protect, authService.allowedTo('admin'), deleteVariant);

module.exports = router;
