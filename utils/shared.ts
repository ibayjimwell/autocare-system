import { NextRequest } from "next/server";
import bcrypt from 'bcrypt';

/**
 * Returns the data of a form entries as an object.
 * @param req - The Next.js request object containing form data.
 * @returns A Promise resolving to the form data as an object.
 */
export const getFormDataEntries = async (req: NextRequest) => {
  const formData = await req.formData();
  let data;
  
  try {
    data = Object.fromEntries(formData.entries());
    return data;
  } catch (e) {
    throw new Error(`Failed to get form data entries: ${e}`);
  }
}

/**
 * Hashes a plain text password.
 * @param password - The plain text password to hash.
 * @returns A Promise resolving to the hashed password (includes salt).
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  return hashedPassword;
}

/**
 * Validates a plain text password against a stored hash.
 * @param password - The plain text password to check.
 * @param hashedPassword - The previously hashed password.
 * @returns A Promise resolving to `true` if the password matches, otherwise `false`.
 */
export async function validatePassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  const isValid = await bcrypt.compare(password, hashedPassword);
  return isValid;
}

/**
 * Validates password strength.
 * Requirements:
 * - Minimum 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 * - At least 1 special character (e.g., !@#$%^&*)
 * 
 * @param password - The plain text password to validate
 * @returns An object: { isValid: boolean, errors: string[] }
 */
export function validatePasswordStrength(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!password || typeof password !== 'string') {
    errors.push("Password is required.");
    return { isValid: false, errors };
  }

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long.");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter.");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter.");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number.");
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push("Password must contain at least one special character (e.g., !@#$%^&*).");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates if a string is a valid UUID.
 */
export function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}