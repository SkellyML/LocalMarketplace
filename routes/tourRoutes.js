const express = require('express');
const tourController = require('../controllers/tourController');
const authController = require('../controllers/authController');
const router = express.Router();

// ─────────────────────────────────────────────
//  ALIAS ROUTES
//  Must be declared BEFORE /:id
// ─────────────────────────────────────────────

// Aggregation Pipeline route (from lecture slides)
router.route('/tour-stats').get(tourController.getTourStats);

// ─────────────────────────────────────────────
//  MAIN CRUD ROUTES
// ─────────────────────────────────────────────
router
  .route('/')
  .get(tourController.getAllTours)
  .post(tourController.createTour);

router
  .route('/:id')
  .get(tourController.getTour)
  .patch(tourController.updateTour)
  .delete(tourController.deleteTour);

module.exports = router;