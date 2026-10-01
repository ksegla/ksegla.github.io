'use strict';
// The app, art, fonts and demo audio are embedded in one HTML response. Family
// recordings are kept separately in IndexedDB and never pass through this worker.
const VERSION='e56edf3a9f1ee21f';
const PREFIX='dicoclip-alphabet-shell-';
const CACHE=PREFIX+VERSION;
const BASE=self.registration.scope;
const SHELL=new URL('./',BASE).href;
const FILES=['./','./manifest.webmanifest','./icon-192.png','./icon-512.png','./icon.svg'].map(p=>new URL(p,BASE).href);
async function broadcast(message){for(const client of await self.clients.matchAll({includeUncontrolled:true,type:'window'}))client.postMessage(message);}
async function complete(){const cache=await caches.open(CACHE);return (await Promise.all(FILES.map(url=>cache.match(url)))).every(Boolean);}
async function downloadAsset(url){
 const response=await fetch(new Request(url,{cache:'reload',credentials:'same-origin'}));
 if(!response.ok||response.type==='opaque')throw Error('Asset unavailable');
 if(url===SHELL){
  const html=await response.clone().text();
  // Do not mistake a sign-in/error page for the offline alphabet.
  if(!html.includes('<meta name="alphabet-build" content="'+VERSION+'">'))throw Error('Wrong application response');
 }else if(url.endsWith('.webmanifest')){
  const manifest=await response.clone().json();if(manifest.name!=='Mon alphabet en famille'||!manifest.icons?.length)throw Error('Wrong manifest');
 }else if(!response.headers.get('content-type')?.startsWith('image/'))throw Error('Wrong icon response');
 return response;
}
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 try{
  let done=0;
  for(const url of FILES){
   await cache.put(url,await downloadAsset(url));await broadcast({type:'CACHE_PROGRESS',done:++done,total:FILES.length});
  }
 }catch(error){await caches.delete(CACHE);await broadcast({type:'CACHE_FAILED'});throw error;}
 // Updates wait for the parent to choose them. First installation activates normally.
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 if(!await complete())throw Error('Incomplete offline installation');
 for(const key of await caches.keys())if(key.startsWith(PREFIX)&&key!==CACHE)await caches.delete(key);
 await self.clients.claim();
})()));
self.addEventListener('message',event=>{
 if(event.data?.type==='CHECK_OFFLINE')event.waitUntil(complete().then(ready=>event.ports[0]?.postMessage({type:'OFFLINE_STATUS',ready,version:VERSION})).catch(()=>event.ports[0]?.postMessage({type:'OFFLINE_STATUS',ready:false})));
 if(event.data?.type==='ACTIVATE_UPDATE')event.waitUntil(self.skipWaiting());
 if(event.data?.type==='REPAIR_OFFLINE')event.waitUntil((async()=>{
  try{
   const cache=await caches.open(CACHE);let done=0;
   for(const url of FILES){if(!await cache.match(url))await cache.put(url,await downloadAsset(url));await broadcast({type:'CACHE_PROGRESS',done:++done,total:FILES.length});}
   event.ports[0]?.postMessage({type:'OFFLINE_STATUS',ready:await complete(),version:VERSION});
  }catch(e){event.ports[0]?.postMessage({type:'OFFLINE_STATUS',ready:false});}
 })());
});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==new URL(BASE).origin)return;
 const navigation=request.mode==='navigate'&&(url.pathname===new URL(SHELL).pathname||url.pathname===new URL('index.html',BASE).pathname);
 const key=navigation?SHELL:new URL(url.pathname,BASE).href;
 if(!navigation&&!FILES.includes(key))return;
 event.respondWith((async()=>{
  const cached=await (await caches.open(CACHE)).match(key);
  if(cached)return cached;
  // Missing cache is never advertised as offline ready. An online session can
  // still function while the user retries preparation or the browser updates.
  return fetch(request);
 })());
});
