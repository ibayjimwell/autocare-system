import HttpSms from 'httpsms';

import {
  normalizePhilippinePhone,
  isValidPhilippinePhone,
} from '@/utils/phone';

/**
 * Send SMS through the EXISTING httpSMS Android gateway.
 *
 * HTTPSMS_API_KEY and HTTPSMS_FROM_NUMBER belong on the AutoCare Web
 * server (for example Vercel environment variables), never in Expo.
 *
 * The client is instantiated after checking configuration so missing
 * SMS credentials cannot cause unrelated push notification imports
 * to fail at module load time.
 */
export async function sendSMS(to: string, message: string) {
  const normalizedTo = normalizePhilippinePhone(to);

  if (!isValidPhilippinePhone(normalizedTo)) {
    throw new Error('Invalid Philippine destination phone number.');
  }

  if (typeof message !== 'string' || !message.trim()) {
    throw new Error('SMS message cannot be empty.');
  }

  const apiKey = process.env.HTTPSMS_API_KEY;
  const fromNumber = process.env.HTTPSMS_FROM_NUMBER;

  if (!apiKey) {
    throw new Error('HTTPSMS_API_KEY is not configured.');
  }
  if (!fromNumber) {
    throw new Error('HTTPSMS_FROM_NUMBER is not configured.');
  }

  const client = new HttpSms(apiKey);

  try {
    const result = await client.messages.postSend({
      content: message.trim(),
      from: fromNumber,
      to: normalizedTo,
    });

    // httpSMS accepting a send request does not guarantee handset delivery.
    console.info('[httpSMS] Message submitted:', result?.id || 'no id');
    return result;
  } catch (error) {
    // Never print message content: this utility also sends sensitive OTPs.
    // Avoid logging full phone numbers and provider request credentials.
    console.error(
      '[httpSMS] SMS submission failed:',
      error instanceof Error ? error.message : 'Unknown provider error',
    );
    throw error;
  }
}
