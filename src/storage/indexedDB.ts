/**
 * Dual Storage Engine: OPFS (Origin Private File System) + IndexedDB Fallback.
 * Raw binary payloads write directly to standard browser disk files via OPFS
 * (navigator.storage.getDirectory()) when supported, or fall back to IndexedDB.
 */

const DB_NAME = 'eventide-universe';
const STORE = 'payloads';
let dbPromise: Promise<IDBDatabase> | null = null;

export function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Failed to open database'));
  });
  return dbPromise;
}

/** Check if Origin Private File System (OPFS) is available in current browser */
export function hasOpfs(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.storage && typeof navigator.storage.getDirectory === 'function';
}

async function getOpfsRoot(): Promise<FileSystemDirectoryHandle | null> {
  if (!hasOpfs()) return null;
  try {
    return await navigator.storage.getDirectory();
  } catch {
    return null;
  }
}

export async function putPayload(id: string, blob: Blob): Promise<void> {
  const root = await getOpfsRoot();
  if (root) {
    try {
      const fileHandle = await root.getFileHandle(`payload-${id}.bin`, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch {
      // Fallback to IndexedDB if OPFS write fails
    }
  }

  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(blob, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB put payload failed'));
  });
}

export async function getPayload(id: string): Promise<Blob | null> {
  const root = await getOpfsRoot();
  if (root) {
    try {
      const fileHandle = await root.getFileHandle(`payload-${id}.bin`);
      const file = await fileHandle.getFile();
      return file;
    } catch {
      // Fallback to IndexedDB if OPFS read fails or file not in OPFS
    }
  }

  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => resolve((req.result as Blob) ?? null);
    req.onerror = () => reject(tx.error ?? new Error('IndexedDB get payload failed'));
  });
}

export async function delPayload(id: string): Promise<void> {
  const root = await getOpfsRoot();
  if (root) {
    try {
      await root.removeEntry(`payload-${id}.bin`);
    } catch {
      // Ignore missing entry error in OPFS
    }
  }

  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB delete payload failed'));
  });
}

/** Returns true when the browser environment supports IndexedDB storage */
export function hasIdb(): boolean {
  return typeof indexedDB !== 'undefined';
}

