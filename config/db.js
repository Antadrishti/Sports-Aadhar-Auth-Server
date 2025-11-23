import mongoose from 'mongoose';

export const connectDb = () =>
  mongoose
    .connect(process.env.MONGO_DB_URI)
    .then(() => console.log('Database connected successfully.'))
    .catch((error) => console.error('Database connection failed: ', error));
