const { check } = require('express-validator');
const validatorMiddleware = require('../../middlewares/validatorMiddleware');
const Review = require('../../models/reviewModel');
const Order = require('../../models/orderModel');

exports.createReviewValidator = [
  check('title').optional(),
  check('ratings')
    .notEmpty()
    .withMessage('ratings value required')
    .isFloat({ min: 1, max: 5 })
    .withMessage('Ratings value must be between 1 to 5'),
  check('user').isMongoId().withMessage('Invalid Review id format'),
  check('product')
    .isMongoId()
    .withMessage('Invalid Review id format')
    .custom(async (val, { req }) => {
      const targetProductId = req.body.product || val;

      // 1. Check if logged user already created a review for this product
      const existingReview = await Review.findOne({
        user: req.user._id,
        product: targetProductId,
      });
      if (existingReview) {
        throw new Error('لقد أضفت تقييماً لهذا المنتج من قبل');
      }

      // 2. Check if logged user has purchased this product in a completed order
      const purchasedOrder = await Order.findOne({
        user: req.user._id,
        orderStatus: 'completed',
        'cartItems.product': targetProductId,
      });

      if (!purchasedOrder) {
        throw new Error('يمكنك إضافة تقييم فقط بعد شراء هذا المنتج');
      }

      return true;
    }),
  validatorMiddleware,
];

exports.getReviewValidator = [
  check('id').isMongoId().withMessage('Invalid Review id format'),
  validatorMiddleware,
];

exports.updateReviewValidator = [
  check('id')
    .isMongoId()
    .withMessage('Invalid Review id format')
    .custom(async (val, { req }) => {
      const review = await Review.findById(val);
      if (!review) {
        throw new Error(`There is no review with id ${val}`);
      }

      const reviewUserId = (review.user && review.user._id) || review.user;
      if (reviewUserId.toString() !== req.user._id.toString()) {
        throw new Error('Your are not allowed to perform this action');
      }
      return true;
    }),
  validatorMiddleware,
];

exports.deleteReviewValidator = [
  check('id')
    .isMongoId()
    .withMessage('Invalid Review id format')
    .custom(async (val, { req }) => {
      if (req.user.role === 'user') {
        const review = await Review.findById(val);
        if (!review) {
          throw new Error(`There is no review with id ${val}`);
        }
        const reviewUserId = (review.user && review.user._id) || review.user;
        if (reviewUserId.toString() !== req.user._id.toString()) {
          throw new Error('Your are not allowed to perform this action');
        }
      }
      return true;
    }),
  validatorMiddleware,
];
