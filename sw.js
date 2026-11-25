var CACHE_NAME = 'sy-pos-shell-v14';
var SHELL_FILES = [
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];
// ໄຟລ໌ທີ່ຕ້ອງເອົາອັນໃໝ່ສຸດສະເໝີ (network-first) ເພາະແກ້ໄຂເລື້ອຍໆ
var NETWORK_FIRST = ['./', './index.html'];

self.addEventListener('install', function(event){
  self.skipWaiting();
  // ອັບເດດຮອບ 16: ຕອນ SW ຕິດຕັ້ງ (ຫຼັງ deploy ໃໝ່ແຕ່ລະຄັ້ງ) ດຶງ index.html ມາແຄັດໄວ້ລ່ວງໜ້າທັນທີເລີຍ
  // (ບໍ່ລໍຖ້າໃຫ້ມີການເປີດແອັບຄັ້ງຕໍ່ໄປກ່ອນ) — ຖ້າຄົນເປີດແອັບອີກຄັ້ງໃນໄວໆນີ້ (ເຊັ່ນ: ປິດແລ້ວເປີດຄືນ
  // ເພື່ອທົດສອບ) ຈະໄດ້ແຄັດໃໝ່ທັນທີ ບໍ່ຕ້ອງລໍເຄືອຂ່າຍຊ້ຳອີກ. ແຍກອອກຈາກ SHELL_FILES ເພື່ອບໍ່ໃຫ້ລົ້ມເຫຼວ
  // ນຳກັນ (ຖ້າ icon/manifest ດຶງບໍ່ໄດ້ ກໍ່ບໍ່ກະທົບການແຄັດ index.html)
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      var shellPromise = cache.addAll(SHELL_FILES).catch(function(){});
      var indexPromise = fetch('./index.html', { cache: 'no-store' }).then(function(resp){
        if (resp && resp.status === 200) return cache.put('./index.html', resp.clone());
      }).catch(function(){});
      return Promise.all([shellPromise, indexPromise]);
    })
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
  // ໝາຍເຫດ (ແກ້ bug): ເກົ່າ .replace('./','') ເຮັດໃຫ້ './' ກາຍເປັນ string ຫວ່າງ ແລ້ວ indexOf('') == 0 ສະເໝີ
  // ເຮັດໃຫ້ຟັງຊັນນີ້ return true ທຸກ url ໂດຍບໍ່ຕັ້ງໃຈ (ບໍ່ແມ່ນບັນຫາໃຫຍ່ ເພາະ network-first ປອດໄພກວ່າ
  // ແຕ່ເຮັດໃຫ້ icon/manifest ບໍ່ໄດ້ປະໂຫຍດຈາກ cache-first ຕາມທີ່ຕັ້ງໃຈໄວ້) — ແກ້ໃຫ້ກວດຖືກຕ້ອງ
  if (url.slice(-1) === '/' || url.indexOf('/index.html') !== -1) return true;
  return false;
}

// ບໍ່ cache ການເອີ້ນ API (ໄປ Apps Script ສະເໝີ, ບໍ່ເອົາຂໍ້ມູນເກົ່າຄືນ)
self.addEventListener('fetch', function(event){
  var url = event.request.url;
  if (url.indexOf('script.google.com') !== -1) return; // ປ່ອຍຜ່ານ, ບໍ່ແຊກແຊງ

  // ອັບເດດຮອບ 14: ໜ້າຫຼັກ (index.html) ປ່ຽນຈາກ network-first ເປັນ stale-while-revalidate —
  // ຖ້າມີແຄັດຢູ່ແລ້ວ ສົ່ງແຄັດນັ້ນກັບຄືນທັນທີ (ເປີດແອັບໄວ ບໍ່ລໍເຄືອຂ່າຍ, ແກ້ "ບໍ່ໂຫຼດດົນ") ແລ້ວຄ່ອຍດຶງ
  // ອັນໃໝ່ຈາກເຄືອຂ່າຍເບື້ອງຫຼັງມາອັບເດດແຄັດໄວ້ໃຊ້ຄັ້ງຕໍ່ໄປ (ອາດເຫັນເວີຊັນເກົ່າ 1 ຄັ້ງຫຼັງ deploy ໃໝ່
  // ແລ້ວຄ່ອຍທັນ — ແລກກັບການເປີດໄວທຸກຄັ້ງ). ຖ້າຍັງບໍ່ມີແຄັດ (ເປີດຄັ້ງທຳອິດ) ລໍເຄືອຂ່າຍຄືເກົ່າ.
  if (event.request.mode === 'navigate' || isNetworkFirst(url)) {
    event.respondWith(
      caches.match(event.request).then(function(cached){
        var network = fetch(event.request, { cache: 'no-store' }).then(function(resp){
          if (resp && resp.status === 200) {
            var respClone = resp.clone();
            caches.open(CACHE_NAME).then(function(cache){ cache.put(event.request, respClone); });
          }
          return resp;
        }).catch(function(){
          return cached || caches.match('./index.html');
        });
        if (cached) { event.waitUntil(network); return cached; }
        return network;
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
