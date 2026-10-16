var CACHE_NAME = 'sy-pos-shell-v5';
var SHELL_FILES = [
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];
// ໄຟລ໌ທີ່ຕ້ອງເອົາອັນໃໝ່ສຸດສະເໝີ (network-first) ເພາະແກ້ໄຂເລື້ອຍໆ
var NETWORK_FIRST = ['./', './index.html'];

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

function isNetworkFirst(url){
  for (var i = 0; i < NETWORK_FIRST.length; i++) {
    if (url.indexOf(NETWORK_FIRST[i].replace('./', '')) !== -1 || url.slice(-1) === '/') return true;
  }
  return false;
}

// ບໍ່ cache ການເອີ້ນ API (ໄປ Apps Script ສະເໝີ, ບໍ່ເອົາຂໍ້ມູນເກົ່າຄືນ)
self.addEventListener('fetch', function(event){
  var url = event.request.url;
  if (url.indexOf('script.google.com') !== -1) return; // ປ່ອຍຜ່ານ, ບໍ່ແຊກແຊງ

  // ໜ້າຫຼັກ (index.html): ເອົາເຄືອຂ່າຍກ່ອນສະເໝີ ເພື່ອບໍ່ໃຫ້ຕິດແຄັດໜ້າເກົ່າເມື່ອອັບເດດແອັບ, offline ຄ່ອຍໃຊ້ cache
  if (event.request.mode === 'navigate' || isNetworkFirst(url)) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).then(function(resp){
        if (resp && resp.status === 200) {
          var respClone = resp.clone();
          caches.open(CACHE_NAME).then(function(cache){ cache.put(event.request, respClone); });
        }
        return resp;
      }).catch(function(){
        return caches.match(event.request).then(function(cached){ return cached || caches.match('./index.html'); });
      })
    );
    return;
  }

  // ໄຟລ໌ static ອື່ນໆ (icon, manifest): cache ກ່ອນ ເພື່ອໄວ ແລະ ໃຊ້ offline ໄດ້
  event.respondWith(
    caches.match(event.request).then(function(cached){
      if (cached) return cached;
      return fetch(event.request).then(function(resp){
        if (event.request.method === 'GET' && resp && resp.status === 200) {
          var respClone = resp.clone();
          caches.open(CACHE_NAME).then(function(cache){ cache.put(event.request, respClone); });
        }
        return resp;
      });
    })
  );
});
