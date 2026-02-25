// Enhanced storage management
class EnhancedStorage {
  constructor() {
    this.data = new Map();
  }

  set(key, value) {
    this.data.set(key, value);
    return true;
  }

  get(key) {
    return this.data.get(key);
  }

  has(key) {
    return this.data.has(key);
  }

  delete(key) {
    return this.data.delete(key);
  }

  clear() {
    this.data.clear();
  }

  size() {
    return this.data.size;
  }

  keys() {
    return Array.from(this.data.keys());
  }

  values() {
    return Array.from(this.data.values());
  }

  entries() {
    return Array.from(this.data.entries());
  }
}

module.exports = { EnhancedStorage };
