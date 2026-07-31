const storage = new Map();

module.exports = {
  getItem: async key => (storage.has(key) ? storage.get(key) : null),
  setItem: async (key, value) => { storage.set(key, value); },
  removeItem: async key => { storage.delete(key); },
  getAllKeys: async () => Array.from(storage.keys()),
  multiRemove: async keys => { keys.forEach(key => storage.delete(key)); },
  __reset: () => { storage.clear(); },
};
