const Payout = require('../models/Payout');
const Order = require('../models/Order');
const User = require('../models/User');
const { notifyAdmins } = require('../helpers/notificationHelper');

/**
 * Calculates current creator wallet balances accurately from Orders and Payouts
 */
const calculateCreatorBalances = async (user) => {
  const userId = user._id;

  const [paidOrders, payouts] = await Promise.all([
    Order.find({ sellerId: userId, status: 'PAID' })
      .populate('templateId', 'title thumbnailUrl price')
      .sort({ paidAt: -1, createdAt: -1 }),
    Payout.find({ creatorId: userId }).sort({ createdAt: -1 }),
  ]);

  const salesEarnings = paidOrders.reduce((sum, o) => sum + (Number(o.creatorEarnings) || 0), 0);
  const seededBalance = Number(user.walletBalance) || 0;
  const totalEarnings = salesEarnings + seededBalance;

  let pendingPayout = 0;
  let paidPayout = 0;
  let rejectedPayout = 0;

  payouts.forEach((p) => {
    if (p.status === 'PENDING') pendingPayout += Number(p.amount) || 0;
    else if (p.status === 'PAID') paidPayout += Number(p.amount) || 0;
    else if (p.status === 'REJECTED') rejectedPayout += Number(p.amount) || 0;
  });

  const availableBalance = Math.max(0, totalEarnings - pendingPayout - paidPayout);

  return {
    metrics: {
      totalEarnings,
      availableBalance,
      pendingPayout,
      paidPayout,
      rejectedPayout,
      salesEarnings,
      seededBalance,
    },
    paidOrders,
    payouts,
  };
};

// @desc    Get Creator Wallet summary (Metrics, Saved Bank, Histories)
// @route   GET /api/payouts/wallet
// @access  Private
exports.getCreatorWalletSummary = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const { metrics, paidOrders, payouts } = await calculateCreatorBalances(user);

    const earningsHistory = paidOrders.map((order) => ({
      _id: order._id,
      orderCode: order.orderCode,
      templateTitle: order.templateId?.title || 'Mẫu thiết kế PickMe 3D',
      templateThumbnail: order.templateId?.thumbnailUrl || '',
      grossAmount: order.grossAmount || order.amount,
      amount: order.amount,
      creatorEarnings: order.creatorEarnings,
      buyerName: order.customer?.name || 'Khách hàng',
      buyerEmail: order.customer?.email || '',
      paidAt: order.paidAt || order.createdAt,
    }));

    res.status(200).json({
      success: true,
      data: {
        metrics,
        savedBankInfo: user.savedBankInfo || { bankName: '', accountNumber: '', accountHolder: '' },
        earningsHistory,
        payoutHistory: payouts,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit a new payout request
// @route   POST /api/payouts
// @access  Private
exports.requestPayout = async (req, res, next) => {
  try {
    const { amount, bankInfo, saveBankInfo = false } = req.body;
    const numAmount = Math.round(Number(amount));

    if (!numAmount || isNaN(numAmount) || numAmount < 10000) {
      return res.status(400).json({
        success: false,
        message: 'Số tiền rút tối thiểu là 10.000 VNĐ',
      });
    }

    if (!bankInfo || !bankInfo.bankName || !bankInfo.accountNumber || !bankInfo.accountHolder) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ thông tin ngân hàng (Tên ngân hàng, Số tài khoản, Tên chủ thẻ)',
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const { metrics } = await calculateCreatorBalances(user);

    if (numAmount > metrics.availableBalance) {
      return res.status(400).json({
        success: false,
        message: `Số dư khả dụng (${metrics.availableBalance.toLocaleString('vi-VN')} VNĐ) không đủ để yêu cầu rút ${numAmount.toLocaleString('vi-VN')} VNĐ.`,
      });
    }

    // Save bank info to profile if requested or if user has no saved bank info
    const cleanBankInfo = {
      bankName: bankInfo.bankName.trim(),
      accountNumber: bankInfo.accountNumber.trim(),
      accountHolder: bankInfo.accountHolder.trim().toUpperCase(),
    };

    if (saveBankInfo || !user.savedBankInfo?.accountNumber) {
      user.savedBankInfo = cleanBankInfo;
      await user.save();
    }

    const payout = await Payout.create({
      creatorId: user._id,
      creatorName: user.name || 'Creator',
      creatorEmail: user.email,
      amount: numAmount,
      creatorBalance: metrics.availableBalance - numAmount,
      bankInfo: cleanBankInfo,
      status: 'PENDING',
    });

    // Notify all Administrators
    await notifyAdmins({
      actorId: user._id,
      type: 'payout_request',
      message: `Creator ${user.name || user.email} đã yêu cầu rút ${numAmount.toLocaleString('vi-VN')} VNĐ`,
      link: '/admin/payouts',
      metadata: {
        payoutId: payout._id,
        amount: numAmount,
        creatorEmail: user.email,
        creatorName: user.name,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Yêu cầu rút tiền đã được tạo thành công và gửi tới ban quản trị.',
      data: payout,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update saved bank information in user profile
// @route   PUT /api/payouts/bank-info
// @access  Private
exports.updateSavedBankInfo = async (req, res, next) => {
  try {
    const { bankName, accountNumber, accountHolder } = req.body;

    if (!bankName || !accountNumber || !accountHolder) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ: Tên ngân hàng, Số tài khoản, Tên chủ thẻ',
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.savedBankInfo = {
      bankName: bankName.trim(),
      accountNumber: accountNumber.trim(),
      accountHolder: accountHolder.trim().toUpperCase(),
    };
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Thông tin tài khoản ngân hàng đã được cập nhật thành công.',
      data: user.savedBankInfo,
    });
  } catch (error) {
    next(error);
  }
};

