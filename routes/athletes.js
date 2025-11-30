import express from 'express';
import User from '../models/User.js';

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    const athletes = await User.find().select('-password -__v').lean();
    const payload = athletes.map((athlete) => ({
      id: athlete._id,
      name: athlete.name,
      email: athlete.email,
      age: athlete.age,
      city: athlete.city,
      state: athlete.state,
      pincode: athlete.pincode,
      phone: athlete.phone,
      isPhoneVerified: athlete.isPhoneVerified,
      createdAt: athlete.createdAt,
      updatedAt: athlete.updatedAt,
    }));
    res.json(payload);
  } catch (err) {
    console.error('Failed to fetch athletes:', err);
    res.status(500).json({ error: 'Failed to fetch athletes' });
  }
});

export default router;
