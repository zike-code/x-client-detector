/**
 * interceptor.js — ISOLATED world
 * Recebe postMessage do page_world.js e repassa via CustomEvent.
 */
(function () {
  'use strict';
  window.addEventListener('message', (e) => {
    if (e.source !== window) return;
    if (e.data?.type === '__lulv_tweets__') {
      document.dispatchEvent(new CustomEvent('__lulv_tweets__', { detail: e.data }));
    }
  });
})();
