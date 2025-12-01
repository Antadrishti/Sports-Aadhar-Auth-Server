import mongoose from 'mongoose';

const testItemSchema = new mongoose.Schema(
  {
    testNumber: { type: Number, required: true },
    sequenceLabel: { type: String, required: true },
    nameOfTest: { type: String, required: true },
    qualityTested: { type: String, default: '' },
    ageCategory: { type: String },
    ratingScale: { type: Number, min: 1, max: 10 },
    testDate: { type: Date, default: () => new Date(), required: true },
  },
  { _id: false }
);

const athleteTestsSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, required: true },
    tests: { type: [testItemSchema], default: [] },
  },
  { timestamps: true }
);

const AthleteTests = mongoose.model('AthleteTests', athleteTestsSchema);
export default AthleteTests;
