// controllers/authController.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
};

// register
exports.register = async (req, res) => {
  try {
    const { name, email, phone, password, gender } = req.body;
    if (!name || !phone || !password || !gender) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Basic women-only enforcement
    if (String(gender).toLowerCase() !== 'female') {
      return res.status(403).json({ message: 'Registration restricted to women only' });
    }

    const existing = await User.findOne({ phone });
    if (existing) return res.status(400).json({ message: 'User already exists with this phone' });

    const user = await User.create({ name, email, phone, password, gender, isVerified: false });
    return res.status(201).json({
      user: { id: user._id, name: user.name, phone: user.phone, email: user.email },
      token: generateToken(user._id)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// login
exports.login = async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) return res.status(400).json({ message: 'Missing credentials' });
    const user = await User.findOne({ phone });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    const match = await user.matchPassword(password);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });
    res.json({
      user: { id: user._id, name: user.name, phone: user.phone, email: user.email },
      token: generateToken(user._id)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
