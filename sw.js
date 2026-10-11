var CACHE_NAME = 'sy-pos-shell-v1';
var SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', function(event){
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){ return cache.addAll(SHELL_FILES); })
  );
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE_NAME; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

// ບໍ່ cache ການເອີ້ນ API (ໄປ Apps Script ສະເໝີ, ບໍ່ເອົາຂໍ້ມູນເກົ່າຄືນ)
self.addEventListener('fetch', function(event){
  var url = event.request.url;
  if (url.indexOf('script.google.com') !== -1) return; // ປ່ອຍຜ່ານ, ບໍ່ແຊກແຊງ

  event.respondWith(
    caches.match(event.request).then(function(cached){
      if (cached) return cached;
      return fetch(event.request).then(function(resp){
        if (event.request.method === 'GET' && resp && resp.status === 200) {
          var respClone = resp.clone();
          caches.open(CACHE_NAME).then(function(cache){ cache.put(event.request, respClone); });
        }
        return resp;
      }).catch(function(){
        return caches.match('./index.html');
      });
    })
  );
});
