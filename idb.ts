const DB_NAME = "world-domination";
const STORE_NAME = "sqlite-snapshots";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Failed to open IndexedDB"));
  });
}

/** Read a stored SQLite snapshot (raw bytes) from IndexedDB. */
export async function idbGet(key: string): Promise<Uint8Array | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).get(key);
    request.onsuccess = () => {
      const value = request.result as Uint8Array | undefined;
      resolve(value instanceof Uint8Array ? value : null);
      db.close();
    };
    request.onerror = () => {
      reject(request.error ?? new Error("Failed to read from IndexedDB"));
      db.close();
    };
  });
}

/** Persist a SQLite snapshot (raw bytes) into IndexedDB. */
export async function idbSet(key: string, value: Uint8Array): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(value, key);
    tx.oncomplete = () => {
      resolve();
      db.close();
    };
    tx.onerror = () => {
      reject(tx.error ?? new Error("Failed to write to IndexedDB"));
      db.close();
    };
  });
}
