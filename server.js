import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDb } from './config/db.js';
import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profile.js';

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

connectDb();

app.use('/auth', authRoutes);
app.use('/profile', profileRoutes);

app.listen(process.env.PORT, () =>
  console.log(`Server running port ${process.env.PORT}`)
);
