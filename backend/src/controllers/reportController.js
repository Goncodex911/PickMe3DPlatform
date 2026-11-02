const Report = require('../models/Report');
const Template = require('../models/Template');
const User = require('../models/User');
const Comment = require('../models/Comment');

// @desc    Submit an incident or content report
// @route   POST /api/reports
// @access  Private
exports.createReport = async (req, res, next) => {
  try {
    const { targetType, targetId, reason, description, priority = 'medium' } = req.body;

    if (!targetType || !targetId || !reason || !description) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ thông tin: targetType, targetId, reason, description',
      });
    }

    const validTargetTypes = ['template', 'user', 'comment', 'system'];
    if (!validTargetTypes.includes(targetType)) {
      return res.status(400).json({
        success: false,
        message: `targetType không hợp lệ. Cho phép: ${validTargetTypes.join(', ')}`,
      });
    }

    // Try resolving target title / label
    let targetTitle = '';
    if (targetType === 'template') {
      const tmpl = await Template.findById(targetId).select('title');
      if (tmpl) targetTitle = tmpl.title;
    } else if (targetType === 'user') {
      const u = await User.findById(targetId).select('name email');
      if (u) targetTitle = `${u.name} (${u.email})`;
    } else if (targetType === 'comment') {
      const c = await Comment.findById(targetId).select('content');
      if (c) targetTitle = c.content.slice(0, 50);
    } else {
      targetTitle = 'Hệ thống / Nền tảng';
    }

    const report = await Report.create({
      reporter: req.user._id,
      reporterName: req.user.name || 'Người dùng',
      targetType,
      targetId,
      targetTitle,
      reason,
      description,
      priority,
      status: 'pending',
    });

    res.status(201).json({
      success: true,
      message: 'Báo cáo của bạn đã được ghi nhận và gửi đến ban quản trị.',
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's own submitted reports
// @route   GET /api/reports/my-reports
// @access  Private
exports.getMyReports = async (req, res, next) => {
  try {
    const reports = await Report.find({ reporter: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: reports.length,
      data: reports,
    });
  } catch (error) {
    next(error);
  }
};
