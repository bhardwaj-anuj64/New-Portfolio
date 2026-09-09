// Minimal push receiver for admin OTP delivery — no caching/offline logic, this is not a PWA.
self.addEventListener('push', (event) => {
  const body = event.data ? event.data.text() : 'New admin OTP issued.'
  event.waitUntil(self.registration.showNotification('Gateway Admin Access', { body }))
})
