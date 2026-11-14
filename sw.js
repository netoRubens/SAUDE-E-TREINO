const V='satori-v6';
const FILES=['./','index.html','styles.css','db.js','config.js','sync.js','app.js','core/running.js','core/analysis.js','manifest.webmanifest','icons/icon.svg','icons/icon-192.png','icons/icon-512.png','icons/favicon-32.png','vendor/dexie.min.js','templates/satori-modelo-treino.xlsx','templates/satori-modelo-treino.csv'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>Promise.all(FILES.map(f=>c.add(f).catch(()=>{})))).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
// Rede primeiro (arquivos novos chegam sem precisar mudar a versão); cache só como reserva offline/lenta.
// Os dados do usuário ficam no IndexedDB e não são tocados por atualizações.
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET'||new URL(r.url).origin!==location.origin)return;
 e.respondWith((async()=>{const c=await caches.open(V);try{const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),4000);const res=await fetch(r,{signal:ctl.signal,cache:'no-cache'});clearTimeout(t);if(res.ok)c.put(r,res.clone());return res}catch{return(await c.match(r,{ignoreSearch:true}))||(r.mode==='navigate'?await c.match('index.html'):Response.error())}})())});
