const express = require('express');

const {
  createReviewValidator,
  updateReviewValidator,
  getReviewValidator,
  deleteReviewValidator,
} = require('../utils/validators/reviewValidator');

const {
  getReview,
  getReviews,
  createReview,
  updateReview,
  deleteReview,
  createFilterObj,
  setProductIdAndUserIdToBody,
} = require('../services/reviewService');

const authService = require('../services/authService');

const router = express.Router({ mergeParams: true });

// Protect global GET /api/v1/reviews for Admin/Manager while keeping nested GET /products/:productId/reviews public
const protectAllReviewsForAdmin = (req, res, next) => {
  if (!req.params.productId) {
    return authService.protect(req, res, (err) => {
      if (err) return next(err);
      return authService.allowedTo('admin', 'manager')(req, res, next);
    });
  }
  next();
};

router
  .route('/')
  .get(protectAllReviewsForAdmin, createFilterObj, getReviews)
  .post(
    authService.protect,
    authService.allowedTo('user'),
    setProductIdAndUserIdToBody,
    createReviewValidator,
    createReview
  );
router
  .route('/:id')
  .get(getReviewValidator, getReview)
  .put(
    authService.protect,
    authService.allowedTo('user'),
    updateReviewValidator,
    updateReview
  )
  .delete(
    authService.protect,
    authService.allowedTo('user', 'manager', 'admin'),
    deleteReviewValidator,
    deleteReview
  );

module.exports = router;
