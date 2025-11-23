import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Otp from '../models/Otp.js';
import { signToken } from '../utils/jwt.js';
import { generateOtp, OTP_EXPIRATION_MINUTES, looksLikeEmail } from '../utils/otp.js';
import requireAuth from '../middleware/requireAuth.js';
import { sendOtpViaVonage } from '../services/vonage.js';

const router = express.Router();

const signupHandler = async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password are required' });
  }
  if (!looksLikeEmail(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  try {
    const hashedPassword = bcrypt.hashSync(password, 10);
    const user = await User.create({ name, email, password: hashedPassword });
    const token = signToken(user);
    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      isPhoneVerified: user.isPhoneVerified,
      token,
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'Email already exists' });
  }
};

router.post('/signup', signupHandler);
router.post('/register', signupHandler);

router.post('/login', async (req, res) => {
  const { identifier, credential } = req.body;
  if (!identifier || !credential) {
    return res.status(400).json({ error: 'Identifier and credential are required' });
  }
  try {
    const useEmail = looksLikeEmail(identifier);
    const query = useEmail ? { email: identifier } : { phone: identifier };
    const user = await User.findOne(query);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!useEmail && !user.isPhoneVerified) {
      return res.status(400).json({ error: 'Phone number is not verified' });
    }
    const isPasswordCorrect = bcrypt.compareSync(credential, user.password);
    if (!isPasswordCorrect) return res.status(400).json({ error: 'Wrong credentials' });
    const token = signToken(user);
    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      isPhoneVerified: user.isPhoneVerified,
      token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/add-phone', requireAuth, async (req, res) => {
  const { phoneNumber } = req.body;
  if (!phoneNumber) return res.status(400).json({ error: 'Phone number is required' });
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.phone === phoneNumber && user.isPhoneVerified) {
      return res.status(200).json({ message: 'Phone already verified', phone: user.phone });
    }
    const phoneTaken = await User.findOne({ phone: phoneNumber, _id: { $ne: req.userId } });
    if (phoneTaken) return res.status(400).json({ error: 'Phone in use' });
    const otp = generateOtp();
    const otpHash = bcrypt.hashSync(otp, 10);
    const expiresAt = new Date(Date.now() + OTP_EXPIRATION_MINUTES * 60 * 1000);
    await Otp.findOneAndUpdate(
      { userId: req.userId, phone: phoneNumber },
      { otpHash, expiresAt },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    try {
      await sendOtpViaVonage(phoneNumber, otp);
    } catch (smsErr) {
      console.error('Vonage SMS error:', smsErr);
      return res.status(502).json({ error: 'Failed to send OTP via SMS' });
    }
    const payload = { message: 'OTP sent to phone' };
    if (process.env.NODE_ENV !== 'production') payload.otp = otp;
    res.json(payload);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

router.post('/verify-phone', requireAuth, async (req, res) => {
  const { phoneNumber, otp } = req.body;
  if (!phoneNumber || !otp) return res.status(400).json({ error: 'Phone number and OTP are required' });
  try {
    const otpRecord = await Otp.findOne({ userId: req.userId, phone: phoneNumber });
    if (!otpRecord) return res.status(400).json({ error: 'OTP not requested for this phone' });
    if (otpRecord.expiresAt < new Date()) return res.status(400).json({ error: 'OTP expired' });
    const isOtpValid = bcrypt.compareSync(otp, otpRecord.otpHash);
    if (!isOtpValid) return res.status(400).json({ error: 'Invalid OTP' });
    const updatedUser = await User.findByIdAndUpdate(
      req.userId,
      { phone: phoneNumber, isPhoneVerified: true },
      { new: true }
    );
    await Otp.deleteOne({ _id: otpRecord._id });
    res.json({
      message: 'Phone verified successfully',
      phone: updatedUser.phone,
      isPhoneVerified: updatedUser.isPhoneVerified,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to verify phone' });
  }
});

export default router;
