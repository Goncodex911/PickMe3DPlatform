const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

exports.googleLogin = async (req, res, next) => {
  try {
    const { token } = req.body;
    
    // Verify the Google token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    const { sub, email, name, picture } = payload;
    
    // Check if user exists
    let user = await User.findOne({ email });
    
    if (!user) {
      // Create new user
      user = await User.create({
        googleId: sub,
        email,
        name,
        picture,
      });
    } else if (!user.googleId) {
      // Update existing user with Google ID
      user.googleId = sub;
      user.picture = picture;
      await user.save();
    }
    
    // Generate JWT
    const jwtToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.status(200).json({
      success: true,
      token: jwtToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        picture: user.picture,
        role: user.role,
        jobRole: user.jobRole,
      },
    });
  } catch (error) {
    console.error('Google Auth Error:', error);
    res.status(401).json({ success: false, message: 'Invalid Google token' });
  }
};
