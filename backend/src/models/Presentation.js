const mongoose = require('mongoose');

const presentationSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    authorName: { type: String, default: '' },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    slides: { type: Array, default: [] },
    theme: { type: mongoose.Schema.Types.Mixed, default: {} },
    thumbnail: { type: String, default: '' },
    isPublic: { type: Boolean, default: true },
    likesCount: { type: Number, default: 0 },
    likedBy: { type: [String], default: [] },
    // Lượt xem: mỗi tài khoản khác chủ deck tính một lần (viewedBy); xem không đăng nhập cộng thẳng vào viewsCount
    viewsCount: { type: Number, default: 0 },
    viewedBy: { type: [String], default: [] },
    comments: {
      type: [
        {
          id: String,
          userId: String,
          userName: String,
          content: String,
          createdAt: Date,
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Presentation', presentationSchema);
