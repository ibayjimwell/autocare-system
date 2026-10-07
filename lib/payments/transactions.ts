export const paymentTransactionsApi = {
  list: async (q = '') => {
    const res = await fetch(`/api/payments/transactions${q ? `?q=${encodeURIComponent(q)}` : ''}`, { cache: 'no-store' });
    return res.json();
  },
};
