// Call while NextAuth is still signed in, before signOut(). The browser's
// subscription is intentionally kept locally, so the next staff account can
// safely reassign that endpoint on login.
export async function releaseStaffPushSubscription() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.getRegistration('/');
    const subscription = await registration?.pushManager?.getSubscription();
    if (!subscription) return;
    await fetch('/api/push-subscriptions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
      keepalive: true,
    });
  } catch (error) {
    // Logout must still work without connectivity.
    console.warn('[StaffPush] Could not release subscription before sign out:', error);
  }
}
