export const OTP_EXPIRATION_MINUTES = 5;
export const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();
export const looksLikeEmail = (value = '') => /\S+@\S+\.\S+/.test(value);
