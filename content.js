/**
 * content.js — main orchestrator
 * Shows the posting client for any tweet as soon as it appears on screen.
 * History is used for risk analysis when available,
 * but the card renders even without history.
 */
(function () {
  'use strict';

  // tweetsByUser: Map<userId, Tweet[]>
  const tweetsByUser  = new Map();
  const pendingByTwId = new Map();

  document.addEventListener('__lulv_tweets__', (e) => {
    const { tweets } = e.detail;
    if (!tweets?.length) return;

    if (typeof XClientUI !== 'undefined' && XClientUI.addDebug) {
      XClientUI.addDebug(tweets);
    }

    for (const t of tweets) {
      if (!t.id || !t.user_id) continue;

      // Accepts any tweet — with or without source
      // (if source is missing, the card shows "Unknown" but still renders)
      if (!tweetsByUser.has(t.user_id)) tweetsByUser.set(t.user_id, []);
      const list = tweetsByUser.get(t.user_id);
      if (!list.find(x => x.id === t.id)) list.push(t);
    }

    analyze(tweets);
  });

  function analyze(freshTweets) {
    // Re-analyse only the freshly received tweets for efficiency
    const toProcess = freshTweets
      ? freshTweets.filter(t => t.id && t.user_id)
      : [...tweetsByUser.values()].flat();

    for (const tw of toProcess) {
      const allFromUser = tweetsByUser.get(tw.user_id) || [];
      const history = allFromUser.filter(x => x.id !== tw.id);

      const analysis = XClientAnalyzer.detectClientShift([tw, ...history]);

      // Show card for any tweet with an identifiable source,
      // even if riskScore === 0 and there is no history.
      if (!tw.source && analysis.riskScore === 0 && analysis.totalAnalyzed === 0) {
        continue;
      }

      const prev = pendingByTwId.get(tw.id);
      const changed = !prev
        || prev.riskScore !== analysis.riskScore
        || prev.rawSource !== analysis.rawSource;

      if (changed) {
        pendingByTwId.set(tw.id, analysis);
        const old = document.getElementById(`lulv-${tw.id}`);
        if (old) old.remove();
        tryInject(tw.id, analysis);
      }
    }
  }

  function tryInject(id, analysis) {
    const el = document.querySelector(`article[data-testid="tweet"] a[href*="/status/${id}"]`)
            || document.querySelector(`a[href*="status/${id}"]`);
    if (!el) return;
    const art = el.closest('article[data-testid="tweet"]') || el.closest('article');
    if (art) XClientUI.injectClientCard(art, analysis, id);
  }

  function getTweetId(art) {
    for (const a of art.querySelectorAll('a[href*="/status/"]')) {
      const m = a.href.match(/\/status\/(\d+)/);
      if (m) return m[1];
    }
    return null;
  }

  const obs = new MutationObserver((muts) => {
    if (!muts.some(m => m.addedNodes.length)) return;

    // Re-inject pending cards that have appeared in the DOM
    for (const [id, analysis] of pendingByTwId.entries()) {
      if (!document.getElementById(`lulv-${id}`)) tryInject(id, analysis);
    }

    // Detect new articles and inject if analysis is already available
    document.querySelectorAll('article[data-testid="tweet"]:not([data-lulv])').forEach(art => {
      art.setAttribute('data-lulv', '1');
      const id = getTweetId(art);
      if (id && pendingByTwId.has(id) && !document.getElementById(`lulv-${id}`)) {
        XClientUI.injectClientCard(art, pendingByTwId.get(id), id);
      }
    });
  });

  function start() {
    const target = document.body || document.documentElement;
    if (!target) { document.addEventListener('DOMContentLoaded', start, {once:true}); return; }
    obs.observe(target, { childList:true, subtree:true });
    console.log('[XClientDetector] Active ✓ — Ctrl+Shift+D for debug panel');
  }
  start();
})();
