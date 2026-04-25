# Ironis Site Clone

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
