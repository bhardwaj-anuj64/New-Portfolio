import { getVapidPublicKey, subscribeDevicePush } from './api'

function urlBase64ToUint8Array(base64Url: string): Uint8Array {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4)
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window
}

/** Registers this browser/device to receive future admin OTPs via Web Push. Requires an
 * authenticated admin token — see AdminChallengeController.Subscribe for why. */
export async function registerDevicePush(token: string): Promise<{ ok: boolean; message: string }> {
  if (!isPushSupported()) {
    return { ok: false, message: 'Push notifications are not supported in this browser.' }
  }

  const publicKey = await getVapidPublicKey()
  if (!publicKey) {
    return { ok: false, message: 'Server has no VAPID key configured yet.' }
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    return { ok: false, message: 'Notification permission was denied.' }
  }

  // register() resolves once the registration exists, not once the worker is active —
  // subscribe() needs an active worker, so wait on serviceWorker.ready instead.
  await navigator.serviceWorker.register('/sw.js')
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
  })

  const json = subscription.toJSON()
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return { ok: false, message: 'Browser returned an incomplete subscription.' }
  }

  const success = await subscribeDevicePush(token, {
    endpoint: json.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
  })

  return success
    ? { ok: true, message: 'Device registered for push OTP delivery.' }
    : { ok: false, message: 'Server rejected the subscription.' }
}
