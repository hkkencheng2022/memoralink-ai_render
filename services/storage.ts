
const DB_NAME = 'MemoraLinkDB';
const DB_VERSION = 1;
const STORE_NAME = 'appData';

// Open (or create) the database
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => {
      console.error("IndexedDB error:", request.error);
      reject(request.error);
    };
    
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
};

export const storage = {
  /**
   * Get value from IDB. 
   * Includes automatic migration from localStorage if IDB is empty but localStorage has data.
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const db = await openDB();
      const result = await new Promise<T | undefined>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      if (result !== undefined) {
        return result;
      }

      // Fallback: Check localStorage and migrate if found
      const localData = localStorage.getItem(key);
      if (localData) {
        console.log(`Migrating ${key} from localStorage to IndexedDB...`);
        try {
          const parsed = JSON.parse(localData);
          await this.set(key, parsed);
          // Optional: Clear localStorage to free up quota, or keep as backup until confirmed
          // localStorage.removeItem(key); 
          return parsed;
        } catch (e) {
          console.error(`Failed to migrate ${key}`, e);
          return null;
        }
      }
      
      return null;
    } catch (error) {
      console.error(`Storage get error for ${key}:`, error);
      return null;
    }
  },

  /**
   * Save value to IDB.
   * Supports large objects (images, large lists) that exceed localStorage limits.
   */
  async set(key: string, value: any): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(value, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async remove(key: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(key);
      request.onsuccess = () => {
        // Also clear localStorage to ensure consistency
        localStorage.removeItem(key);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  },
  
  async clearAll(): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
       const tx = db.transaction(STORE_NAME, 'readwrite');
       const store = tx.objectStore(STORE_NAME);
       const request = store.clear();
       request.onsuccess = () => {
         localStorage.clear();
         resolve();
       };
       request.onerror = () => reject(request.error);
    });
  }
};
