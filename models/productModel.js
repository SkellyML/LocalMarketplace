const mongoose = require('mongoose');
const slugify = require('slugify');

const productSchema = new mongoose.Schema(
  {
    // ── ORIGINAL FIELDS (unchanged) ──────────────────────────
    name: {
      type: String,
      required: [true, 'A product must have a name'],
      trim: true,
      unique: true,
    },

    price: {
      type: Number,
      required: [true, 'A product must have a price'],
    },

    category: {
      type: String,
      required: [true, 'A product must have a category'],
    },

    seller: {
      type: String,
      required: [true, 'A product must have a seller'],
    },

    // Step 6 – Built-in Validator: description must not exceed 50 characters
    description: {
      type: String,
      trim: true,
      maxlength: [50, 'Description must have 50 or fewer characters'],
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },

    // ── NEW FIELDS FOR ACTIVITY ───────────────────────────────

    // Step 7 – Custom Validator: priceDiscount must be below price
    priceDiscount: {
      type: Number,
      validate: {
        validator: function (val) {
          // 'this' only works on .create() / POST, NOT on PATCH
          return val < this.price;
        },
        message: 'Discount price ({VALUE}) should be below the regular price',
      },
    },

    // Step 2 – postedDate used to compute the virtual daysPosted
    postedDate: {
      type: Date,
      default: Date.now,
    },

    // Step 3 – auto-filled by pre('save') document middleware
    productSlug: {
      type: String,
    },

    // Step 4 & 5 – hidden from all finds and aggregations when true
    premiumProducts: {
      type: Boolean,
      default: false,
    },
  },
  {
    // Step 2 – makes virtual 'daysPosted' show up in API JSON responses
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─────────────────────────────────────────────────────────────
//  STEP 2 – VIRTUAL PROPERTY: daysPosted
//  Not stored in DB. Calculated live from postedDate each time
//  a document is returned.
// ─────────────────────────────────────────────────────────────
productSchema.virtual('daysPosted').get(function () {
  if (!this.postedDate) return null;
  const diffMs = Date.now() - new Date(this.postedDate);
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
});

// ─────────────────────────────────────────────────────────────
//  STEP 3 – DOCUMENT MIDDLEWARE: pre('save')
//  Uses async (no next) — compatible with Mongoose 7+
//  Runs before .create() and .save() only. NOT on PATCH.
//  productSlug example: "Red Shoes" → "RED-SHOES"
// ─────────────────────────────────────────────────────────────
productSchema.pre('save', async function () {
  this.productSlug = slugify(this.name, { upper: true });
});

// post save – logs saved document in terminal (optional)
productSchema.post('save', function (doc) {
  console.log('Product saved:', doc);
});

// ─────────────────────────────────────────────────────────────
//  STEP 4 – QUERY MIDDLEWARE
//  /^find/ catches: find, findOne, findById, findOneAndUpdate,
//  findOneAndDelete, etc.
//  Automatically hides premiumProducts = true from all results.
// ─────────────────────────────────────────────────────────────
productSchema.pre(/^find/, async function () {
  this.find({ premiumProducts: { $ne: true } });
});

// ─────────────────────────────────────────────────────────────
//  STEP 5 – AGGREGATE MIDDLEWARE
//  Injects $match at the START of the pipeline using unshift()
//  so premiumProducts are excluded before $group runs.
// ─────────────────────────────────────────────────────────────
productSchema.pre('aggregate', async function () {
  this.pipeline().unshift({ $match: { premiumProducts: { $ne: true } } });
});

const Product = mongoose.model('Product', productSchema);
module.exports = Product;