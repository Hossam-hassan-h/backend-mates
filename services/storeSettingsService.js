const asyncHandler = require('express-async-handler');
const StoreSettings = require('../models/storeSettingsModel');

const EDITABLE_FIELDS = [
  'storeName',
  'shortDescription',
  'announcement',
  'phone',
  'whatsapp',
  'whatsappNumber',
  'email',
  'address',
  'workingHours',
  'currency',
  'currencySymbol',
  'loyaltyRateBasisPoints',
  'minimumOrder',
  'orderNumberFormat',
  'instagram',
  'facebook',
];

const LOCALIZED_FIELDS = [
  'storeName',
  'shortDescription',
  'announcement',
  'address',
  'workingHours',
  'currencySymbol',
];

const normalizeLocalizedField = (value, existing = {}) => {
  if (value === undefined || value === null) return existing;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    const hasArabic = /[\u0600-\u06FF]/.test(trimmed);
    if (hasArabic) {
      return {
        en: trimmed,
        ar: trimmed,
      };
    }
    return {
      en: trimmed,
      ar: existing?.ar && /[\u0600-\u06FF]/.test(existing.ar) ? existing.ar : trimmed,
    };
  }
  if (typeof value === 'object') {
    return {
      en: typeof value.en === 'string' ? value.en : (existing?.en || value.ar || ''),
      ar: typeof value.ar === 'string' ? value.ar : (existing?.ar || value.en || ''),
    };
  }
  return existing;
};

// @desc    Get store settings
// @route   GET /api/v1/settings
// @access  Public
exports.getStoreSettings = asyncHandler(async (req, res, next) => {
  let settings = await StoreSettings.findOne({ key: 'main' }).select('-key -__v');

  if (!settings) {
    settings = await StoreSettings.create({});
  }

  const data = settings.toObject ? settings.toObject() : { ...settings };
  data.whatsapp = data.whatsappNumber || data.whatsapp || '';

  res.status(200).json({ status: 'success', data });
});

// @desc    Update store settings
// @route   PUT /api/v1/settings
// @access  Private/Admin
exports.updateStoreSettings = asyncHandler(async (req, res, next) => {
  const updates = EDITABLE_FIELDS.reduce((result, field) => {
    if (req.body[field] !== undefined) result[field] = req.body[field];
    return result;
  }, {});

  let settings = await StoreSettings.findOne({ key: 'main' });
  if (!settings) {
    settings = new StoreSettings({ key: 'main' });
  }

  // Handle localized fields safely to prevent Mongoose CastErrors
  LOCALIZED_FIELDS.forEach((field) => {
    if (updates[field] !== undefined) {
      settings[field] = normalizeLocalizedField(updates[field], settings[field]);
      delete updates[field];
    }
  });

  // Normalize whatsapp -> whatsappNumber
  if (updates.whatsapp !== undefined) {
    settings.whatsappNumber = updates.whatsapp;
    delete updates.whatsapp;
  }
  if (updates.whatsappNumber !== undefined) {
    settings.whatsappNumber = updates.whatsappNumber;
    delete updates.whatsappNumber;
  }

  // Assign remaining valid primitive fields
  Object.assign(settings, updates);
  await settings.save();

  const responseSettings = settings.toObject();
  delete responseSettings.key;
  delete responseSettings.__v;
  responseSettings.whatsapp = responseSettings.whatsappNumber;

  res.status(200).json({ status: 'success', data: responseSettings });
});
