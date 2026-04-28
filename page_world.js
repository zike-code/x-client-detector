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

  const PATHS = [
    'TweetDetail',
    'UserTweets',
    'UserTweetsAndReplies',
    'TweetResultByRestId',
  ];

  function shouldCapture(url) {
    return typeof url === 'string' && PATHS.some(p => url.includes(p));
  }

  function getFocalId(url) {
    try {
      const variables = new URL(url, 'https://x.com').searchParams.get('variables');
      if (!variables) return null;
      const id = JSON.parse(variables).focalTweetId;
      return typeof id === 'string' && /^\d+$/.test(id) ? id : null;
    } catch(_) { return null; }
  }

  function extract(data, url) {
    const tweets = [];
    const seen = new Set();
    const isTweetDetail = url.includes('TweetDetail');
    const focalId = isTweetDetail ? getFocalId(url) : null;

    function parseTweet(tw) {
      const id = tw.rest_id;
      if (!id || seen.has(id)) return;
      seen.add(id);

      const legacy = tw.legacy || {};
      const core   = tw.core   || {};
      const ur     = core.user_results?.result || {};
      const ul     = ur.legacy || {};

      const source = legacy.source || tw.source || '';

      tweets.push({
        id,
        source,
        full_text:   legacy.full_text || legacy.text || '',
        created_at:  legacy.created_at || '',
        user_id:     legacy.user_id_str || ur.rest_id || '',
        screen_name: ul.screen_name || '',
        is_focal:    isTweetDetail && id === focalId,
        endpoint:    isTweetDetail ? 'TweetDetail' : 'UserTweets',
      });
    }

    function walk(obj, depth) {
      if (depth > 25 || !obj || typeof obj !== 'object') return;
      if (Array.isArray(obj)) { obj.forEach(o => walk(o, depth+1)); return; }

      const tn = obj.__typename;
      if (tn === 'Tweet' && obj.rest_id)                      parseTweet(obj);
      if (tn === 'TweetWithVisibilityResults' && obj.rest_id) parseTweet(obj.tweet || obj);

      for (const k of Object.keys(obj)) {
        try { walk(obj[k], depth+1); } catch(_) {}
      }
    }

    try { walk(data, 0); } catch(_) {}

    const withSrc = tweets.filter(t => t.source).length;
    const ep = url.split('/').pop()?.split('?')[0] ?? '';
    console.log(`[XClientDetector] ${ep}: ${tweets.length} tweets | source: ${withSrc}`);

    return tweets;
  }

  function dispatch(tweets, url) {
    if (!tweets.length) return;
    window.postMessage({ type: '__lulv_tweets__', tweets, url }, '*');
  }

  const origFetch = window.fetch;
  window.fetch = async function(...args) {
    const res = await origFetch.apply(this, args);
    const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '');
    if (shouldCapture(url)) {
      try { res.clone().json().then(d => dispatch(extract(d, url), url)).catch(()=>{}); } catch(_) {}
    }
    return res;
  };

  const oOpen = XMLHttpRequest.prototype.open;
  const oSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function(m, url, ...r) {
    this.__lu = url; return oOpen.call(this, m, url, ...r);
  };
  XMLHttpRequest.prototype.send = function(...a) {
    if (this.__lu && shouldCapture(this.__lu)) {
      const u = this.__lu;
      this.addEventListener('load', function() {
        try { dispatch(extract(JSON.parse(this.responseText), u), u); } catch(_) {}
      });
    }
    return oSend.apply(this, a);
  };

})();
