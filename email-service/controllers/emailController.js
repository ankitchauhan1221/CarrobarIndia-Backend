require("dotenv").config();
const transporter = require("../utils/emailServer");
const EmailOtp = require("../models/EmailOtp");
const AuditLog = require("../models/AuditLog");

exports.sendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    console.log("Received in sendOtp:", req.body);

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await EmailOtp.findOneAndUpdate(
      { email },
      { otp, expiresAt, attempts: 0 },
      { upsert: true, new: true }
    );

    await AuditLog.create({ email, action: "send" });

    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Your OTP for Registration",
        text: `Your OTP is ${otp}. It is valid for 10 minutes.`,
      });
    } catch (error) {
      return res
        .status(500)
        .json({ error: `Failed to send OTP email: ${error.message}` });
    }

    res.json({ message: "OTP email sent successfully" });
  } catch (error) {
    res.status(500).json({ error: `Server error: ${error.message}` });
  }
};

exports.resendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    console.log("Received in resendOtp:", req.body);

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const otpRecord = await EmailOtp.findOne({ email });
    if (otpRecord && otpRecord.attempts >= 3) {
      return res
        .status(429)
        .json({ error: "Too many resend attempts. Please try again later." });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const attempts = otpRecord ? otpRecord.attempts + 1 : 1;

    await EmailOtp.findOneAndUpdate(
      { email },
      { otp, expiresAt, attempts },
      { upsert: true, new: true }
    );

    await AuditLog.create({ email, action: "resend" });

    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Your Resent OTP for Registration",
        text: `Your new OTP is ${otp}. It is valid for 10 minutes.`,
      });
    } catch (error) {
      return res
        .status(500)
        .json({ error: `Failed to resend OTP email: ${error.message}` });
    }

    res.json({ message: "OTP email resent successfully" });
  } catch (error) {
    res.status(500).json({ error: `Server error: ${error.message}` });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: "Email and OTP are required" });
    }

    const otpRecord = await EmailOtp.findOne({ email, otp });
    if (!otpRecord || otpRecord.expiresAt < new Date()) {
      return res
        .status(400)
        .json({ valid: false, error: "Invalid or expired OTP" });
    }

    await EmailOtp.deleteOne({ email, otp });
    res.json({ valid: true });
  } catch (error) {
    res.status(500).json({ error: `Server error: ${error.message}` });
  }
};
