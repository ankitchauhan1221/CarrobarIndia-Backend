const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const axios = require('axios');

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
    res.status(500).json({ error: `Server error: ${error.message}` });
  }
};

exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const userResponse = await axios.get(`http://localhost:3001/api/users/${email}`);
    const user = userResponse.data.user;

    if (!user || !user.isVerified) {
      return res.status(401).json({ error: 'Invalid credentials or unverified account' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.json({ token, name: user.name, role: user.role });
  } catch (error) {
    res.status(500).json({ error: `Server error: ${error.message}` });
  }
};