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