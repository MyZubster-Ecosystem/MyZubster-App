export const directTransport = {
  name: 'direct',
  
  async request(url, options) {
    return fetch(url, options);
  },
  
  async isAvailable() {
    return true;
  },
};