import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    name: String,
    email: {
      type: String,
      unique: true,
      required: true,
      match: [/\S+@\S+\.\S+/, 'Invalid email format'],
    },
    password: { type: String, required: true },
    age: { type: Number, required: true, min: 1 },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },
    phone: { type: String, unique: true, sparse: true },
    isPhoneVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const User = mongoose.model('User', UserSchema);
export default User;
