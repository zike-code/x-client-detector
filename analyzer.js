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

  // Maps source string patterns to client constants.
  // Covers official clients, major scheduling tools, and automation platforms.
  const PATTERNS = [
    { r: /iphone/i,  c: CLIENT.TWITTER_IPHONE },
    { r: /android/i, c: CLIENT.TWITTER_ANDROID },
    { r: /web app/i, c: CLIENT.TWITTER_WEB },
    // ... additional patterns for third-party and automation tools omitted
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

  /**
   * Compares the current tweet's posting client against the user's historical
   * pattern and returns a weighted risk assessment.
   *
   * Strategy:
   *  1. Determine dominant historical client from the tweet history.
   *  2. Evaluate the current client against a set of shift-pattern rules.
   *  3. Sum weighted scores per rule; apply a consistency bonus for diverse accounts.
   *  4. Clamp result to [0, 100].
   *
   * @param {Array} tweets - [currentTweet, ...historicalTweets], each with a `source` field
   * @returns {{
   *   riskScore: number,        // 0–100
   *   dominantClient: string,
   *   currentClient: string,
   *   reason: string,
   *   breakdown: Array<{ rule: string, score: number }>,
   *   historicalFreq: object,
   *   totalAnalyzed: number,
   *   domRatio: number
   * }}
   */
  function detectClientShift(tweets) {
    // Core risk-scoring algorithm — redacted for public portfolio.
    //
    // Rules evaluated (conceptual, weights omitted):
    //   • Mobile-dominant history → current tweet via API/automation  → high risk
    //   • Mobile-dominant history → current tweet via Web App         → moderate risk
    //   • Mobile-dominant history → unrecognised client               → elevated risk
    //   • Highly consistent account (>80% single client) → new client → elevated risk
    //   • First-ever API post on an account with 5+ history tweets    → high risk
    //   • First-ever third-party tool on a mature account             → low-moderate risk
    //   • Account regularly uses 3+ distinct clients                  → score reduction
  }

  return { detectClient, detectClientShift, sourceLabel, CLIENT, CLIENT_LABELS, CLIENT_ICONS };
})();
