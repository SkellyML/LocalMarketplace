const Product = require('../models/productModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// ─────────────────────────────────────────────
//  GET /api/v1/products
//  With filtering, sorting, field limiting, pagination
//  Respects query middleware (hides premiumProducts)
// ─────────────────────────────────────────────
exports.getAllProducts = catchAsync(async (req, res, next) => {
  // 1) Filtering – exclude special query params
  const queryObj = { ...req.query };
  const excludedFields = ['page', 'sort', 'limit', 'fields'];
  excludedFields.forEach(field => delete queryObj[field]);

  // 2) Advanced filtering (gte, gt, lte, lt)
  let queryStr = JSON.stringify(queryObj);
  queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);
  let filter = JSON.parse(queryStr);

  // Convert numeric strings for price field (type safety)
  const convertNumericStrings = (obj) => {
    for (let key in obj) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        convertNumericStrings(obj[key]);
      } else if (key === 'price' && typeof obj[key] === 'string' && !isNaN(obj[key])) {
        obj[key] = Number(obj[key]);
      }
    }
  };
  convertNumericStrings(filter);

  let query = Product.find(filter); // query middleware auto-filters premiumProducts

  // 3) Sorting
  if (req.query.sort) {
    const sortBy = req.query.sort.split(',').join(' ');
    query = query.sort(sortBy);
  } else {
    query = query.sort('-createdAt');
  }

  // 4) Field limiting
  if (req.query.fields) {
    const fields = req.query.fields.split(',').join(' ');
    query = query.select(fields);
  } else {
    query = query.select('-__v');
  }

  // 5) Pagination
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 100;
  const skip = (page - 1) * limit;
  query = query.skip(skip).limit(limit);

  if (req.query.page) {
    const totalProducts = await Product.countDocuments();
    if (skip >= totalProducts) throw new Error('This page does not exist');
  }

  const products = await query;

  res.status(200).json({
    status: 'success',
    results: products.length,
    data: { products },
  });
});

// ─────────────────────────────────────────────
//  GET /api/v1/products/:id (uses MongoDB _id)
// ─────────────────────────────────────────────
exports.getProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    return next(new AppError('No product found with that ID', 404));
  }
  res.status(200).json({
    status: 'success',
    data: { product },
  });
});

// ─────────────────────────────────────────────
//  POST /api/v1/products
// ─────────────────────────────────────────────
exports.createProduct = catchAsync(async (req, res, next) => {
  // Check if a product with the same name already exists
  const existingProduct = await Product.findOne({ name: req.body.name });
  if (existingProduct) {
    return next(new AppError(`Duplicate field value: "${req.body.name}". Please use another value!`, 400));
  }

  const newProduct = await Product.create(req.body);
  res.status(201).json({
    status: 'success',
    data: { product: newProduct },
  });
});
// ─────────────────────────────────────────────
//  PATCH /api/v1/products/:id
// ─────────────────────────────────────────────
exports.updateProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!product) {
    return next(new AppError('No product found with that ID', 404));
  }
  res.status(200).json({
    status: 'success',
    data: { product },
  });
});

// ─────────────────────────────────────────────
//  DELETE /api/v1/products/:id
// ─────────────────────────────────────────────
exports.deleteProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) {
    return next(new AppError('No product found with that ID', 404));
  }
  res.status(204).json({
    status: 'success',
    data: null,
  });
});

// ─────────────────────────────────────────────
//  ALIAS: top 3 cheapest products
//  Reuses getAllProducts with modified query
// ─────────────────────────────────────────────
exports.getTopCheapProducts = catchAsync(async (req, res, next) => {
  req.query.limit = '3';
  req.query.sort = 'price';
  req.query.fields = 'name,price,seller,description';
  exports.getAllProducts(req, res, next);
});

// ─────────────────────────────────────────────
//  AGGREGATION: product categories (price < 1000)
//  Aggregate middleware automatically excludes premiumProducts
// ─────────────────────────────────────────────
exports.getProductCategory = catchAsync(async (req, res, next) => {
  const stats = await Product.aggregate([
    { $match: { price: { $lt: 1000 } } },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      },
    },
    { $sort: { avgPrice: 1 } },
  ]);
  res.status(200).json({
    status: 'success',
    data: { stats },
  });
});