const mongoose = require('mongoose');

class ApiFeatures {
  constructor(mongooseQuery, queryString) {
    this.mongooseQuery = mongooseQuery;
    this.queryString = queryString;
  }

  filter() {
    const queryStringObj = { ...this.queryString };
    const excludesFields = [
      'page',
      'sort',
      'limit',
      'fields',
      'keyword',
      'search',
      'from',
      'to',
      'hasOrders',
    ];
    excludesFields.forEach((field) => delete queryStringObj[field]);
    // Apply filtration using [gte, gt, lte, lt, ne]
    let queryStr = JSON.stringify(queryStringObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt|ne)\b/g, (match) => `$${match}`);

    this.mongooseQuery = this.mongooseQuery.find(JSON.parse(queryStr));

    // Support date range from & to on createdAt
    if (this.queryString.from || this.queryString.to) {
      const dateFilter = {};
      if (this.queryString.from) {
        const fromDate = new Date(this.queryString.from);
        if (!Number.isNaN(fromDate.getTime())) {
          dateFilter.$gte = fromDate;
        }
      }
      if (this.queryString.to) {
        const toDate = new Date(this.queryString.to);
        if (!Number.isNaN(toDate.getTime())) {
          toDate.setHours(23, 59, 59, 999);
          dateFilter.$lte = toDate;
        }
      }
      if (Object.keys(dateFilter).length > 0) {
        this.mongooseQuery = this.mongooseQuery.find({ createdAt: dateFilter });
      }
    }

    return this;
  }

  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ');
      this.mongooseQuery = this.mongooseQuery.sort(sortBy);
    } else {
      this.mongooseQuery = this.mongooseQuery.sort('-createdAt');
    }
    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.mongooseQuery = this.mongooseQuery.select(fields);
    } else {
      this.mongooseQuery = this.mongooseQuery.select('-__v');
    }
    return this;
  }

  search(modelName) {
    const keyword = this.queryString.keyword || this.queryString.search;
    if (keyword) {
      let query = {};
      if (modelName === 'Products' || modelName === 'Product') {
        query.$or = [
          { title: { $regex: keyword, $options: 'i' } },
          { name: { $regex: keyword, $options: 'i' } },
          { description: { $regex: keyword, $options: 'i' } },
        ];
      } else if (modelName === 'Users' || modelName === 'User') {
        query.$or = [
          { name: { $regex: keyword, $options: 'i' } },
          { email: { $regex: keyword, $options: 'i' } },
          { phone: { $regex: keyword, $options: 'i' } },
        ];
      } else if (modelName === 'Orders' || modelName === 'Order') {
        const searchRegex = new RegExp(keyword, 'i');
        const conditions = [
          { customerName: searchRegex },
          { phone: searchRegex },
        ];
        if (mongoose.isValidObjectId(keyword)) {
          conditions.push({ _id: keyword });
        }
        query.$or = conditions;
      } else {
        query = { name: { $regex: keyword, $options: 'i' } };
      }

      this.mongooseQuery = this.mongooseQuery.find(query);
    }
    return this;
  }

  searchOrders() {
    return this.search('Order');
  }

  paginate(countDocuments) {
    // If neither page nor limit is explicitly specified in the query,
    // do not artificially cap the dataset at 50 records.
    if (!this.queryString.page && !this.queryString.limit) {
      this.paginationResult = {
        currentPage: 1,
        limit: countDocuments || 0,
        numberOfPages: 1,
        total: countDocuments,
        totalDocuments: countDocuments,
        totalCount: countDocuments,
      };
      return this;
    }

    const page = Math.max(1, this.queryString.page * 1 || 1);
    const limit = Math.max(1, this.queryString.limit * 1 || 50);
    const skip = (page - 1) * limit;
    const endIndex = page * limit;

    // Pagination result
    const pagination = {};
    pagination.currentPage = page;
    pagination.limit = limit;
    pagination.numberOfPages = Math.ceil(countDocuments / limit) || 1;
    pagination.total = countDocuments;
    pagination.totalDocuments = countDocuments;
    pagination.totalCount = countDocuments;

    // next page
    if (endIndex < countDocuments) {
      pagination.next = page + 1;
    }
    if (skip > 0) {
      pagination.prev = page - 1;
    }
    this.mongooseQuery = this.mongooseQuery.skip(skip).limit(limit);

    this.paginationResult = pagination;
    return this;
  }
}

module.exports = ApiFeatures;
