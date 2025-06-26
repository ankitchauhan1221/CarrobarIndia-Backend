const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

router.post('/initiate-registration', userController.initiateRegistration);
router.post('/resend-otp', userController.resendOtp);
router.post('/complete-registration', userController.completeRegistration);

module.exports = router;