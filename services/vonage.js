const VONAGE_SMS_URL = process.env.VONAGE_SMS_URL || 'https://rest.nexmo.com/sms/json';
const VONAGE_API_KEY = process.env.VONAGE_API_KEY;
const VONAGE_API_SECRET = process.env.VONAGE_API_SECRET;
const VONAGE_FROM = process.env.VONAGE_FROM || 'SportsAadhar';
const SMS_TEMPLATE = process.env.SMS_TEMPLATE || 'Your verification code is {{OTP}}';

const buildOtpMessage = (otp) => SMS_TEMPLATE.replace('{{OTP}}', otp).replace('{{CODE}}', otp);

export const sendOtpViaVonage = async (phone, otp) => {
  if (typeof fetch !== 'function') {
    throw new Error('fetch is unavailable; use Node 18+ or add a fetch polyfill');
  }

  if (!VONAGE_API_KEY || !VONAGE_API_SECRET) {
    const reason = 'Missing VONAGE_API_KEY or VONAGE_API_SECRET';
    if (process.env.NODE_ENV === 'production') throw new Error(reason);
    console.warn(`Vonage SMS skipped: ${reason}`);
    return { skipped: true };
  }

  const response = await fetch(VONAGE_SMS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: VONAGE_API_KEY,
      api_secret: VONAGE_API_SECRET,
      from: VONAGE_FROM,
      to: phone,
      text: buildOtpMessage(otp),
      type: 'text',
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Vonage SMS failed (${response.status}): ${text}`);
  }

  const data = await response.json().catch(() => ({}));
  const messages = data.messages || [];
  const failed = messages.find((m) => m.status && m.status !== '0');
  if (failed) {
    throw new Error(`Vonage SMS failed: ${failed['error-text'] || failed.status}`);
  }

  return { ok: true };
};
