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
