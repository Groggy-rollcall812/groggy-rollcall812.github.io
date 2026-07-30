/* Service Worker：让工作台在没网时也能打开
   ------------------------------------------------------------
   策略：网络优先，成功就顺手更新缓存；失败回落到缓存。
   这样既不会看到过期页面，断网时也还能用。
   改了文件后如果手机上还是旧的，把下面版本号 +1 再 push。
*/
const VERSION = 'v1';
const CACHE = 'workbench-' + VERSION;

const PRECACHE = [
  './',
  './index.html',
  './theme.css',
  './tools.js',
  './manifest.json',
  './icons/icon-192.png',
  './tools/notes/',
  './tools/notes/index.html'
];

self.addEventListener('install', e => {
  e.waitUntil(
    // 单个文件 404 不该让整次安装失败，所以逐个 add
    caches.open(CACHE)
      .then(c => Promise.allSettled(PRECACHE.map(u => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then(hit => hit || caches.match('./index.html')))
  );
});
