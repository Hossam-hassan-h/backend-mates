const express = require('express');
const authService = require('../services/authService');
const { getStoreSettings, updateStoreSettings } = require('../services/storeSettingsService');
const { updateStoreSettingsValidator } = require('../utils/validators/storeSettingsValidator');

const router = express.Router();

router.get('/', getStoreSettings);
router.put(
  '/',
  authService.protect,
  authService.allowedTo('admin'),
  updateStoreSettingsValidator,
  updateStoreSettings
);

module.exports = router;
