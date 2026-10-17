const slugify = require('slugify');
const { check, body } = require('express-validator');
const validatorMiddleware = require('../../middlewares/validatorMiddleware');

exports.getCategoryValidator = [
  check('id').isMongoId().withMessage('Invalid category id format'),
  validatorMiddleware,
];

exports.createCategoryValidator = [
  body('name')
    .notEmpty()
    .withMessage('Category name is required')
    .custom((val, { req }) => {
      if (typeof val === 'string') {
        req.body.name = { en: val, ar: val };
        req.body.slug = slugify(val, { lower: true }) || `cat-${Date.now()}`;
      } else if (typeof val === 'object') {
        if (!val.en && !val.ar) {
          throw new Error('Category name must contain en or ar');
        }
        req.body.name = { en: val.en || val.ar, ar: val.ar || val.en };
        const slugSource = val.en || val.ar;
        req.body.slug = slugify(slugSource, { lower: true }) || `cat-${Date.now()}`;
      }
      return true;
    }),
  validatorMiddleware,
];

exports.updateCategoryValidator = [
  check('id').isMongoId().withMessage('Invalid category id format'),
  body('name')
    .optional()
    .custom((val, { req }) => {
      if (typeof val === 'string') {
        req.body.name = { en: val, ar: val };
        req.body.slug = slugify(val, { lower: true }) || `cat-${Date.now()}`;
      } else if (typeof val === 'object') {
        req.body.name = { en: val.en || val.ar, ar: val.ar || val.en };
        const slugSource = val.en || val.ar;
        if (slugSource) {
          req.body.slug = slugify(slugSource, { lower: true }) || `cat-${Date.now()}`;
        }
      }
      return true;
    }),
  validatorMiddleware,
];

exports.deleteCategoryValidator = [
  check('id').isMongoId().withMessage('Invalid category id format'),
  validatorMiddleware,
];
