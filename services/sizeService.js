const factory = require('./handlersFactory');
const Size = require('../models/sizeModel');

exports.getSizes = factory.getAll(Size, 'Sizes');
exports.getSize = factory.getOne(Size);
exports.createSize = factory.createOne(Size);
exports.updateSize = factory.updateOne(Size);
exports.deleteSize = factory.deleteOne(Size);
