const { body } = require('express-validator');
const validatorMiddleware = require('../../middlewares/validatorMiddleware');

const validateLocalizedField = (field, max) =>
  body(field)
    .optional()
    .custom((val) => {
      if (typeof val === 'string') {
        if (!val.trim()) throw new Error(`${field} cannot be empty`);
        if (val.trim().length > max) throw new Error(`${field} must be at most ${max} characters`);
        return true;
      }
      if (typeof val === 'object' && val !== null) {
        const text = val.en || val.ar;
        if (!text || !String(text).trim()) throw new Error(`${field} cannot be empty`);
        if (val.en && val.en.length > max) throw new Error(`${field} English must be at most ${max} characters`);
        if (val.ar && val.ar.length > max) throw new Error(`${field} Arabic must be at most ${max} characters`);
        return true;
      }
      throw new Error(`Invalid format for ${field}`);
    });

exports.updateStoreSettingsValidator = [
  validateLocalizedField('storeName', 100),
  validateLocalizedField('shortDescription', 250),
  validateLocalizedField('announcement', 300),
  validateLocalizedField('address', 250),
  validateLocalizedField('workingHours', 150),
  body('phone').optional({ checkFalsy: true }).trim().isLength({ max: 30 }),
  body('whatsapp').optional({ checkFalsy: true }).trim().matches(/^\+?[0-9\s-]{7,30}$/),
  body('whatsappNumber').optional({ checkFalsy: true }).trim().matches(/^\+?[0-9\s-]{7,30}$/),
  body('email').optional({ checkFalsy: true }).trim().isEmail().normalizeEmail(),
  body('instagram').optional({ checkFalsy: true }).isURL({ protocols: ['http', 'https'], require_protocol: true }),
  body('facebook').optional({ checkFalsy: true }).isURL({ protocols: ['http', 'https'], require_protocol: true }),
  body('minimumOrder').optional().isFloat({ min: 0 }).toFloat(),
  body('orderNumberFormat').optional({ checkFalsy: true }).trim().isLength({ max: 50 }),
  validatorMiddleware,
];
