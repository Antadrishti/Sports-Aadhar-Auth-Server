import dotenv from 'dotenv';

dotenv.config();

const DEFAULT_SMS_URL = 'https://rest.nexmo.com/sms/json';
const DEFAULT_FROM = 'SportsAadhar';
const DEFAULT_TEMPLATE = 'Your verification code is {{OTP}}';

const buildOtpMessage = (otp, template = DEFAULT_TEMPLATE) =>
  (template || DEFAULT_TEMPLATE).replace('{{OTP}}', otp).replace('{{CODE}}', otp);

export const sendOtpViaVonage = async (phone, otp) => {
  if (typeof fetch !== 'function') {
    throw new Error('fetch is unavailable; use Node 18+ or add a fetch polyfill');
  }


  const isProd = process.env.NODE_ENV === 'production';
  const apiKey = process.env.VONAGE_API_KEY;
  const apiSecret = process.env.VONAGE_API_SECRET;
  const from = process.env.VONAGE_FROM || DEFAULT_FROM;
  const smsUrl = process.env.VONAGE_SMS_URL || DEFAULT_SMS_URL;
  const smsTemplate = process.env.SMS_TEMPLATE || DEFAULT_TEMPLATE;

  if (!apiKey || !apiSecret) {
    const reason = 'Missing VONAGE_API_KEY or VONAGE_API_SECRET';
    if (isProd) throw new Error(reason);
    const result = { skipped: true, reason };
    console.warn(`Vonage SMS skipped: ${reason}`);
    return result;
  }

  const response = await fetch(smsUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      api_secret: apiSecret,
      from,
      to: phone,
      text: buildOtpMessage(otp, smsTemplate),
      type: 'text',
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    const error = new Error(`Vonage SMS failed (${response.status}): ${text}`);
    error.status = response.status;
    error.body = text;
    throw error;
  }

  const data = await response.json().catch(() => ({}));
  const messages = data.messages || [];
  if (!isProd) {
    console.log('Vonage SMS debug:', { to: phone, messages });
  }
  const failed = messages.find((m) => m.status && m.status !== '0');
  if (failed) {
    const error = new Error(`Vonage SMS failed: ${failed['error-text'] || failed.status}`);
    error.details = failed;
    throw error;
  }

  return { ok: true, data: isProd ? undefined : data };
};
