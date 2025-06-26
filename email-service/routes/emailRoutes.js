const express = require('express');
const router = express.Router();
const emailController = require('../controllers/emailController');

router.post('/send-otp', emailController.sendOtp);
router.post('/resend-otp', emailController.resendOtp);
router.post('/verify-otp', emailController.verifyOtp);

module.exports = router;