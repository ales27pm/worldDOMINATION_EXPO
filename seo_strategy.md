# SEO Strategy

## Project type
- `worldDOMINATION` — an Expo/React Native mobile game (artifacts/mobile).
- `artifacts/api-server` is a backend API with no public HTML routes (health/storage endpoints only) — out of scope for SEO.
- `artifacts/mockup-sandbox` is an internal design/mockup tool (Canvas), not public-facing — out of scope for SEO.

## In scope
- `artifacts/mobile/server/templates/landing-page.html` and `artifacts/mobile/server/serve.js` — the only public, unauthenticated, crawlable web surface. It is a single install/QR-code landing page served at `/` that tells visitors to download the app via Expo Go / App Store / Play Store, or scan a QR code.

## Out of scope
- Authenticated / in-app screens (`artifacts/mobile/app/**` — these are React Native screens rendered inside the installed app, not indexable web pages).
- `artifacts/api-server` (no public HTML).
- `artifacts/mockup-sandbox` (internal design tool).

## Target audience
- People who received a shared link (e.g. via chat, social, QR) to install/preview the `worldDOMINATION` game during development. Not a content/marketing site optimized for organic search discovery.

## Primary keywords
- None — this is a single app-install redirect page, not keyword-targeted content. SEO findings here focus on crawlability basics, social-share metadata (since the link is shared peer-to-peer), and accessibility rather than keyword/content strategy.

## Content strategy
- No blog/marketing/content pages exist in this project. Programmatic SEO / content-depth checks are not applicable.

## Crawler assumptions
- Single dynamic HTML route (`/`) with placeholder substitution at request time (`APP_NAME_PLACEHOLDER`, `BASE_URL_PLACEHOLDER`, `EXPS_URL_PLACEHOLDER`). No `robots.txt`, `sitemap.xml`, or `llms.txt` exist; given there's exactly one low-value utility page, this is treated as low severity rather than a critical crawlability gap.

## Dismissed categories
- (None yet)
