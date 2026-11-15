const Report = require('../models/Report');
const Template = require('../models/Template');
const User = require('../models/User');
const Comment = require('../models/Comment');
const mongoose = require('mongoose');
const { notifyAdmins } = require('../helpers/notificationHelper');

// @desc    Submit an incident or content report / direct appeal
// @route   POST /api/reports
// @access  Private
exports.createReport = async (req, res, next) => {
  try {
    if (req.user && req.user.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản Quản trị viên (Admin) không thực hiện gửi báo cáo hoặc khiếu nại. Vui lòng sử dụng /admin/reports để quản lý.',
      });
    }

    const {
      ticketType = 'REPORT',
      targetType,
      targetId,
      targetTitle: incomingTargetTitle,
      reason,
      description,
      priority = 'medium',
      appealCategory = '',
      attachments = [],
      targetUrl = '',
    } = req.body;

    const normalizedTicketType = ticketType && String(ticketType).toUpperCase() === 'APPEAL' ? 'APPEAL' : 'REPORT';

    if (!reason || !description) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp lý do (reason) và mô tả chi tiết (description)',
      });
    }

    let finalTargetType = targetType ? String(targetType).toLowerCase() : (normalizedTicketType === 'APPEAL' ? 'system' : '');
    let finalTargetId = targetId || '';
    let targetTitle = incomingTargetTitle || '';

    if (normalizedTicketType === 'REPORT') {
      if (!finalTargetType || !finalTargetId) {
        return res.status(400).json({
          success: false,
          message: 'Báo cáo vi phạm yêu cầu phải có targetType và targetId',
        });
      }

      const validTargetTypes = ['template', 'review', 'creator', 'user', 'comment', 'system', 'presentation'];
      if (!validTargetTypes.includes(finalTargetType)) {
        return res.status(400).json({
          success: false,
          message: `targetType không hợp lệ. Cho phép: ${validTargetTypes.join(', ')}`,
        });
      }

      // Resolve creator names server-side so report titles and admin alerts are trustworthy.
      if (finalTargetType === 'creator') {
        if (!mongoose.Types.ObjectId.isValid(finalTargetId)) {
          return res.status(404).json({ success: false, message: 'Không tìm thấy Creator được báo cáo' });
        }
        const creator = await User.findById(finalTargetId).select('name');
        if (!creator) {
          return res.status(404).json({ success: false, message: 'Không tìm thấy Creator được báo cáo' });
        }
        targetTitle = creator.name;
      } else if (!targetTitle) {
        if (finalTargetType === 'template') {
          const tmpl = await Template.findById(finalTargetId).select('title');
          if (tmpl) targetTitle = tmpl.title;
        } else if (finalTargetType === 'user') {
          const u = await User.findById(finalTargetId).select('name email');
          if (u) targetTitle = `${u.name} (${u.email})`;
        } else if (finalTargetType === 'comment') {
          const c = await Comment.findById(finalTargetId).select('content');
          if (c) targetTitle = c.content.slice(0, 50);
        } else if (finalTargetType === 'review') {
          targetTitle = 'Đánh giá mẫu thiết kế';
        } else {
          targetTitle = 'Hệ thống / Nền tảng';
        }
      }
    } else {
      // Direct Appeal
      if (!targetTitle) {
        targetTitle = appealCategory ? `Kháng nghị: ${appealCategory}` : 'Khiếu nại / Kháng nghị trực tiếp';
      }
    }

    let finalTargetUrl = targetUrl || '';
    if (!finalTargetUrl) {
      if (finalTargetType === 'template') {
        finalTargetUrl = `/templates/${finalTargetId}`;
      } else if (finalTargetType === 'creator' || finalTargetType === 'user') {
        finalTargetUrl = `/creators/?id=${encodeURIComponent(finalTargetId)}`;
      } else if (finalTargetType === 'review' && finalTargetId && finalTargetId.includes('-review-')) {
        finalTargetUrl = `/templates/${finalTargetId.split('-review-')[0]}`;
      }
    }

    const report = await Report.create({
      ticketType: normalizedTicketType,
      reporter: req.user._id,
      reporterName: req.user.name || 'Người dùng',
      senderEmail: req.user.email || '',
      targetType: finalTargetType,
      targetId: finalTargetId,
      targetTitle,
      targetUrl: finalTargetUrl,
      appealCategory: appealCategory || '',
      reason,
      description,
      priority,
      attachments: Array.isArray(attachments) ? attachments : [],
      status: 'pending',
    });

    // Notify all Administrators
    const notifMessage = normalizedTicketType === 'APPEAL'
      ? `Người dùng ${req.user.name || 'Người dùng'} đã gửi khiếu nại mới: ${targetTitle || reason}`
      : finalTargetType === 'creator'
        ? `User ${req.user.name || 'User'} reported Creator ${targetTitle || 'Creator'}`
        : `Người dùng ${req.user.name || 'Người dùng'} đã báo cáo ${
            finalTargetType === 'template'
              ? `mẫu "${targetTitle}"`
              : finalTargetType === 'review'
              ? 'một đánh giá vi phạm'
              : finalTargetType
          }: ${reason}`;

    await notifyAdmins({
      actorId: req.user._id,
      type: normalizedTicketType === 'APPEAL' ? 'appeal_submitted' : 'report_submitted',
      message: notifMessage,
      link: '/admin/reports',
      metadata: {
        reportId: report._id,
        ticketType: normalizedTicketType,
        targetType: finalTargetType,
        targetId: finalTargetId,
        reason,
      },
    });

    res.status(201).json({
      success: true,
      message:
        normalizedTicketType === 'APPEAL'
          ? 'Khiếu nại của bạn đã được gửi đến ban quản trị thành công.'
          : 'Báo cáo vi phạm của bạn đã được ghi nhận và gửi đến ban quản trị.',
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's own submitted reports and appeals
// @route   GET /api/reports/my-reports
// @access  Private
exports.getMyReports = async (req, res, next) => {
  try {
    const { ticketType } = req.query;
    const filter = { reporter: req.user._id };

    if (ticketType && ['REPORT', 'APPEAL'].includes(ticketType.toUpperCase())) {
      filter.ticketType = ticketType.toUpperCase();
    }

    const reports = await Report.find(filter).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: reports.length,
      data: reports,
    });
  } catch (error) {
    next(error);
  }
};
