const CACHE='yasir-nintendo-shell-v7';
const ROOT=new URL('./',self.location).href;
const SHELL=['./','./index.html','./styles.css','./journey.css','./journey.js','./adventure-ui.js','./app.js','./native-android.js','./sync-ui.js','./legacy-library.js','./library-seed.json','./core.js','./nintendo-sync.js','./catalog.json','./manifest.webmanifest','./assets/icon.svg','./assets/icon-192.png','./assets/icon-512.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(async cache=>{await cache.addAll(SHELL);const seed=await (await cache.match('./library-seed.json')).json();await cache.addAll([...new Set(seed.items.map(g=>g.cover))]);}));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('yasir-nintendo-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const url=new URL(event.request.url);
 if(url.origin!==self.location.origin||!url.href.startsWith(ROOT))return;
 if(event.request.mode==='navigate'){
  event.respondWith(fetch(event.request).then(response=>response.ok?response:caches.match(new URL('./index.html',ROOT))).catch(()=>caches.match(new URL('./index.html',ROOT))));return;
 }
 event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)));
});
