const cacheName='churchcare-shell-v2';
const shell=['/','/styles.css','/app.js','/icons.js','/manifest.webmanifest','/icon-192.png','/icon-512.png','/dm-sans.woff2','/manrope.woff2'];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(cacheName).then(cache=>cache.addAll(shell)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('churchcare-shell-')&&key!==cacheName).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==self.location.origin||!shell.includes(url.pathname))return;
  event.respondWith(fetch(event.request).catch(()=>caches.match(url.pathname)));
});
self.addEventListener('push',event=>{
  let payload={};
  try{payload=event.data?.json() || {};}catch{}
  event.waitUntil(self.registration.showNotification(payload.title || 'ChurchCare',{
    body:payload.body || 'Open ChurchCare for details.',tag:payload.tag,icon:'/icon-192.png'
  }));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(clients=>{
    const open=clients.find(client=>new URL(client.url).origin===self.location.origin);
    return open ? open.focus() : self.clients.openWindow('/');
  }));
});
