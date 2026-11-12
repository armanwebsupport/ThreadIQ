/* ThreadIQ local-first database. IndexedDB is used with a localStorage fallback. */
const ThreadDB = (() => {
  const DB_NAME = "threadiq-db";
  const STORE = "records";
  let dbPromise;
  function openDB() {
    if (!("indexedDB" in window)) return Promise.resolve(null);
    if (!dbPromise) dbPromise = new Promise(resolve => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "key" });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });
    return dbPromise;
  }
  async function get(key, fallback) {
    const db = await openDB();
    if (!db) {
      try { const v = localStorage.getItem("threadiq:" + key); return v ? JSON.parse(v) : fallback; }
      catch { return fallback; }
    }
    return new Promise(resolve => {
      const req = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result ? req.result.value : fallback);
      req.onerror = () => resolve(fallback);
    });
  }
  async function set(key, value) {
    const db = await openDB();
    if (!db) { localStorage.setItem("threadiq:" + key, JSON.stringify(value)); return; }
    return new Promise(resolve => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put({key, value});
      tx.oncomplete = () => resolve();
      tx.onerror = () => { try { localStorage.setItem("threadiq:" + key, JSON.stringify(value)); } catch {} resolve(); };
    });
  }
  return { get, set };
})();
