const mongoose = require('mongoose');
const User = require('../models/User');
const Template = require('../models/Template');
const Report = require('../models/Report');
const AuditLog = require('../models/AuditLog');
const Comment = require('../models/Comment');
const Collection = require('../models/Collection');
const { logAdminAction } = require('../helpers/auditLogger');

// ==========================================
// A. DASHBOARD & SYSTEM OVERVIEW
// ==========================================

// @desc    Get dashboard metrics & platform summary
// @route   GET /api/admin/stats
// @access  Private/Admin
exports.getDashboardStats = async (req, res, next) => {
  try {
    const [
      totalUsers,
      activeUsers,
      bannedUsers,
      adminUsers,
      totalTemplates,
      systemTemplates,
      userTemplates,
      totalComments,
      totalCollections,
      totalReports,
      pendingReports,
      resolvedReports,
      recentAuditLogs,
      recentUsers,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ status: { $ne: 'banned' } }),
      User.countDocuments({ status: 'banned' }),
      User.countDocuments({ role: 'admin' }),
      Template.countDocuments(),
      Template.countDocuments({ isSystem: true }),
      Template.countDocuments({ isSystem: { $ne: true } }),
      Comment.countDocuments(),
      Collection.countDocuments(),
      Report.countDocuments(),
      Report.countDocuments({ status: 'pending' }),
      Report.countDocuments({ status: 'resolved' }),
      AuditLog.find().sort({ createdAt: -1 }).limit(8),
      User.find().sort({ createdAt: -1 }).limit(5).select('name email role status picture createdAt'),
    ]);

    // Template category distribution
    const categoryStats = await Template.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 6 },
    ]);

    // Reports priority distribution
    const reportPriorityStats = await Report.aggregate([
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          banned: bannedUsers,
          admins: adminUsers,
        },
        templates: {
          total: totalTemplates,
          system: systemTemplates,
          user: userTemplates,
        },
        community: {
          comments: totalComments,
          collections: totalCollections,
        },
        reports: {
          total: totalReports,
          pending: pendingReports,
          resolved: resolvedReports,
          priorityBreakdown: reportPriorityStats,
        },
        categories: categoryStats,
        recentAuditLogs,
        recentUsers,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// B. USER ACCOUNT MANAGEMENT
// ==========================================

// @desc    Get paginated users with filters
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getAdminUsers = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const { search, role, status, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const query = {};

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escaped, 'i');
      query.$or = [{ name: searchRegex }, { email: searchRegex }, { username: searchRegex }];
    }

    if (role && role !== 'all') {
      query.role = role;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [total, users] = await Promise.all([
      User.countDocuments(query),
      User.find(query).sort(sort).skip(skip).limit(limit).lean(),
    ]);

    // Fetch template count for each user
    const userIds = users.map((u) => u._id);
    const templateCounts = await Template.aggregate([
      { $match: { author: { $in: userIds } } },
      { $group: { _id: '$author', count: { $sum: 1 } } },
    ]);

    const countMap = new Map(templateCounts.map((tc) => [tc._id.toString(), tc.count]));

    const usersWithStats = users.map((u) => ({
      ...u,
      templatesCount: countMap.get(u._id.toString()) || 0,
    }));

    res.status(200).json({
      success: true,
      data: usersWithStats,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit) || 1,
        limit,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new user account via Admin
// @route   POST /api/admin/users
// @access  Private/Admin
exports.createAdminUser = async (req, res, next) => {
  try {
    const { name, email, role = 'user', jobRole = '', bio = '', username } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Tên và email là bắt buộc' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email này đã được sử dụng' });
    }

    if (username) {
      const existingUsername = await User.findOne({ username: username.toLowerCase().trim() });
      if (existingUsername) {
        return res.status(400).json({ success: false, message: 'Tên đăng nhập (username) đã được sử dụng' });
      }
    }

    const newUser = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      role: role === 'admin' ? 'admin' : 'user',
      jobRole: jobRole.trim(),
      bio: bio.trim(),
      username: username ? username.toLowerCase().trim() : undefined,
      status: 'active',
    });

    await logAdminAction(req, {
      action: 'USER_CREATE',
      targetType: 'user',
      targetId: newUser._id,
      targetLabel: `${newUser.name} (${newUser.email})`,
      details: { role: newUser.role, email: newUser.email },
    });

    res.status(201).json({
      success: true,
      message: 'Tài khoản người dùng đã được tạo thành công',
      data: newUser,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user status (Ban / Unban)
// @route   PUT /api/admin/users/:id/status
// @access  Private/Admin
exports.updateUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, reason = '' } = req.body;

    if (!['active', 'banned'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ. Phải là active hoặc banned' });
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }

    // Safety rule: Admin cannot ban themselves
    if (req.user._id.toString() === targetUser._id.toString()) {
      return res.status(400).json({ success: false, message: 'Không thể tự khóa tài khoản của chính mình' });
    }

    // Safety rule: Cannot ban the last active admin
    if (targetUser.role === 'admin' && status === 'banned') {
      const activeAdminCount = await User.countDocuments({ role: 'admin', status: { $ne: 'banned' } });
      if (activeAdminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Không thể khóa Quản trị viên cuối cùng của hệ thống',
        });
      }
    }

    targetUser.status = status;
    if (status === 'banned') {
      targetUser.bannedAt = new Date();
      targetUser.bannedReason = reason.trim() || 'Vi phạm điều khoản cộng đồng';
    } else {
      targetUser.bannedAt = null;
      targetUser.bannedReason = '';
    }

    await targetUser.save();

    await logAdminAction(req, {
      action: status === 'banned' ? 'USER_BAN' : 'USER_UNBAN',
      targetType: 'user',
      targetId: targetUser._id,
      targetLabel: `${targetUser.name} (${targetUser.email})`,
      details: { status, reason: targetUser.bannedReason },
    });

    res.status(200).json({
      success: true,
      message: status === 'banned' ? 'Đã khóa tài khoản thành công' : 'Đã mở khóa tài khoản thành công',
      data: targetUser,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user role (promote to admin / demote to user)
// @route   PUT /api/admin/users/:id/role
// @access  Private/Admin
exports.updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Vai trò không hợp lệ. Phải là user hoặc admin' });
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }

    // Safety rule: Prevent demoting the last active admin
    if (targetUser.role === 'admin' && role !== 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Không thể hạ quyền Quản trị viên cuối cùng của hệ thống',
        });
      }
    }

    const previousRole = targetUser.role;
    targetUser.role = role;
    await targetUser.save();

    await logAdminAction(req, {
      action: 'USER_ROLE_CHANGE',
      targetType: 'user',
      targetId: targetUser._id,
      targetLabel: `${targetUser.name} (${targetUser.email})`,
      details: { previousRole, newRole: role },
    });

    res.status(200).json({
      success: true,
      message: `Đã thay đổi quyền hạn người dùng thành ${role}`,
      data: targetUser,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Import user records safely from CSV/JSON
// @route   POST /api/admin/users/import
// @access  Private/Admin
exports.importUsers = async (req, res, next) => {
  try {
    const { users } = req.body;

    if (!Array.isArray(users) || users.length === 0) {
      return res.status(400).json({ success: false, message: 'Danh sách người dùng import không hợp lệ' });
    }

    if (users.length > 500) {
      return res.status(400).json({ success: false, message: 'Chỉ có thể import tối đa 500 người dùng mỗi lần' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const imported = [];
    const errors = [];

    // Check existing emails
    const incomingEmails = users
      .map((u) => u.email && u.email.toString().toLowerCase().trim())
      .filter(Boolean);

    const existingUsers = await User.find({ email: { $in: incomingEmails } }).select('email');
    const existingEmailSet = new Set(existingUsers.map((u) => u.email.toLowerCase()));

    for (let i = 0; i < users.length; i++) {
      const raw = users[i];
      const rowNum = i + 1;

      if (!raw || typeof raw !== 'object') {
        errors.push({ row: rowNum, error: 'Dữ liệu hàng không đúng định dạng' });
        continue;
      }

      const name = (raw.name || '').toString().trim();
      const email = (raw.email || '').toString().toLowerCase().trim();
      const jobRole = (raw.jobRole || '').toString().trim();
      const bio = (raw.bio || '').toString().trim();

      if (!name) {
        errors.push({ row: rowNum, email, error: 'Thiếu tên người dùng' });
        continue;
      }

      if (!email || !emailRegex.test(email)) {
        errors.push({ row: rowNum, email, error: 'Email không hợp lệ' });
        continue;
      }

      if (existingEmailSet.has(email)) {
        errors.push({ row: rowNum, email, error: 'Email đã tồn tại trên hệ thống' });
        continue;
      }

      // Security rule: NEVER allow imported data to grant arbitrary Admin role!
      // All imported users are created as 'user' role.
      imported.push({
        name,
        email,
        role: 'user',
        jobRole,
        bio,
        status: 'active',
      });

      // Avoid duplicates within the same batch
      existingEmailSet.add(email);
    }

    let createdCount = 0;
    if (imported.length > 0) {
      const createdUsers = await User.insertMany(imported);
      createdCount = createdUsers.length;
    }

    await logAdminAction(req, {
      action: 'USER_IMPORT',
      targetType: 'system',
      targetLabel: `Batch Import (${createdCount} users)`,
      details: {
        totalRows: users.length,
        importedCount: createdCount,
        errorsCount: errors.length,
      },
    });

    res.status(200).json({
      success: true,
      message: `Đã import thành công ${createdCount}/${users.length} tài khoản`,
      summary: {
        total: users.length,
        imported: createdCount,
        failed: errors.length,
        errors,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// C. SYSTEM TEMPLATES & 3D ASSETS MANAGEMENT
// ==========================================

// @desc    Get templates with admin filters
// @route   GET /api/admin/templates
// @access  Private/Admin
exports.getAdminTemplates = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 12));
    const skip = (page - 1) * limit;

    const { search, category, isSystem, isPublic, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const query = {};

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escaped, 'i');
      query.$or = [{ title: searchRegex }, { description: searchRegex }, { tags: searchRegex }, { authorName: searchRegex }];
    }

    if (category && category !== 'all') {
      query.category = category;
    }

    if (isSystem !== undefined && isSystem !== 'all') {
      query.isSystem = isSystem === 'true';
    }

    if (isPublic !== undefined && isPublic !== 'all') {
      query.isPublic = isPublic === 'true';
    }

    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [total, templates] = await Promise.all([
      Template.countDocuments(query),
      Template.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select('title description category tags thumbnailUrl isPublic isFeatured isSystem likesCount viewsCount forksCount avgRating author authorName authorAvatar createdAt updatedAt')
        .lean(),
    ]);

    res.status(200).json({
      success: true,
      data: templates,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit) || 1,
        limit,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create official system template / 3D asset
// @route   POST /api/admin/templates
// @access  Private/Admin
exports.createSystemTemplate = async (req, res, next) => {
  try {
    const {
      title,
      description = '',
      category = 'Official 3D Asset',
      tags = [],
      thumbnailUrl = '',
      docData,
      isFeatured = false,
      isPublic = true,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Tiêu đề mẫu là bắt buộc' });
    }

    if (!docData || typeof docData !== 'object') {
      return res.status(400).json({ success: false, message: 'Dữ liệu thiết kế (docData) không hợp lệ' });
    }

    const template = await Template.create({
      title: title.trim(),
      description: description.trim(),
      category: category.trim(),
      tags: Array.isArray(tags) ? tags.map((t) => String(t).trim()).filter(Boolean) : [],
      thumbnailUrl: thumbnailUrl.trim(),
      docData,
      isPublic,
      isFeatured,
      isSystem: true,
      author: req.user._id,
      authorName: 'PickMe3D Official',
      authorAvatar: req.user.picture || '',
    });

    await logAdminAction(req, {
      action: 'TEMPLATE_CREATE_SYSTEM',
      targetType: 'template',
      targetId: template._id,
      targetLabel: template.title,
      details: { title: template.title, category: template.category, isSystem: true },
    });

    res.status(201).json({
      success: true,
      message: 'Mẫu thiết kế hệ thống đã được tạo thành công',
      data: template,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update template metadata (admin)
// @route   PUT /api/admin/templates/:id
// @access  Private/Admin
exports.updateAdminTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const template = await Template.findById(id);

    if (!template) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy mẫu thiết kế' });
    }

    const { title, description, category, tags, thumbnailUrl, isFeatured, isSystem, isPublic } = req.body;

    if (title !== undefined) template.title = title.trim();
    if (description !== undefined) template.description = description.trim();
    if (category !== undefined) template.category = category.trim();
    if (tags !== undefined && Array.isArray(tags)) {
      template.tags = tags.map((t) => String(t).trim()).filter(Boolean);
    }
    if (thumbnailUrl !== undefined) template.thumbnailUrl = thumbnailUrl.trim();
    if (isFeatured !== undefined) template.isFeatured = Boolean(isFeatured);
    if (isSystem !== undefined) template.isSystem = Boolean(isSystem);
    if (isPublic !== undefined) template.isPublic = Boolean(isPublic);

    await template.save();

    await logAdminAction(req, {
      action: 'TEMPLATE_UPDATE',
      targetType: 'template',
      targetId: template._id,
      targetLabel: template.title,
      details: { title: template.title, isSystem: template.isSystem, isFeatured: template.isFeatured },
    });

    res.status(200).json({
      success: true,
      message: 'Đã cập nhật mẫu thiết kế thành công',
      data: template,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete template with safety checks
// @route   DELETE /api/admin/templates/:id
// @access  Private/Admin
exports.deleteAdminTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const template = await Template.findById(id);

    if (!template) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy mẫu thiết kế' });
    }

    const templateTitle = template.title;

    // Delete associated comments
    await Comment.deleteMany({ template: template._id });

    // Remove from collections
    await Collection.updateMany({ templates: template._id }, { $pull: { templates: template._id } });

    await Template.deleteOne({ _id: template._id });

    await logAdminAction(req, {
      action: 'TEMPLATE_DELETE',
      targetType: 'template',
      targetId: id,
      targetLabel: templateTitle,
      details: { title: templateTitle, author: template.author },
    });

    res.status(200).json({
      success: true,
      message: 'Mẫu thiết kế và các dữ liệu liên quan đã được xóa an toàn',
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// D. INCIDENT AND REPORT MANAGEMENT
// ==========================================

// @desc    Get incident reports with filters
// @route   GET /api/admin/reports
// @access  Private/Admin
exports.getAdminReports = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const { status, priority, targetType, search } = req.query;

    const query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (priority && priority !== 'all') {
      query.priority = priority;
    }

    if (targetType && targetType !== 'all') {
      query.targetType = targetType;
    }

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      query.$or = [{ targetTitle: regex }, { description: regex }, { reporterName: regex }];
    }

    const [total, reports] = await Promise.all([
      Report.countDocuments(query),
      Report.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('reporter', 'name email picture')
        .populate('resolvedBy', 'name email')
        .lean(),
    ]);

    res.status(200).json({
      success: true,
      data: reports,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit) || 1,
        limit,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update report status and resolution notes
// @route   PUT /api/admin/reports/:id
// @access  Private/Admin
exports.updateReportStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, resolutionNotes = '', priority } = req.body;

    const report = await Report.findById(id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sự cố báo cáo' });
    }

    const validStatuses = ['pending', 'investigating', 'resolved', 'dismissed'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ' });
    }

    const previousStatus = report.status;
    if (status) report.status = status;
    if (priority) report.priority = priority;
    if (resolutionNotes !== undefined) report.resolutionNotes = resolutionNotes.trim();

    if (['resolved', 'dismissed'].includes(status)) {
      report.resolvedBy = req.user._id;
      report.resolvedByName = req.user.name || 'Admin';
      report.resolvedAt = new Date();
    }

    await report.save();

    await logAdminAction(req, {
      action: 'REPORT_STATUS_CHANGE',
      targetType: 'report',
      targetId: report._id,
      targetLabel: `${report.targetType}: ${report.targetTitle || report.reason}`,
      details: { previousStatus, newStatus: report.status, resolutionNotes: report.resolutionNotes },
    });

    res.status(200).json({
      success: true,
      message: 'Đã cập nhật trạng thái báo cáo sự cố thành công',
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// E. SYSTEM LOGS AND AUDIT LOGS
// ==========================================

// @desc    Get paginated audit logs
// @route   GET /api/admin/audit-logs
// @access  Private/Admin
exports.getAuditLogs = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 15));
    const skip = (page - 1) * limit;

    const { action, targetType, search } = req.query;

    const query = {};

    if (action && action !== 'all') {
      query.action = action;
    }

    if (targetType && targetType !== 'all') {
      query.targetType = targetType;
    }

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      query.$or = [{ actorName: regex }, { actorEmail: regex }, { targetLabel: regex }, { action: regex }];
    }

    const [total, logs] = await Promise.all([
      AuditLog.countDocuments(query),
      AuditLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ]);

    res.status(200).json({
      success: true,
      data: logs,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit) || 1,
        limit,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export audit logs as CSV
// @route   GET /api/admin/audit-logs/export
// @access  Private/Admin
exports.exportAuditLogsCsv = async (req, res, next) => {
  try {
    const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(1000).lean();

    const headers = ['Thời gian', 'Quản trị viên', 'Email', 'Hành động', 'Đối tượng', 'Chi tiết đối tượng', 'Trạng thái', 'Địa chỉ IP'];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = logs.map((log) => [
      escapeCsv(new Date(log.createdAt).toISOString()),
      escapeCsv(log.actorName),
      escapeCsv(log.actorEmail),
      escapeCsv(log.action),
      escapeCsv(log.targetType),
      escapeCsv(log.targetLabel),
      escapeCsv(log.status),
      escapeCsv(log.ipAddress),
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="pickme3d_audit_logs_${Date.now()}.csv"`);
    res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};

// ==========================================
// F. REPORTING AND ANALYTICS
// ==========================================

// @desc    Get real analytics & trend data
// @route   GET /api/admin/analytics
// @access  Private/Admin
exports.getReportingAnalytics = async (req, res, next) => {
  try {
    // 14-day activity aggregation
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const [userTrends, templateTrends, reportTrends] = await Promise.all([
      User.aggregate([
        { $match: { createdAt: { $gte: fourteenDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Template.aggregate([
        { $match: { createdAt: { $gte: fourteenDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Report.aggregate([
        { $match: { createdAt: { $gte: fourteenDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    res.status(200).json({
      success: true,
      data: {
        trends: {
          userRegistrations: userTrends,
          templatesCreated: templateTrends,
          reportsSubmitted: reportTrends,
        },
        monetization: {
          status: 'not_configured',
          message: 'Hệ thống thanh toán / đăng ký tổ chức chưa được định nghĩa trong schema dự án',
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export incident reports as CSV
// @route   GET /api/admin/reports/export
// @access  Private/Admin
exports.exportReportsCsv = async (req, res, next) => {
  try {
    const reports = await Report.find().sort({ createdAt: -1 }).limit(1000).lean();

    const headers = ['Thời gian', 'Người báo cáo', 'Loại đối tượng', 'Đối tượng', 'Lý do', 'Mức độ ưu tiên', 'Trạng thái', 'Ghi chú xử lý'];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = reports.map((r) => [
      escapeCsv(new Date(r.createdAt).toISOString()),
      escapeCsv(r.reporterName),
      escapeCsv(r.targetType),
      escapeCsv(r.targetTitle || r.targetId),
      escapeCsv(r.reason),
      escapeCsv(r.priority),
      escapeCsv(r.status),
      escapeCsv(r.resolutionNotes || ''),
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="pickme3d_incident_reports_${Date.now()}.csv"`);
    res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};
