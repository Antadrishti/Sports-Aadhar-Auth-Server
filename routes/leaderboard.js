import express from 'express';
import User from '../models/User.js';
import AthleteTests from '../models/AthleteTests.js';

const router = express.Router();
const TOTAL_TESTS = 8;

router.get('/', async (_req, res) => {
  try {
    const users = await User.find().select('name profilePictureUrl').lean();
    const userIds = users.map((u) => u._id);
    const testsDocs = await AthleteTests.find({ userId: { $in: userIds } }).lean();
    const testsByUser = new Map(testsDocs.map((doc) => [String(doc.userId), doc.tests || []]));

    const leaderboard = users.map((user) => {
      const tests = testsByUser.get(String(user._id)) || [];
      let sum = 0;
      let testsTaken = 0;
      tests.forEach((t) => {
        const score = Number(t.ratingScale);
        if (Number.isFinite(score) && score >= 1 && score <= 10) {
          sum += score;
          testsTaken += 1;
        }
      });
      const averageScore = TOTAL_TESTS > 0 ? Number((sum / TOTAL_TESTS).toFixed(2)) : 0;
      return {
        athleteId: user._id,
        name: user.name,
        averageScore,
        testsTaken,
        avatarUrl: user.profilePictureUrl || null,
      };
    });

    leaderboard.sort((a, b) => {
      if (b.averageScore !== a.averageScore) return b.averageScore - a.averageScore;
      if (b.testsTaken !== a.testsTaken) return b.testsTaken - a.testsTaken;
      return String(a.name || '').localeCompare(String(b.name || ''));
    });

    res.json(leaderboard);
  } catch (err) {
    console.error('Failed to build leaderboard:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

export default router;
