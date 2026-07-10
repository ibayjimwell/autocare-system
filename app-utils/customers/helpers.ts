// app-utils/customers/helpers.ts
export const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
export const validatePhone = (phone: string) => /^\+?[0-9]{7,15}$/.test(phone);

export const generateTempPassword = (fullname: string): string => {
  const firstName = fullname.trim().split(' ')[0]?.toLowerCase() || 'cust';
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${firstName}${random}`;
};