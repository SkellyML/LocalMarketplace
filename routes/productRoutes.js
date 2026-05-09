const express = require('express');
const productController = require('../controllers/productController');
const authController = require('../controllers/authController');

const router = express.Router();

// ─────────────────────────────────────────────
//  ALIAS ROUTES (must be before /:id)
// ─────────────────────────────────────────────
router.route('/product-category').get(productController.getProductCategory);
router.route('/top-3-cheap').get(productController.getTopCheapProducts);

// ─────────────────────────────────────────────
//  MAIN CRUD ROUTES
// ─────────────────────────────────────────────
router
  .route('/')
  .get(authController.protect, productController.getAllProducts)   // protected
  .post(productController.createProduct);

router
  .route('/:id')
  .get(productController.getProduct)
  .patch(productController.updateProduct)
  .delete(
    authController.protect,
    authController.restrictTo('admin'),
    productController.deleteProduct
  );

module.exports = router;