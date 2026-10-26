const CACHE='yasir-nintendo-shell-v9';
const ROOT=new URL('./',self.location).href;
const SHELL=['./','./index.html','./styles.css','./journey.css','./world.css','./chronicle.js','./nintendo-world.js','./nintendo-world-ui.js','./nintendo-world.json','./journey.js','./adventure-ui.js','./app.js','./native-android.js','./sync-ui.js','./legacy-library.js','./library-seed.json','./core.js','./nintendo-sync.js','./catalog.json','./manifest.webmanifest','./assets/icon.svg','./assets/icon-192.png','./assets/icon-512.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(async cache=>{await cache.addAll(SHELL);const seed=await (await cache.match('./library-seed.json')).json();await cache.addAll([...new Set(seed.items.map(g=>g.cover))]);await self.skipWaiting();}));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('yasir-nintendo-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const url=new URL(event.request.url);
 if(url.origin!==self.location.origin||!url.href.startsWith(ROOT))return;
 if(url.pathname.endsWith('/nintendo-world.json')){event.respondWith(fetch(event.request).then(async response=>{if(response.ok){const cache=await caches.open(CACHE);await cache.put(new URL('./nintendo-world.json',ROOT).href,response.clone());return response;}throw Error('public_news_unavailable');}).catch(()=>caches.match(new URL('./nintendo-world.json',ROOT))));return;}
 if(event.request.mode==='navigate'){
  event.respondWith(fetch(event.request).then(response=>response.ok?response:caches.match(new URL('./index.html',ROOT))).catch(()=>caches.match(new URL('./index.html',ROOT))));return;
 }
 event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)));
});
