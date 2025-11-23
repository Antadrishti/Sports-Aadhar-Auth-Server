import jwt from 'jsonwebtoken';

export const signToken = (user) =>
  jwt.sign({ id: user._id, email: user.email }, process.env.SECRET, {
    expiresIn: '7d',
  });
