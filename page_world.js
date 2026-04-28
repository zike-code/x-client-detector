/**
 * page_world.js — world: "MAIN"
 *
 * Runs in the page's main JavaScript context (not the extension's isolated world),
 * giving direct access to the real window.fetch and XMLHttpRequest before any
 * page-level patching. Intercepts X's GraphQL responses to extract tweet metadata
 * and forwards it to the isolated world via postMessage.
 */
(function () {
  'use strict';

  const KEY = '__lulv2__';
  if (window[KEY]) return;
  window[KEY] = true;

  // GraphQL endpoints that include tweet `source` field data.
  const PATHS = [
    'TweetDetail',
    'UserTweets',
    'UserTweetsAndReplies',
    'TweetResultByRestId',
  ];

  function shouldCapture(url) {
    return typeof url === 'string' && PATHS.some(p => url.includes(p));
  }

  // Extracts the focal tweet ID from TweetDetail URLs.
  function getFocalId(url) {
    try {
      const m = url.match(/focalTweetId["%3A:]+(\d+)/);
      return m ? m[1] : null;
    } catch(_) { return null; }
  }

  /**
   * Walks X's nested GraphQL JSON and collects tweet nodes.
   * Each node is normalised into: { id, source, full_text, created_at,
   *                                  user_id, screen_name, is_focal, endpoint }
   *
   * Implementation redacted — uses a recursive depth-limited walker that
   * matches Tweet/__typename nodes and resolves the legacy.source HTML field.
   */
  function extract(data, url) {
    // GraphQL response parser — redacted for public portfolio.
    return [];
  }

  function dispatch(tweets, url) {
    if (!tweets.length) return;
    window.postMessage({ type: '__lulv_tweets__', tweets, url }, '*');
  }

  // Patch fetch — intercept responses from relevant GraphQL endpoints.
  const origFetch = window.fetch;
  window.fetch = async function(...args) {
    const res = await origFetch.apply(this, args);
    const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '');
    if (shouldCapture(url)) {
      // Response parsing and dispatch — redacted.
    }
    return res;
  };

  // Patch XHR — covers legacy request paths used by some X page variants.
  const oOpen = XMLHttpRequest.prototype.open;
  const oSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function(m, url, ...r) {
    this.__lu = url; return oOpen.call(this, m, url, ...r);
  };
  XMLHttpRequest.prototype.send = function(...a) {
    if (this.__lu && shouldCapture(this.__lu)) {
      // Response parsing and dispatch — redacted.
    }
    return oSend.apply(this, a);
  };

})();
