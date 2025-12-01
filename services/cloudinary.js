import crypto from 'crypto';

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;
const UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET;

const signParams = (params, apiSecret) => {
  const toSign = Object.keys(params)
    .filter((key) => params[key] !== undefined && params[key] !== null && params[key] !== '')
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
  return crypto.createHash('sha1').update(toSign + apiSecret).digest('hex');
};

const ensureConfig = () => {
  if (!CLOUD_NAME || !API_KEY) {
    throw new Error('Missing CLOUDINARY_CLOUD_NAME or CLOUDINARY_API_KEY');
  }
  if (!API_SECRET && !UPLOAD_PRESET) {
    throw new Error('Provide CLOUDINARY_API_SECRET for signed uploads or CLOUDINARY_UPLOAD_PRESET for unsigned uploads');
  }
};

export const uploadToCloudinary = async (file, { folder = 'profiles', publicId } = {}) => {
  ensureConfig();
  if (!file || typeof file !== 'string') {
    throw new Error('Invalid file payload');
  }
  const timestamp = Math.round(Date.now() / 1000);
  const params = {
    timestamp,
    folder,
    public_id: publicId,
    overwrite: true,
  };

  const body = new URLSearchParams();
  body.append('file', file);
  body.append('api_key', API_KEY);
  body.append('timestamp', timestamp);
  if (folder) body.append('folder', folder);
  if (publicId) body.append('public_id', publicId);
  body.append('overwrite', 'true');

  if (API_SECRET) {
    const signature = signParams(params, API_SECRET);
    body.append('signature', signature);
  } else if (UPLOAD_PRESET) {
    body.append('upload_preset', UPLOAD_PRESET);
  }

  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
  const response = await fetch(url, { method: 'POST', body });
  if (!response.ok) {
    const text = await response.text();
    const error = new Error(`Cloudinary upload failed (${response.status}): ${text}`);
    error.status = response.status;
    throw error;
  }
  const data = await response.json();
  return {
    url: data.secure_url || data.url,
    publicId: data.public_id,
    version: data.version,
    resourceType: data.resource_type,
  };
};
