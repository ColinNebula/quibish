// Simple Service Worker for testing
const CACHE_NAME = 'quibish-simple-v1.0.0';

self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Just pass through all requests for now
  event.respondWith(fetch(event.request));
});

console.log('Service Worker: Script loaded successfully');