const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const TokenBlacklist = require('../models/TokenBlacklist');

exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    const otpResponse = await axios.post('http://localhost:3003/api/email/verify-otp', { email, otp });
    if (!otpResponse.data.valid) {
      return res.status(400).json({ valid: false, error: 'Invalid or expired OTP' });
    }

    res.json({ valid: true });
  } catch (error) {
    console.error('Error in verifyOtp:', error.message);
    res.status(500).json({ error: `Server error: ${error.message}` });
  }
};

exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    let idResponse;
    try {
      console.log('Calling user-service getUserIdByEmail:', { email });
      idResponse = await axios.get(`http://localhost:3001/api/users/id/${email}`);
    } catch (error) {
      console.error('Error fetching user ID from user-service:', error.response?.status, error.message);
      return res.status(404).json({ error: 'User not found' });
    }

    const { id } = idResponse.data;

    let userResponse;
    try {
      console.log('Calling user-service getUserById:', { id });
      userResponse = await axios.get(`http://localhost:3001/api/users/by-id/${id}`);
    } catch (error) {
      console.error('Error fetching user by ID from user-service:', error.response?.status, error.message);
      return res.status(404).json({ error: 'User not found' });
    }

    const { user } = userResponse.data;
    if (!user || !user.isVerified) {
      return res.status(401).json({ error: 'Invalid credentials or unverified account' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.json({ token, name: user.name, role: user.role });
  } catch (error) {
    console.error('Error in loginUser:', error.message);
    res.status(500).json({ error: `Server error: ${error.message}` });
  }
};

exports.logout = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const blacklistedToken = new TokenBlacklist({
      token,
      expiresAt: new Date(decoded.exp * 1000)
    });
    await blacklistedToken.save();

    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Error in logout:', error.message);
    res.status(500).json({ error: `Server error: ${error.message}` });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    let idResponse;
    try {
      console.log('Calling user-service getUserIdByEmail:', { email });
      idResponse = await axios.get(`http://localhost:3001/api/users/id/${email}`);
    } catch (error) {
      console.error('Error fetching user ID from user-service:', error.response?.status, error.message);
      return res.status(404).json({ error: 'User not found' });
    }

    const { id } = idResponse.data;

    let userResponse;
    try {
      console.log('Calling user-service getUserById:', { id });
      userResponse = await axios.get(`http://localhost:3001/api/users/by-id/${id}`);
    } catch (error) {
      console.error('Error fetching user by ID from user-service:', error.response?.status, error.message);
      return res.status(404).json({ error: 'User not found' });
    }

    const { user } = userResponse.data;
    if (!user || !user.isVerified) {
      return res.status(401).json({ error: 'Account not verified' });
    }

    try {
      console.log('Calling email-service send-otp:', { email });
      await axios.post('http://localhost:3003/api/email/send-otp', { email });
    } catch (error) {
      console.error('Error sending OTP:', error.response?.status, error.message);
      return res.status(500).json({ error: `Failed to send OTP: ${error.response?.data?.error || error.message}` });
    }

    res.json({ message: 'OTP sent to email' });
  } catch (error) {
    console.error('Error in forgotPassword:', error.message);
    res.status(500).json({ error: `Server error: ${error.message}` });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: 'Email, OTP, and new password are required' });
    }

    let idResponse;
    try {
      console.log('Calling user-service getUserIdByEmail:', { email });
      idResponse = await axios.get(`http://localhost:3001/api/users/id/${email}`);
    } catch (error) {
      console.error('Error fetching user ID from user-service:', error.response?.status, error.message);
      return res.status(404).json({ error: 'User not found' });
    }

    const { id } = idResponse.data;

    const otpResponse = await axios.post('http://localhost:3003/api/email/verify-otp', { email, otp });
    if (!otpResponse.data.valid) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    try {
      console.log('Calling user-service update-password:', { id, newPassword });
      await axios.patch('http://localhost:3001/api/users/update-password', { id, newPassword });
    } catch (error) {
      console.error('Error updating password:', error.response?.status, error.message);
      return res.status(500).json({ error: `Failed to update password: ${error.response?.data?.error || error.message}` });
    }

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Error in resetPassword:', error.message);
    res.status(500).json({ error: `Server error: ${error.message}` });
  }
};