# X Client Change Detector

A Chrome extension (Manifest V3) that detects suspicious posting-client changes on tweets and generates a **Client Change Risk Score** from 0 to 100.

---

## Installation

1. Download or clone this folder.
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode** (top-right toggle).
4. Click **"Load unpacked"** and select this folder.
5. Go to [x.com](https://x.com) and browse any profile or tweet.

---

## How it works

1. The extension intercepts X's GraphQL responses in the background.
2. For each user, it stores the last 30–50 tweets and extracts the `source` field (posting client).
3. Once enough history is available, it analyses the client shift and computes the **Risk Score**.
4. A card is injected below each analysed tweet showing:
   - Current posting client
   - Historical dominant client
   - Risk Score (0–100) with a visual bar
   - Historical client distribution

---

## Recognised clients

| Category | Examples |
|----------|---------|
| `TWITTER_IPHONE` | Twitter for iPhone |
| `TWITTER_ANDROID` | Twitter for Android |
| `TWITTER_WEB` | Twitter Web App |
| `TWEETDECK` | TweetDeck |
| `THIRD_PARTY_TOOL` | Buffer, Hootsuite, IFTTT |
| `API_AUTOMATION` | dlvr.it, Zapier, SocialFlow, Sprinklr |
| `UNKNOWN` | Unrecognised client |

---

## Risk rules (conceptual)

The scoring model evaluates shift patterns between the account's historical dominant client and the current tweet's client. Higher risk is assigned to transitions that are statistically unusual for the account — for example, an account that always posts from mobile suddenly posting via API automation. Accounts with a naturally diverse client history receive a score reduction to avoid false positives.

---

## File structure

```
x-client-detector/
├── manifest.json      # Extension config (MV3)
├── page_world.js      # MAIN-world fetch/XHR interceptor
├── interceptor.js     # Bridges MAIN world → isolated world via postMessage
├── analyzer.js        # Client detection and risk scoring
├── ui.js              # Card rendering and DOM injection
├── content.js         # Orchestrator + MutationObserver
├── styles.css         # Dark/light theme styles matching X's design system
└── icons/             # Extension icons
```

---

## Architecture

```
X GraphQL response
      ↓
page_world.js  (MAIN world — intercepts real fetch/XHR)
      ↓  postMessage
interceptor.js (ISOLATED world — relays via CustomEvent)
      ↓  CustomEvent
content.js     (orchestrator — buffers tweets per user)
      ↓
analyzer.js    (client detection + risk scoring)
      ↓
ui.js          (injects visual card into the tweet article)
```

The two-world design is required by Manifest V3: only scripts running in the **MAIN** world can access the page's real `window.fetch`; content scripts run in an isolated sandbox and communicate back via `postMessage` → `CustomEvent`.

---

## Privacy

- **No backend.** Everything runs locally in the browser.
- Only data already loaded publicly by X's frontend is used.
- No data is sent to any external server.

---

## Technical notes

- Uses **MutationObserver** to detect dynamically loaded tweets.
- The MAIN-world script patches `window.fetch` and `XMLHttpRequest` before page scripts run (`run_at: document_start`).
- Cross-world communication: `postMessage` (MAIN → page) → `CustomEvent` (interceptor → content script).
- Plain ES6, no external dependencies.
