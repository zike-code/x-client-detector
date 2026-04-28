/**
 * content.js — orquestrador Lul Verifica
 * Mostra o cliente de QUALQUER tweet assim que ele aparecer na tela.
 * Histórico é usado para análise de risco quando disponível,
 * mas o card é exibido mesmo sem histórico.
 */
(function () {
  'use strict';

  // tweetsByUser: Map<userId, Tweet[]>  — sem limite de tamanho
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

      // Aceita qualquer tweet — com ou sem source
      // (se vier sem source, o card vai mostrar "Desconhecido" mas ainda aparece)
      if (!tweetsByUser.has(t.user_id)) tweetsByUser.set(t.user_id, []);
      const list = tweetsByUser.get(t.user_id);
      if (!list.find(x => x.id === t.id)) list.push(t);
    }

    analyze(tweets);
  });

  function analyze(freshTweets) {
    // Re-analisa apenas os tweets que acabaram de chegar (mais eficiente)
    const toProcess = freshTweets
      ? freshTweets.filter(t => t.id && t.user_id)
      : [...tweetsByUser.values()].flat();

    for (const tw of toProcess) {
      const allFromUser = tweetsByUser.get(tw.user_id) || [];
      const history = allFromUser.filter(x => x.id !== tw.id);

      const analysis = XClientAnalyzer.detectClientShift([tw, ...history]);

      // Mostra card para QUALQUER tweet que tenha source identificável
      // (mesmo que riskScore === 0 e sem histórico)
      if (!tw.source && analysis.riskScore === 0 && analysis.totalAnalyzed === 0) {
        // Sem source e sem histórico = nada útil para mostrar
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

    // Re-injeta cards pendentes que apareceram no DOM
    for (const [id, analysis] of pendingByTwId.entries()) {
      if (!document.getElementById(`lulv-${id}`)) tryInject(id, analysis);
    }

    // Detecta artigos novos e injeta se já temos análise
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
    console.log('[LulVerifica] Ativo ✓ — Ctrl+Shift+D para debug');
  }
  start();
})();
