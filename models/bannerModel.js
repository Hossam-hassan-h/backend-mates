const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema(
  {
    image: {
      type: String,
      required: [true, 'Banner image is required'],
    },
    imagePublicId: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const setImageURL = (doc) => {
  if (!doc.image) return;

  // If already a full URL (Cloudinary or external http/https), preserve as is
  if (doc.image.startsWith('http://') || doc.image.startsWith('https://')) {
    return;
  }

  // Clean up any historical "undefined/banners/" string
  let raw = doc.image;
  if (raw.startsWith('undefined/banners/')) {
    raw = raw.replace('undefined/banners/', '');
  }

  const imageName = raw.split('/banners/').pop();
  const baseUrl = (process.env.BASE_URL || (process.env.NODE_ENV === 'production' ? 'https://sooqkasem.com' : 'http://localhost:8000')).replace(/\/+$/, '');
  doc.image = `${baseUrl}/banners/${imageName}`;
};

// findOne, findAll and update
bannerSchema.post('init', (doc) => {
  setImageURL(doc);
});

// create
bannerSchema.post('save', (doc) => {
  setImageURL(doc);
});

module.exports = mongoose.model('Banner', bannerSchema);
