import express from 'express';
import multer from 'multer';
import requireAuth from '../middleware/requireAuth.js';
import User from '../models/User.js';
import { uploadToCloudinary } from '../services/cloudinary.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      age: user.age,
      city: user.city,
      state: user.state,
      pincode: user.pincode,
      phone: user.phone,
      isPhoneVerified: user.isPhoneVerified,
      profilePictureUrl: user.profilePictureUrl,
      profilePicturePublicId: user.profilePicturePublicId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

router.post('/picture', requireAuth, upload.single('image'), async (req, res) => {
  const bodyImage = req.body?.image;
  let imagePayload = null;

  // multipart file -> convert to data URI
  if (req.file && req.file.buffer) {
    const mime = req.file.mimetype || 'application/octet-stream';
    const base64 = req.file.buffer.toString('base64');
    imagePayload = `data:${mime};base64,${base64}`;
  } else if (bodyImage && typeof bodyImage === 'string') {
    imagePayload = bodyImage;
  }

  if (!imagePayload) {
    return res.status(400).json({ error: 'Image is required (multipart form-data field "image" or base64/url string)' });
  }
  try {
    const uploadResult = await uploadToCloudinary(imagePayload, {
      folder: 'profile-pictures',
      publicId: `profile_${req.userId}`,
    });
    const updatedUser = await User.findByIdAndUpdate(
      req.userId,
      {
        profilePictureUrl: uploadResult.url,
        profilePicturePublicId: uploadResult.publicId,
      },
      { new: true }
    );
    return res.json({
      message: 'Profile picture updated',
      url: uploadResult.url,
      publicId: uploadResult.publicId,
      profilePictureUrl: updatedUser?.profilePictureUrl,
    });
  } catch (err) {
    console.error('Failed to upload profile picture:', err);
    const status = err?.status && Number.isFinite(err.status) ? err.status : 500;
    return res.status(status).json({ error: 'Failed to upload profile picture' });
  }
});

router.get('/picture', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('profilePictureUrl profilePicturePublicId');
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({
      id: user._id,
      profilePictureUrl: user.profilePictureUrl,
      profilePicturePublicId: user.profilePicturePublicId,
    });
  } catch (err) {
    console.error('Failed to get profile picture:', err);
    return res.status(500).json({ error: 'Failed to get profile picture' });
  }
});

router.get('/picture/:id', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('profilePictureUrl profilePicturePublicId');
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({
      id: user._id,
      profilePictureUrl: user.profilePictureUrl,
      profilePicturePublicId: user.profilePicturePublicId,
    });
  } catch (err) {
    if (err?.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid user id' });
    }
    console.error('Failed to get profile picture:', err);
    return res.status(500).json({ error: 'Failed to get profile picture' });
  }
});

export default router;
