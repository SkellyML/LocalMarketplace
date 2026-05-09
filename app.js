const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

const productRouter = require('./routes/productRoutes');
const tourRoutes = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');

const app = express();

// 1) Security HTTP headers
app.use(helmet());

// 2) Rate limiting (limit to 100 requests per hour for /api)
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour!',
});
app.use('/api', limiter);

// 3) Body parser with size limit (prevents large payloads)
app.use(express.json({ limit: '10kb' }));

// 4) Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// 5) Data sanitization against XSS
app.use(xss());

// 6) Prevent parameter pollution (allow certain fields to have duplicate query params)
app.use(
  hpp({
    whitelist: ['price', 'category', 'createdAt'],
  })
);

// 7) Logging (development only)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// 8) Serve static files (optional, for your public folder)
app.use(express.static(`${__dirname}/public`));

// 9) Routes
app.use('/api/v1/products', productRouter);
app.use('/api/v1/tours', tourRoutes);
app.use('/api/v1/users', userRouter);

// 10) Handle undefined routes (404)
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// 11) Global error handler (must be after all routes and middleware)
app.use(globalErrorHandler);

module.exports = app;