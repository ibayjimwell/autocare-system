// utils/sms.ts
import HttpSms from 'httpsms';

// Get your API key from https://httpsms.com/settings
const API_KEY = process.env.HTTPSMS_API_KEY!;

// The phone number registered in your httpSMS Android app
// (the "from" number – this must match the SIM in your Android phone)
const FROM_NUMBER = process.env.HTTPSMS_FROM_NUMBER!;

// Initialize the httpSMS client
const client = new HttpSms(API_KEY);

export async function sendSMS(to: string, message: string) {
  try {
    // Send the SMS via the Android gateway
    const result = await client.messages.postSend({
      content: message,
      from: FROM_NUMBER,   // The phone number of your Android phone
      to: to,              // The recipient's phone number
    });

    console.log(`✅ SMS sent to ${to}, message ID: ${result.id}`);
    return result;
  } catch (error) {
    console.error('❌ SMS send error:', error);

    // For development, log the OTP instead of failing
    console.log(`📱 OTP for ${to}: ${message}`);

    // Re-throw so the caller can handle it
    throw error;
  }
}