/* Camada de dados: Dexie.js (IndexedDB). Se vendor/dexie.min.js não existir (ex.: build offline),
   usa um shim mínimo com a MESMA API (add/put/get/delete/clear/toArray/bulkAdd/bulkPut), também sobre IndexedDB. */
(function () {
  const SCHEMA = { kv:'key', profileLog:'++id', goals:'++id', weights:'++id,date', foods:'++id', plan:'++id,wd',
    foodlog:'++id,date', workouts:'++id,day', sessions:'++id,date', water:'++id,date', steps:'date', habits:'++id', habitlog:'key,date' };
  window.SCHEMA = SCHEMA;
  function shim() {
    const open = new Promise((res, rej) => {
      const r = indexedDB.open('saude-e-treino', 1);
      r.onupgradeneeded = () => { const d = r.result;
        for (const [n, s] of Object.entries(SCHEMA)) { const [pk, ...ix] = s.split(',');
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
      clear: () => run(n, 'readwrite', s => s.clear()), toArray: () => run(n, 'readonly', s => s.getAll()),
      bulkAdd: a => run(n, 'readwrite', s => { a.forEach(v => s.add(v)); }),
      bulkPut: a => run(n, 'readwrite', s => { a.forEach(v => s.put(v)); }) }));
    const db = { tables, transaction: (m, t, fn) => fn() }; tables.forEach(t => (db[t.name] = t)); return db;
  }
  if (window.Dexie) { const d = new Dexie('saude-e-treino'); d.version(1).stores(SCHEMA); window.db = d; window.DB_ENGINE = 'Dexie ' + Dexie.semver; }
  else { window.db = shim(); window.DB_ENGINE = 'IndexedDB (shim com API Dexie — rode scripts/get-dexie.sh para usar o Dexie real)'; }
})();
