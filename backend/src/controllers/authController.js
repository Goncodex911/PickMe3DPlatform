const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');

exports.guestLogin = async (req, res) => {
  const rawName = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const name = (rawName || 'Designer').slice(0, 30);
  const username = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 30) || 'designer';

  const userObj = {
    id: `guest-${username}`,
    name,
    email: `${username}@pickme3d.local`,
    picture: '',
    role: 'designer',
    jobRole: 'Fashion Designer',
    username,
  };

  const jwtSecret = process.env.JWT_SECRET || 'super_secret_pickme3d_jwt_key_2024';
  const jwtToken = jwt.sign(
    { id: userObj.id, email: userObj.email, role: userObj.role, name: userObj.name },
    jwtSecret,
    { expiresIn: '7d' }
  );

  return res.status(200).json({
    success: true,
    token: jwtToken,
    user: userObj,
  });
};

exports.googleLogin = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Google token is required' });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID || '532936713942-qmhidnnhkrvhv62rindb0nsq946cavia.apps.googleusercontent.com';
    const client = new OAuth2Client(clientId);
    
    // Verify the Google token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: clientId,
    });
    
    const payload = ticket.getPayload();
    const { sub, email, name, picture } = payload;
    
    let userObj = {
      id: sub,
      name: name || 'Creator',
      email,
      picture: picture || '',
      role: 'designer',
      jobRole: 'Fashion Designer',
    };

    // If MongoDB is connected, find or create the user in DB
    if (mongoose.connection.readyState === 1) {
      try {
        let user = await User.findOne({ email });
        if (user && user.status === 'banned') {
          return res.status(403).json({
            success: false,
            isBanned: true,
            message: 'Tài khoản của bạn đã bị khóa: ' + (user.bannedReason || 'Vi phạm điều khoản cộng đồng'),
          });
        }

        if (!user) {
          user = await User.create({
            googleId: sub,
            email,
            name,
            picture,
          });
        } else if (!user.googleId) {
          user.googleId = sub;
          user.picture = picture;
          await user.save();
        }
        userObj = {
          id: user._id,
          name: user.name,
          email: user.email,
          picture: user.picture,
          role: user.role,
          jobRole: user.jobRole,
          status: user.status || 'active',
        };
      } catch (dbErr) {
        console.warn('⚠️  MongoDB query failed, proceeding with verified Google session:', dbErr.message);
      }
    } else {
      console.warn('⚠️  MongoDB is not connected (check Atlas IP Whitelist). Proceeding with verified Google session.');
    }
    
    // Generate JWT
    const jwtSecret = process.env.JWT_SECRET || 'super_secret_pickme3d_jwt_key_2024';
    const jwtToken = jwt.sign(
      { id: userObj.id, email: userObj.email, role: userObj.role },
      jwtSecret,
      { expiresIn: '7d' }
    );
    
    return res.status(200).json({
      success: true,
      token: jwtToken,
      user: userObj,
    });
  } catch (error) {
    console.error('Google Auth Error:', error);
    return res.status(401).json({ success: false, message: 'Xác thực Google không hợp lệ: ' + error.message });
  }
};

exports.adminLogin = async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Tên đăng nhập và mật khẩu là bắt buộc' });
    }

    const expectedUsername = process.env.ADMIN_USERNAME || 'admin123';
    const expectedPassword = process.env.ADMIN_PASSWORD || 'admin123';

    if (username.trim() !== expectedUsername || password !== expectedPassword) {
      return res.status(401).json({ success: false, message: 'Sai tên đăng nhập hoặc mật khẩu quản trị viên' });
    }

    let userObj = {
      id: 'admin-root',
      _id: 'admin-root',
      name: 'System Administrator',
      email: 'admin@pickme3d.com',
      username: expectedUsername,
      picture: '',
      role: 'admin',
      status: 'active',
      plan: 'studio',
    };

    // If MongoDB is connected, find or create the admin user in DB
    if (mongoose.connection.readyState === 1) {
      try {
        let adminUser = await User.findOne({
          $or: [{ username: expectedUsername }, { email: 'admin@pickme3d.com' }],
        });

        if (!adminUser) {
          adminUser = await User.create({
            name: 'System Administrator',
            email: 'admin@pickme3d.com',
            username: expectedUsername,
            role: 'admin',
            status: 'active',
            plan: 'studio',
          });
        } else {
          let updated = false;
          if (adminUser.role !== 'admin') {
            adminUser.role = 'admin';
            updated = true;
          }
          if (adminUser.status !== 'active') {
            adminUser.status = 'active';
            updated = true;
          }
          if (updated) await adminUser.save();
        }

        userObj = {
          id: adminUser._id.toString(),
          _id: adminUser._id.toString(),
          name: adminUser.name,
          email: adminUser.email,
          username: adminUser.username || expectedUsername,
          picture: adminUser.picture || '',
          role: 'admin',
          status: 'active',
          plan: adminUser.plan || 'studio',
        };
      } catch (dbErr) {
        console.warn('MongoDB admin sync warning:', dbErr.message);
      }
    }

    // Generate JWT
    const jwtSecret = process.env.JWT_SECRET || 'pickme3d_super_secret_jwt_key_2026';
    const jwtToken = jwt.sign(
      {
        id: userObj.id,
        _id: userObj.id,
        email: userObj.email,
        role: 'admin',
        name: userObj.name,
      },
      jwtSecret,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      success: true,
      message: 'Đăng nhập Quản trị viên thành công',
      token: jwtToken,
      user: userObj,
    });
  } catch (error) {
    console.error('Admin Auth Error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi xác thực máy chủ: ' + error.message });
  }
};

