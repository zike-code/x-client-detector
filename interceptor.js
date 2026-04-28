/**
 * interceptor.js — ISOLATED world
 * Receives postMessage from page_world.js and forwards it as a CustomEvent.
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
