# ThreadIQ v1.0 – Track. Inspect. Manage.
Tyre inspection and lifecycle management app (HTML + CSS + vanilla JS, IndexedDB, Capacitor Android APK built by GitHub Actions). Works offline; all data stays on the phone.

## Main features
- Vehicles (4/6/10/12/14/18 wheels or custom axles), vehicle code, search, real inspection status
- Tyre = serial number. The serial number is the tyre code. No serial -> saved as NOT FOUND with a random `AUTO-XXXXXX` code (not a real serial); add the real serial later and the code changes everywhere
- Camera scan of barcode / QR serial labels (native scanner in the APK)
- Full tyre lifecycle: every fitment with date, KM, hours and days; per-vehicle totals; total life until scrap (profile + Lifecycle report)
- Inspections (tread, damage, pressure, photos), job cards from findings, replacement, rotation, maintenance
- Company standards per tyre size (PSI, minimum tread), alerts and a bell badge with the alert count
- Analytics, 10 reports (CSV + PDF), JSON backup / restore through the Share menu

## Build the APK (GitHub Actions)
1. Upload all files to the repo root (keep folders: `css`, `js`, `assets`, `.github/workflows`).
2. Push to `main`. Actions builds `ThreadIQ-APK` (app-debug.apk). Download it from the finished run.
3. `debug.keystore` in the repo root must stay: it keeps the signing key fixed so a new APK installs over the old one. Every build also gets a higher versionCode.

## Rules worth knowing
- Tyre code = serial number (letters, digits, `- . _`, max 32). Spaces and other characters become `-`.
- Limits (PSI, minimum tread, inspection days) are company values you enter in Settings. Nothing is preset.
- Take a JSON backup (Settings) before uninstalling the app.
