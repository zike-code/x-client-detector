/**
 * ui.js — card rendering and DOM injection
 */
const XClientUI = (() => {
  'use strict';

  const CARD_CLASS = 'lulv-card';

  function riskColor(s) {
    if (s >= 70) return '#f4212e';
    if (s >= 40) return '#ff7a00';
    if (s >= 20) return '#ffd400';
    return '#00ba7c';
  }

  function riskLabel(s) {
    if (s >= 70) return '🚨 High Risk — Suspicious change!';
    if (s >= 40) return '⚠️ Moderate Risk';
    if (s >= 20) return '🔔 Low Risk';
    return '✅ Normal';
  }

  function freqBars(freq, total) {
    if (!freq || total === 0) return '<span style="color:#536471;font-size:11px">No history yet — open more tweets from this profile.</span>';
    const { CLIENT_LABELS, CLIENT_ICONS } = XClientAnalyzer;
    return Object.entries(freq)
      .sort((a,b) => b[1]-a[1])
      .map(([c, n]) => {
        const pct = Math.round((n/total)*100);
        const lbl = CLIENT_LABELS[c] || c;
        const ico = CLIENT_ICONS[c] || '❓';
        return `<div class="lulv-fr">
          <span class="lulv-fl">${ico} ${lbl}</span>
          <div class="lulv-fbw"><div class="lulv-fb" style="width:${pct}%"></div></div>
          <span class="lulv-fp">${pct}%</span>
        </div>`;
      }).join('');
  }

  function injectClientCard(article, analysis, tweetId) {
    if (!article || !analysis) return;
    const cardId = `lulv-${tweetId}`;
    if (document.getElementById(cardId)) return;

    const { riskScore, reason, clientLabel, dominantLabel,
            icon, dominantIcon, historicalFreq, totalAnalyzed,
            rawSource, domRatio } = analysis;

    const noHistory = totalAnalyzed === 0;
    const color = riskColor(riskScore);
    const label = riskLabel(riskScore);
    const bars  = freqBars(historicalFreq, totalAnalyzed);

    const card = document.createElement('div');
    card.className = CARD_CLASS;
    card.id = cardId;
    card.setAttribute('data-tweet-id', tweetId);

    card.innerHTML = `
      <div class="lulv-header" style="cursor:pointer">
        <span class="lulv-title">🔍 X Client Detector</span>
        <button class="lulv-toggle" title="Expand/Collapse">▸</button>
      </div>
      <div class="lulv-body" style="display:none">
        <div class="lulv-row">
          <div class="lulv-ib">
            <span class="lulv-il">Current client</span>
            <span class="lulv-iv">${icon} ${clientLabel}</span>
          </div>
          ${!noHistory ? `
          <div class="lulv-ib">
            <span class="lulv-il">Dominant history</span>
            <span class="lulv-iv">${dominantIcon || '❓'} ${dominantLabel}</span>
          </div>
          <div class="lulv-ib">
            <span class="lulv-il">Risk Score</span>
            <span class="lulv-iv lulv-score" style="color:${color}">${riskScore}/100</span>
          </div>
          ` : `
          <div class="lulv-ib">
            <span class="lulv-il">Risk Score</span>
            <span class="lulv-iv lulv-score" style="color:#536471">— <span style="font-size:11px;font-weight:400">no history</span></span>
          </div>
          `}
        </div>

        ${!noHistory ? `
        <div class="lulv-bar-wrap">
          <div class="lulv-bar" style="width:${riskScore}%;background:${color}"></div>
        </div>
        <div class="lulv-rlabel" style="color:${color}">${label}</div>
        ${reason ? `<div class="lulv-reason">${reason}</div>` : ''}
        ` : `
        <div class="lulv-rlabel" style="color:#536471;font-size:11px">
          ⏳ Not enough history — browse the profile to accumulate data.
        </div>
        `}

        <div class="lulv-stitle">
          Historical distribution ${totalAnalyzed > 0 ? `(${totalAnalyzed} tweets)` : ''}
        </div>
        <div class="lulv-freq">${bars}</div>
      </div>
    `;

    // Toggle
    const btn    = card.querySelector('.lulv-toggle');
    const body   = card.querySelector('.lulv-body');
    const header = card.querySelector('.lulv-header');
    header.addEventListener('click', () => {
      const open = body.style.display === 'none';
      body.style.display = open ? '' : 'none';
      btn.textContent = open ? '▾' : '▸';
    });

    const parent = article.parentNode;
    const next   = article.nextSibling;
    if (parent) parent.insertBefore(card, next);
  }

  // ── Debug panel (Ctrl+Shift+D) ────────────────────────────────────────────
  const debugLog = [];

  function addDebug(tweets) {
    for (const t of tweets) {
      debugLog.unshift(t);
      if (debugLog.length > 500) debugLog.pop();
    }
    const p = document.getElementById('lulv-dbg');
    if (p && p.style.display !== 'none') renderDebug();
  }

  function renderDebug() {
    const p = document.getElementById('lulv-dbg');
    if (!p) return;
    const rows = debugLog.slice(0, 100).map(t => {
      const src = t.source
        ? `<span style="color:#00ba7c">${t.source.replace(/<[^>]+>/g,'')}</span>`
        : `<span style="color:#f4212e">empty</span>`;
      const ep = t.endpoint === 'TweetDetail'
        ? `<span style="color:#1d9bf0">TweetDetail${t.is_focal?' ★':''}</span>`
        : `<span style="color:#536471">UserTweets</span>`;
      return `<tr style="border-bottom:1px solid #1e2128">
        <td style="padding:3px 8px;color:#536471;font-size:11px">@${t.screen_name||'?'}</td>
        <td style="padding:3px 8px;font-size:11px">${src}</td>
        <td style="padding:3px 8px;font-size:11px">${ep}</td>
      </tr>`;
    }).join('');

    p.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:#1e2128;border-bottom:1px solid #2f3336">
        <span style="font-weight:700;color:#1d9bf0;font-size:13px">🔍 X Client Detector — Debug (${debugLog.length} tweets captured)</span>
        <button onclick="document.getElementById('lulv-dbg').style.display='none'"
          style="background:none;border:none;color:#536471;cursor:pointer;font-size:18px;line-height:1">✕</button>
      </div>
      <div style="padding:6px 14px;font-size:11px;color:#536471;border-bottom:1px solid #2f3336">
        💡 <b style="color:#e7e9ea">Tip:</b> Open individual tweets to capture source via TweetDetail.
        Close with <kbd style="background:#2f3336;padding:1px 4px;border-radius:3px">Ctrl+Shift+D</kbd>
      </div>
      <div style="overflow-y:auto;max-height:340px">
        <table style="width:100%;border-collapse:collapse">
          <thead style="background:#1a1c1f;position:sticky;top:0">
            <tr>
              <th style="padding:5px 8px;text-align:left;color:#536471;font-size:11px;font-weight:600">Author</th>
              <th style="padding:5px 8px;text-align:left;color:#536471;font-size:11px;font-weight:600">Source</th>
              <th style="padding:5px 8px;text-align:left;color:#536471;font-size:11px;font-weight:600">Endpoint</th>
            </tr>
          </thead>
          <tbody>${rows || '<tr><td colspan="3" style="padding:16px;color:#536471;text-align:center">No tweets captured yet.</td></tr>'}</tbody>
        </table>
      </div>
    `;
  }

  function createDebugPanel() {
    if (document.getElementById('lulv-dbg')) return;
    const p = document.createElement('div');
    p.id = 'lulv-dbg';
    p.style.cssText = `
      position:fixed;bottom:0;right:0;width:580px;max-height:460px;
      background:#16181c;border:1px solid #2f3336;border-radius:12px 0 0 0;
      z-index:99999;display:none;
      font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
      box-shadow:0 -4px 24px rgba(0,0,0,0.7);
    `;
    document.body.appendChild(p);
    document.addEventListener('keydown', e => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        const hidden = p.style.display === 'none';
        p.style.display = hidden ? 'block' : 'none';
        if (hidden) renderDebug();
      }
    });
  }

  function initDebug() {
    if (document.body) createDebugPanel();
    else document.addEventListener('DOMContentLoaded', createDebugPanel, {once:true});
  }
  initDebug();

  function removeAllCards() {
    document.querySelectorAll(`.${CARD_CLASS}`).forEach(c => c.remove());
  }

  return { injectClientCard, removeAllCards, addDebug, CARD_CLASS };
})();
