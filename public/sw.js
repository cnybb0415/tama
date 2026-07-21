// 웹 푸시 알림용 서비스워커. 캐싱/오프라인 지원은 하지 않고 푸시 수신/클릭만 처리합니다.

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  let payload = { title: '다마고치', body: '알림이 있어요!', url: '/select' }
  if (event.data) {
    try { payload = { ...payload, ...event.data.json() } } catch { payload.body = event.data.text() }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/picture/tamagotchi/tamagotchi.png',
      badge: '/picture/tamagotchi/tamagotchi.png',
      data: { url: payload.url },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/select'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && 'focus' in client) return client.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow(url)
    })
  )
})
