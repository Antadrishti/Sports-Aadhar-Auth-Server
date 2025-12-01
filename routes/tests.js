import express from 'express';
import requireAuth from '../middleware/requireAuth.js';
import AthleteTests from '../models/AthleteTests.js';

const router = express.Router();

const DEFAULT_TESTS = [
  {
    testNumber: 1,
    sequenceLabel: 'Test 1',
    nameOfTest: 'Sit and Reach',
    qualityTested: 'Flexibility',
    ratingScale: null,
  },
  {
    testNumber: 2,
    sequenceLabel: 'Test 2',
    nameOfTest: 'Standing Vertical Jump',
    qualityTested: 'Lower Body Explosive Strength',
    ratingScale: null,
  },
  {
    testNumber: 3,
    sequenceLabel: 'Test 3',
    nameOfTest: 'Standing Broad Jump',
    qualityTested: 'Lower Body Explosive Strength',
    ratingScale: null,
  },
  {
    testNumber: 4,
    sequenceLabel: 'Test 4',
    nameOfTest: 'Medicine Ball Throw',
    qualityTested: 'Upper Body Strength',
    ratingScale: null,
  },
  {
    testNumber: 5,
    sequenceLabel: 'Test 5',
    nameOfTest: '30mts Standing Start',
    qualityTested: 'Speed',
    ratingScale: null,
  },
  {
    testNumber: 6,
    sequenceLabel: 'Test 6',
    nameOfTest: '4 x 10 mts Shuttle Run',
    qualityTested: 'Agility',
    ratingScale: null,
  },
  {
    testNumber: 7,
    sequenceLabel: 'Test 7',
    nameOfTest: 'Sit Ups',
    qualityTested: 'Core Strength',
    ratingScale: null,
  },
  {
    testNumber: 8,
    sequenceLabel: 'Test 8',
    nameOfTest: '800m Run (U-12), 1.6km Run (12+)',
    qualityTested: 'Endurance',
    ageCategory: 'U-12 / 12+',
    ratingScale: null,
  },
];

const CATEGORY_TESTS = {
  flexibility: [DEFAULT_TESTS[0]],
  lowerbodyexplosive: [DEFAULT_TESTS[1], DEFAULT_TESTS[2]],
  upperbodystrength: [DEFAULT_TESTS[3]],
  speed: [DEFAULT_TESTS[4]],
  agility: [DEFAULT_TESTS[5]],
  corestrength: [DEFAULT_TESTS[6]],
  endurance: [DEFAULT_TESTS[7]],
};

const categoryAlias = {
  flexiblity: 'flexibility',
  lowerbodyexplosive: 'lowerbodyexplosive',
  upperbodyexplosive: 'upperbodystrength',
  upperbody: 'upperbodystrength',
  core: 'corestrength',
};

const sanitizeSingleTest = (rawTest, idx = 0) => {
  const test = rawTest || {};
  const name = String(test.nameOfTest || '').trim();
  if (!name) return null;
  const sequenceLabel = String(test.sequenceLabel || '').trim() || `Test ${idx + 1}`;
  const testNumber = Number.isFinite(Number(test.testNumber)) ? Number(test.testNumber) : idx + 1;

  let ratingScale = null;
  if (test.ratingScale !== undefined) {
    const value = Number(test.ratingScale);
    const withinBounds = (val) => Number.isFinite(val) && val >= 1 && val <= 10;
    if (!withinBounds(value)) {
      return { error: 'ratingScale must be a number between 1 and 10' };
    }
    ratingScale = value;
  }

  return {
    testNumber,
    sequenceLabel,
    nameOfTest: name,
    qualityTested: String(test.qualityTested || '').trim(),
    ageCategory: test.ageCategory ? String(test.ageCategory).trim() : undefined,
    ratingScale,
    testDate: new Date(),
  };
};

const sanitizeTests = (rawTests) => {
  if (!Array.isArray(rawTests)) return null;
  const cleaned = [];
  for (let i = 0; i < rawTests.length; i += 1) {
    const entry = sanitizeSingleTest(rawTests[i], i);
    if (!entry) return null;
    if (entry.error) return entry;
    cleaned.push(entry);
  }
  return cleaned;
};

const upsertSingleTest = async (userId, testData) => {
  let record = await AthleteTests.findOne({ userId });
  if (!record) {
    record = await AthleteTests.create({ userId, tests: [testData] });
    return record;
  }
  const idx = record.tests.findIndex((t) => t.testNumber === testData.testNumber);
  if (idx >= 0) {
    const error = new Error('Test already taken');
    error.code = 'TEST_EXISTS';
    throw error;
  }
  record.tests.push(testData);
  record.tests.sort((a, b) => (a.testNumber || 0) - (b.testNumber || 0));
  record.markModified('tests');
  await record.save();
  return record;
};

router.post('/upload', requireAuth, async (req, res) => {
  const testsInput = req.body?.tests;
  const singleTestInput = req.body?.test;

  try {
    if (singleTestInput) {
      const sanitizedSingle = sanitizeSingleTest(singleTestInput);
      if (!sanitizedSingle) return res.status(400).json({ error: 'Invalid test payload' });
      if (sanitizedSingle.error) return res.status(400).json({ error: sanitizedSingle.error });
      try {
        const record = await upsertSingleTest(req.userId, sanitizedSingle);
        return res.json({ message: 'Test saved', tests: record.tests });
      } catch (err) {
        if (err?.code === 'TEST_EXISTS') {
          return res.status(400).json({ error: 'Test already taken' });
        }
        throw err;
      }
    }

    const sanitized = sanitizeTests(testsInput || DEFAULT_TESTS);
    if (!sanitized || sanitized.length === 0) {
      return res.status(400).json({ error: 'Invalid tests payload' });
    }
    if (sanitized.error) return res.status(400).json({ error: sanitized.error });
    const record = await AthleteTests.findOneAndUpdate(
      { userId: req.userId },
      { tests: sanitized },
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
    ).lean();

    return res.json({
      message: 'Tests uploaded',
      tests: record.tests,
    });
  } catch (err) {
    console.error('Failed to upload tests:', err);
    res.status(500).json({ error: 'Failed to upload tests' });
  }
});

router.post('/upload/:category', requireAuth, async (req, res) => {
  const rawCategory = (req.params.category || '').toLowerCase();
  const category = categoryAlias[rawCategory] || rawCategory;
  const categoryTests = CATEGORY_TESTS[category];
  if (!categoryTests) {
    return res.status(404).json({
      error: 'Unknown test category',
      allowed: Object.keys(CATEGORY_TESTS),
    });
  }

  try {
    for (let i = 0; i < categoryTests.length; i += 1) {
      const sanitized = sanitizeSingleTest(categoryTests[i], categoryTests[i].testNumber || i + 1);
      if (!sanitized) continue;
      if (sanitized.error) {
        return res.status(400).json({ error: sanitized.error });
      }
      await upsertSingleTest(req.userId, sanitized);
    }
    const updated = await AthleteTests.findOne({ userId: req.userId }).lean();
    return res.json({
      message: 'Test category saved',
      category,
      tests: updated?.tests || [],
    });
  } catch (err) {
    if (err?.code === 'TEST_EXISTS') {
      return res.status(400).json({ error: 'Test already taken' });
    }
    console.error('Failed to upload category tests:', err);
    res.status(500).json({ error: 'Failed to upload category tests' });
  }
});

router.get('/user/:id', requireAuth, async (req, res) => {
  try {
    const record = await AthleteTests.findOne({ userId: req.params.id }).lean();
    if (!record) {
      return res.json({ userId: req.params.id, tests: [] });
    }
    return res.json({ userId: record.userId, tests: record.tests || [] });
  } catch (err) {
    if (err?.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid user id' });
    }
    console.error('Failed to fetch user tests:', err);
    return res.status(500).json({ error: 'Failed to fetch user tests' });
  }
});

export default router;
