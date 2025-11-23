import mongoose from 'mongoose';

const OtpSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  phone: String,
  otpHash: String,
  expiresAt: { type: Date, expires: 0 },
});
OtpSchema.index({ userId: 1, phone: 1 }, { unique: true });

const Otp = mongoose.model('Otp', OtpSchema);
export default Otp;
