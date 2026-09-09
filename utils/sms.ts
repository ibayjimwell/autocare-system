// utils/sms.ts

import HttpSms from 'httpsms';

import {
  normalizePhilippinePhone,
  isValidPhilippinePhone,
} from '@/utils/phone';

// ------------------------------------------------------------------
// httpSMS configuration
// ------------------------------------------------------------------

const API_KEY =
  process.env.HTTPSMS_API_KEY;

const FROM_NUMBER =
  process.env.HTTPSMS_FROM_NUMBER;

if (!API_KEY) {
  console.warn(
    '[httpSMS] HTTPSMS_API_KEY is not configured.'
  );
}

if (!FROM_NUMBER) {
  console.warn(
    '[httpSMS] HTTPSMS_FROM_NUMBER is not configured.'
  );
}

const client =
  new HttpSms(API_KEY!);

// ------------------------------------------------------------------
// Send SMS
// ------------------------------------------------------------------
export async function sendSMS(
  to: string,
  message: string
) {
  const normalizedTo =
    normalizePhilippinePhone(to);

  if (
    !isValidPhilippinePhone(
      normalizedTo
    )
  ) {
    throw new Error(
      `Invalid Philippine phone number: ${to}`
    );
  }

  if (!message || message.trim() === '') {
    throw new Error(
      'SMS message cannot be empty.'
    );
  }

  if (!API_KEY) {
    throw new Error(
      'HTTPSMS_API_KEY is not configured.'
    );
  }

  if (!FROM_NUMBER) {
    throw new Error(
      'HTTPSMS_FROM_NUMBER is not configured.'
    );
  }

  try {
    console.log(
      `[httpSMS] Sending SMS to ${normalizedTo}`
    );

    const result =
      await client.messages.postSend({
        content:
          message.trim(),

        from:
          FROM_NUMBER,

        /*
         * httpSMS receives:
         *
         * +639157803417
         */
        to:
          normalizedTo,
      });

    console.log(
      `[httpSMS] SMS sent successfully. recipient=${normalizedTo}, messageId=${result.id}`
    );

    return result;
  } catch (error) {
    console.error(
      `[httpSMS] Failed to send SMS to ${normalizedTo}:`,
      error
    );

    /*
     * Development logging only.
     *
     * Do not rely on this as a production
     * SMS delivery mechanism.
     */
    console.log(
      `[httpSMS] OTP/message for ${normalizedTo}: ${message}`
    );

    throw error;
  }
}