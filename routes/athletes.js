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

router.get('/:id', async (req, res) => {
  try {
    const athlete = await User.findById(req.params.id).select('name').lean();
    if (!athlete) return res.status(404).json({ error: 'Athlete not found' });
    res.json({ id: athlete._id, name: athlete.name });
  } catch (err) {
    if (err?.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid athlete id' });
    }
    console.error('Failed to fetch athlete by id:', err);
    res.status(500).json({ error: 'Failed to fetch athlete' });
  }
});

export default router;
