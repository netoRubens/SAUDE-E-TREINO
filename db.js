/* Camada de dados: Dexie.js (IndexedDB). Se vendor/dexie.min.js não existir (ex.: build offline),
   usa um shim mínimo com a MESMA API (add/put/get/delete/clear/toArray/bulkAdd/bulkPut), também sobre IndexedDB. */
(function () {
  const SCHEMA = { kv:'key', profileLog:'++id', goals:'++id', weights:'++id,date', foods:'++id', plan:'++id,wd',
    foodlog:'++id,date', workouts:'++id,day', sessions:'++id,date', water:'++id,date', steps:'date', habits:'++id', habitlog:'key,date', activities:'++id,date' };
  const V1 = { ...SCHEMA }; delete V1.activities; // v1 = sem corridas; v2 = com `activities`
  window.SCHEMA = SCHEMA;
  function shim() {
    const open = new Promise((res, rej) => {
      const r = indexedDB.open('saude-e-treino', 20); // 20 = mesma versão interna do Dexie para version(2)
      r.onupgradeneeded = () => { const d = r.result;
        for (const [n, s] of Object.entries(SCHEMA)) { if (d.objectStoreNames.contains(n)) continue; const [pk, ...ix] = s.split(',');
          const st = d.createObjectStore(n, pk.startsWith('++') ? { keyPath: pk.slice(2), autoIncrement: true } : { keyPath: pk });
          ix.forEach(i => st.createIndex(i, i)); } };
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
    const run = (n, mode, fn) => open.then(d => new Promise((res, rej) => {
      const t = d.transaction(n, mode); let out; const rq = fn(t.objectStore(n));
      if (rq) rq.onsuccess = () => (out = rq.result);
      t.oncomplete = () => res(out); t.onerror = t.onabort = () => rej(t.error); }));
    const tables = Object.keys(SCHEMA).map(n => ({ name: n,
      add: v => run(n, 'readwrite', s => s.add(v)), put: v => run(n, 'readwrite', s => s.put(v)),
      get: k => run(n, 'readonly', s => s.get(k)), delete: k => run(n, 'readwrite', s => s.delete(k)),
      clear: () => run(n, 'readwrite', s => s.clear()), count: () => run(n, 'readonly', s => s.count()), toArray: () => run(n, 'readonly', s => s.getAll()),
      bulkAdd: a => run(n, 'readwrite', s => { a.forEach(v => s.add(v)); }),
      bulkPut: a => run(n, 'readwrite', s => { a.forEach(v => s.put(v)); }) }));
    const db = { tables, transaction: (m, t, fn) => fn() }; tables.forEach(t => (db[t.name] = t)); return db;
  }
  if (window.Dexie) { const d = new Dexie('saude-e-treino'); d.version(1).stores(V1); d.version(2).stores(SCHEMA); window.db = d; window.DB_ENGINE = 'Dexie ' + Dexie.semver; }
  else { window.db = shim(); window.DB_ENGINE = 'IndexedDB (shim com API Dexie — rode scripts/get-dexie.sh para usar o Dexie real)'; }

  /* Preparação para sincronização (sem mudar o esquema): todo registro ganha `uid` (UUID estável entre aparelhos) e `updatedAt`;
     exclusões ficam registradas em kv:"tombstones" para serem propagadas depois. */
  const SYNC=['profileLog','goals','weights','foods','plan','foodlog','workouts','sessions','water','habits','activities'];
  const uuid=()=>crypto.randomUUID?crypto.randomUUID():'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0;return(c==='x'?r:r&3|8).toString(16)});
  const stamp=r=>{if(r&&typeof r==='object'){r.uid=r.uid||uuid();r.updatedAt=Date.now()}};
  const db=window.db;window.SYNC_TABLES=SYNC;
  const tomb=async(t,uid,key)=>{const cur=(await db.kv.get('tombstones'))?.items||[];cur.push({t,uid,key,at:Date.now()});await db.kv.put({key:'tombstones',items:cur.slice(-5000)})};
  const KVSYNC=['profile','settings','mealTemplates','gear','runPlan','routes'],KEYED=['steps','habitlog'];window.KVSYNC=KVSYNC;
  for(const t of db.tables){
    if(t.name==='kv'){const op=t.put.bind(t);t.raw={put:op,get:t.get.bind(t),delete:t.delete.bind(t)};t.put=r=>{if(r&&KVSYNC.includes(r.key))r.updatedAt=Date.now();return op(r)};continue}
    const sync=SYNC.includes(t.name),keyed=KEYED.includes(t.name),o={add:t.add.bind(t),put:t.put.bind(t),del:t.delete.bind(t),get:t.get.bind(t)};
    t.raw={add:o.add,put:o.put,delete:o.del,get:o.get};   // sem carimbo/tombstone: usado pela sincronização ao aplicar dados remotos
    t.add=r=>{if(sync)stamp(r);else if(keyed)r.updatedAt=Date.now();return o.add(r)};
    t.put=async r=>{if(sync){if(!r.uid&&r.id!=null){const old=await o.get(r.id);if(old?.uid)r.uid=old.uid}stamp(r)}else if(keyed)r.updatedAt=Date.now();return o.put(r)};
    t.delete=async k=>{const old=await o.get(k);if(old){let uid=old.uid||null,key=uid?null:k;
      if(t.name==='habitlog'){const h=await db.habits.get(old.habitId);if(!h?.uid)return o.del(k);uid=old.date+'|'+h.uid;key=null}
      await tomb(t.name,uid,key)}return o.del(k)}}
  window.syncPrep=async()=>{for(const n of SYNC){for(const r of await db[n].toArray())if(!r.uid)await db[n].put(r)}}; // preenche uid em dados antigos / backups antigos
})();
