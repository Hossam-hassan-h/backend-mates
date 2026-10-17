const slugify = require('slugify');
const { check, body } = require('express-validator');
const validatorMiddleware = require('../../middlewares/validatorMiddleware');
const Category = require('../../models/categoryModel');

exports.createProductValidator = [
  body().custom((bodyObj) => {
    if (!bodyObj.name && !bodyObj.title) {
      throw new Error('Product name is required');
    }
    return true;
  }),
  check('category')
    .notEmpty()
    .withMessage('Product must belong to a category')
    .isMongoId()
    .withMessage('Invalid category ID format')
    .custom((categoryId) =>
      Category.findById(categoryId).then((category) => {
        if (!category) {
          return Promise.reject(new Error(`No category for this id: ${categoryId}`));
        }
      })
    ),
  check('gender')
    .optional()
    .isIn(['men', 'women', 'unisex'])
    .withMessage('gender must be men, women, or unisex'),
  check('status')
    .optional()
    .isIn(['draft', 'published', 'archived', 'active', 'hidden'])
    .withMessage('status must be draft, published, archived, active, or hidden'),
  validatorMiddleware,
];

exports.getProductValidator = [
  check('id').isMongoId().withMessage('Invalid ID format'),
  validatorMiddleware,
];

exports.updateProductValidator = [
  check('id').isMongoId().withMessage('Invalid ID format'),
  check('category')
    .optional()
    .isMongoId()
    .withMessage('Invalid category ID format')
    .custom((categoryId) =>
      Category.findById(categoryId).then((category) => {
        if (!category) {
          return Promise.reject(new Error(`No category for this id: ${categoryId}`));
        }
      })
    ),
  check('gender')
    .optional()
    .isIn(['men', 'women', 'unisex'])
    .withMessage('gender must be men, women, or unisex'),
  check('status')
    .optional()
    .isIn(['draft', 'published', 'archived', 'active', 'hidden'])
    .withMessage('status must be draft, published, archived, active, or hidden'),
  validatorMiddleware,
];

exports.deleteProductValidator = [
  check('id').isMongoId().withMessage('Invalid ID format'),
  validatorMiddleware,
];
