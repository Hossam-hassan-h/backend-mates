const factory = require('./handlersFactory');
const Color = require('../models/colorModel');

exports.getColors = factory.getAll(Color, 'Colors');
exports.getColor = factory.getOne(Color);
exports.createColor = factory.createOne(Color);
exports.updateColor = factory.updateOne(Color);
exports.deleteColor = factory.deleteOne(Color);
