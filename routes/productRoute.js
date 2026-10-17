const express = require('express');
const {
  getProductValidator,
  createProductValidator,
  updateProductValidator,
  deleteProductValidator,
} = require('../utils/validators/productValidator');

const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImages,
  resizeProductImages,
  normalizeProductData,
  getDiscountedProducts,
  deleteBulkProducts,
  updateBulkStatus,
} = require('../services/productService');
const authService = require('../services/authService');
const reviewsRoute = require('./reviewRoute');
const variantRoute = require('./variantRoute');

const router = express.Router();

// Nested routes
router.use('/:productId/reviews', reviewsRoute);
router.use('/:productId/variants', variantRoute);

// Public route to get only discounted products
router.get('/discounted', getDiscountedProducts);

// Bulk product operations (Protected for admin / manager)
router.delete(
  '/bulk',
  authService.protect,
  authService.allowedTo('admin'),
  deleteBulkProducts
);
router.put(
  '/bulk/status',
  authService.protect,
  authService.allowedTo('admin', 'manager'),
  updateBulkStatus
);

router
  .route('/')
  .get(getProducts)
  .post(
    authService.protect,
    authService.allowedTo('admin', 'manager'),
    uploadProductImages,
    resizeProductImages,
    normalizeProductData,
    createProductValidator,
    createProduct
  );

router
  .route('/:id')
  .get(getProductValidator, getProduct)
  .put(
    authService.protect,
    authService.allowedTo('admin', 'manager'),
    uploadProductImages,
    resizeProductImages,
    normalizeProductData,
    updateProductValidator,
    updateProduct
  )
  .delete(
    authService.protect,
    authService.allowedTo('admin'),
    deleteProductValidator,
    deleteProduct
  );

module.exports = router;
