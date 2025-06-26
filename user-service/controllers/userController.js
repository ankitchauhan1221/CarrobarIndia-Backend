const bcrypt = require('bcrypt');
const User = require('../models/User');
const axios = require('axios');

exports.initiateRegistration = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    console.log('Received in initiateRegistration:', req.body);

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (role && !['admin', 'user', 'dealer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      if (existingUser.isVerified) {
        return res.status(400).json({ error: 'Email already exists and is verified' });
      }
      // Unverified user exists, send new OTP
      try {
        console.log('Calling email-service send-otp for unverified user:', { email });
        await axios.post('http://localhost:3003/api/email/send-otp', { email });
        return res.status(200).json({ message: 'OTP resent to email' });
      } catch (error) {
        return res.status(500).json({ error: `Failed to send OTP: ${error.response?.data?.error || error.message}` });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      email,
      password: hashedPassword,
      role: role || 'user'
    });
    await user.save();

    try {
      console.log('Calling email-service send-otp:', { email });
      await axios.post('http://localhost:3003/api/email/send-otp', { email });
    } catch (error) {
      await User.deleteOne({ email });
      return res.status(500).json({ error: `Failed to send OTP: ${error.response?.data?.error || error.message}` });
    }

    res.status(201).json({ message: 'OTP sent to email' });
  } catch (error) {
    res.status(500).json({ error: `Server error: ${error.message}` });
  }
};

// jitender bhai 

exports.resendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    console.log('Received in resendOtp:', req.body);

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (user.isVerified) {
      return res.status(400).json({ error: 'User is already verified' });
    }

    try {
      console.log('Calling email-service resend-otp:', { email });
      await axios.post('http://localhost:3003/api/email/resend-otp', { email });
    } catch (error) {
      return res.status(500).json({ error: `Failed to resend OTP: ${error.response?.data?.error || error.message}` });
    }

    res.json({ message: 'OTP resent to email' });
  } catch (error) {
    res.status(500).json({ error: `Server error: ${error.message}` });
  }
};

exports.completeRegistration = async (req, res) => {
  try {
    const { email, otp, name } = req.body;

    if (!email || !otp || !name) {
      return res.status(400).json({ error: 'Email, OTP, and name are required' });
    }

    const otpResponse = await axios.post('http://localhost:3002/api/auth/verify-otp', { email, otp });
    if (!otpResponse.data.valid) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.name = name;
    user.isVerified = true;
    await user.save();

    res.json({ message: 'Registration completed successfully', role: user.role });
  } catch (error) {
    res.status(500).json({ error: `Server error: ${error.message}` });
  }
};