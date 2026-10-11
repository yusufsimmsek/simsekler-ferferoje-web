# Ironis Site Clone

## Published SEO and GEO content

The public site is Şimşekler Ferforje at https://simseklerferforje.com/.
Run `node scripts/enhance-seo.js` after content changes, then
`node scripts/check-seo.js`. The legacy `updateSEO.js` rebuild also runs this
focused pass. `scripts/geo-content.js` is the source for the public Turkish
offer guide and business facts; do not edit its generated HTML directly.
Update review dates only after reviewing the content, not on every build.

The guide provides customer-facing answers and links to the six real services.
Do not invent reviews, certifications, opening hours, prices, or project claims.
Robots access is already open; no special AI file is required by Google Search.

For measurement, use verified Search Console and Bing Webmaster Tools accounts.
Bing's AI Performance report can show citations and their source pages; ordinary
referral visits alone do not count every AI mention. No account integration or
AI citation improvement is claimed by this release. Compare subsequent periods
against a recorded baseline before attributing gains to these changes.

References: https://developers.google.com/search/docs/appearance/ai-features
and https://www.bing.com/webmasters/help/ai-performance-9f8e7d6c.

This workspace contains a static copy of the reference site structure starting from `/home-1/`.

## Run locally

```powershell
python -m http.server 8080
```

Then open:

- `http://127.0.0.1:8080/`
- `http://127.0.0.1:8080/home-1/`

## Regenerate pages

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\mirror-ironis.ps1
```

The crawler saves each discovered internal route into its own folder with an `index.html` file and keeps the shared stylesheet at `assets/ironis.css`.

## Keep links local

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\lock-local-links.ps1
```

This injects `assets/local-only.js` into every page, redirects the broken `/home-4` route to `/about-us/`, and disables external button/link navigation so the site stays inside localhost.
