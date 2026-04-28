/**
 * analyzer.js — client detection and risk scoring
 */
const XClientAnalyzer = (() => {
  'use strict';

  const CLIENT = {
    TWITTER_IPHONE:    'TWITTER_IPHONE',
    TWITTER_ANDROID:   'TWITTER_ANDROID',
    TWITTER_WEB:       'TWITTER_WEB',
    TWEETDECK:         'TWEETDECK',
    THIRD_PARTY_TOOL:  'THIRD_PARTY_TOOL',
    API_AUTOMATION:    'API_AUTOMATION',
    UNKNOWN:           'UNKNOWN',
  };

  const CLIENT_LABELS = {
    TWITTER_IPHONE:   'Twitter for iPhone',
    TWITTER_ANDROID:  'Twitter for Android',
    TWITTER_WEB:      'Twitter Web App',
    TWEETDECK:        'TweetDeck',
    THIRD_PARTY_TOOL: 'Third-party tool',
    API_AUTOMATION:   'API / Automation',
    UNKNOWN:          'Unknown',
  };

  const CLIENT_ICONS = {
    TWITTER_IPHONE:   '📱',
    TWITTER_ANDROID:  '🤖',
    TWITTER_WEB:      '🌐',
    TWEETDECK:        '🗂️',
    THIRD_PARTY_TOOL: '🔧',
    API_AUTOMATION:   '⚙️',
    UNKNOWN:          '❓',
  };

  const MOBILE = new Set([CLIENT.TWITTER_IPHONE, CLIENT.TWITTER_ANDROID]);

  const PATTERNS = [
    { r: /iphone/i,                  c: CLIENT.TWITTER_IPHONE },
    { r: /android/i,                 c: CLIENT.TWITTER_ANDROID },
    { r: /tweetdeck/i,               c: CLIENT.TWEETDECK },
    { r: /web app/i,                 c: CLIENT.TWITTER_WEB },
    { r: /buffer/i,                  c: CLIENT.THIRD_PARTY_TOOL },
    { r: /hootsuite/i,               c: CLIENT.THIRD_PARTY_TOOL },
    { r: /ifttt/i,                   c: CLIENT.THIRD_PARTY_TOOL },
    { r: /later\.com/i,              c: CLIENT.THIRD_PARTY_TOOL },
    { r: /crowdfire/i,               c: CLIENT.THIRD_PARTY_TOOL },
    { r: /agorapulse/i,              c: CLIENT.THIRD_PARTY_TOOL },
    { r: /dlvr\.it/i,                c: CLIENT.API_AUTOMATION },
    { r: /zapier/i,                  c: CLIENT.API_AUTOMATION },
    { r: /socialflow/i,              c: CLIENT.API_AUTOMATION },
    { r: /sprinklr/i,                c: CLIENT.API_AUTOMATION },
    { r: /salesforce/i,              c: CLIENT.API_AUTOMATION },
    { r: /twittbot/i,                c: CLIENT.API_AUTOMATION },
    { r: /make\.com|integromat/i,    c: CLIENT.API_AUTOMATION },
    { r: /n8n/i,                     c: CLIENT.API_AUTOMATION },
    { r: /api\.twitter\.com/i,       c: CLIENT.API_AUTOMATION },
    { r: /twitter api/i,             c: CLIENT.API_AUTOMATION },
  ];

  function detectClient(sourceHTML) {
    if (!sourceHTML) return CLIENT.UNKNOWN;
    const text = sourceHTML.replace(/<[^>]+>/g, ' ').trim();
    for (const { r, c } of PATTERNS) {
      if (r.test(text)) return c;
    }
    return text.length > 0 ? CLIENT.UNKNOWN : CLIENT.UNKNOWN;
  }

  function sourceLabel(sourceHTML) {
    if (!sourceHTML) return 'Unknown';
    return sourceHTML.replace(/<[^>]+>/g, '').trim() || 'Unknown';
  }

  function detectClientShift(tweets) {
    const empty = {
      dominantClient: CLIENT.UNKNOWN, currentClient: CLIENT.UNKNOWN,
      riskScore: 0, reason: 'Not enough data.',
      clientLabel: CLIENT_LABELS[CLIENT.UNKNOWN],
      dominantLabel: CLIENT_LABELS[CLIENT.UNKNOWN],
      icon: CLIENT_ICONS[CLIENT.UNKNOWN],
      dominantIcon: CLIENT_ICONS[CLIENT.UNKNOWN],
      rawSource: '', breakdown: [], historicalFreq: {}, totalAnalyzed: 0,
    };

    if (!tweets?.length) return empty;

    const current = tweets[0];
    const currentClient = detectClient(current.source);
    const currentRaw = sourceLabel(current.source);
    const history = tweets.slice(1);
    const total = history.length;

    const freq = {};
    for (const t of history) {
      const c = detectClient(t.source);
      if (t.source) freq[c] = (freq[c] || 0) + 1;
    }

    const totalWithSrc = Object.values(freq).reduce((a,b) => a+b, 0);

    let dominant = CLIENT.UNKNOWN, domCount = 0;
    for (const [c, n] of Object.entries(freq)) {
      if (n > domCount) { dominant = c; domCount = n; }
    }

    const domRatio = totalWithSrc > 0 ? domCount / totalWithSrc : 0;
    let risk = 0;
    const reasons = [];
    const breakdown = [];

    if (totalWithSrc < 3) {
      if (currentClient !== CLIENT.UNKNOWN) {
        risk += 5;
        reasons.push('Insufficient history for a reliable comparison.');
      } else {
        return { ...empty, currentClient, clientLabel: currentRaw,
                 rawSource: current.source, totalAnalyzed: total };
      }
    }

    // Rule 1: Mobile → API (+70)
    if (MOBILE.has(dominant) && currentClient === CLIENT.API_AUTOMATION) {
      risk += 70; breakdown.push({ rule: 'Mobile → API/Automation', score: 70 });
      reasons.push('Account posted from mobile; current tweet came via API/automation.');
    }

    // Rule 2: Mobile → Web (+40)
    if (MOBILE.has(dominant) && currentClient === CLIENT.TWITTER_WEB) {
      risk += 40; breakdown.push({ rule: 'Mobile → Web App', score: 40 });
      reasons.push('Account posted from mobile; current tweet came from Web App.');
    }

    // Rule 3: Mobile → UNKNOWN with non-empty source (+50)
    if (MOBILE.has(dominant) && currentClient === CLIENT.UNKNOWN && current.source) {
      risk += 50; breakdown.push({ rule: 'Mobile → unknown client', score: 50 });
      reasons.push(`Unrecognised client: "${currentRaw}".`);
    }

    // Rule 4: Dominant client >80% and a brand-new client appears (+50)
    const isNew = current.source && !freq[currentClient];
    if (domRatio >= 0.8 && isNew && totalWithSrc >= 5) {
      risk += 50; breakdown.push({ rule: 'New client on consistent account', score: 50 });
      reasons.push(`${Math.round(domRatio*100)}% of tweets used ${CLIENT_LABELS[dominant]}, now "${currentRaw}" appeared.`);
    }

    // Rule 5: API/Automation on an account that never used API (+60)
    if (currentClient === CLIENT.API_AUTOMATION && !freq[CLIENT.API_AUTOMATION] && totalWithSrc >= 5) {
      risk += 60; breakdown.push({ rule: 'First-ever API post', score: 60 });
      reasons.push('Account has never posted via API before.');
    }

    // Rule 6: Third-party tool never used before (+30)
    if (currentClient === CLIENT.THIRD_PARTY_TOOL && !freq[CLIENT.THIRD_PARTY_TOOL] && totalWithSrc >= 5) {
      risk += 30; breakdown.push({ rule: 'New third-party tool', score: 30 });
      reasons.push('Third-party tool never used on this account before.');
    }

    // Bonus: account regularly uses 3+ clients = less suspicious
    if (Object.keys(freq).length >= 3) {
      risk = Math.max(0, risk - 20);
      reasons.push('Account habitually uses multiple clients.');
    }

    risk = Math.min(100, Math.max(0, risk));

    const reason = reasons.length
      ? reasons.join(' ')
      : dominant === currentClient
        ? 'Consistent behaviour, no shift detected.'
        : 'Client shift detected, but no high-risk pattern found.';

    return {
      dominantClient: dominant,
      currentClient,
      riskScore: risk,
      reason,
      rawSource: currentRaw,
      clientLabel: currentRaw !== 'Unknown' ? currentRaw : CLIENT_LABELS[currentClient],
      dominantLabel: CLIENT_LABELS[dominant],
      icon: CLIENT_ICONS[currentClient],
      dominantIcon: CLIENT_ICONS[dominant],
      breakdown,
      historicalFreq: freq,
      totalAnalyzed: totalWithSrc,
      domRatio: Math.round(domRatio * 100),
    };
  }

  return { detectClient, detectClientShift, sourceLabel, CLIENT, CLIENT_LABELS, CLIENT_ICONS };
})();
