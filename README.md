# ThreadIQ

**Track. Inspect. Manage.**

ThreadIQ is a personal-first, offline-capable tyre inspection and fleet record starter project. The architecture is intended to grow into a multi-company product later.

## Current starter features

- Dark navy + cyan dashboard inspired by the supplied UI reference
- Vehicle registration
- Individual tyre registration
- Inspection record with pressure, tread readings and condition
- Basic maintenance/repair record
- Inspection history and pressure list
- JSON backup export
- IndexedDB local storage with localStorage fallback
- PWA shell caching
- GitHub Actions Android debug APK workflow
- GitHub Pages web demo workflow

## Important limitations in this starter build

- Cloud synchronization is **not connected yet**. The sync button reports that cloud sync is planned.
- No user authentication or multi-company access is implemented yet.
- Inspection status is manually selected. It is not a safety certification or automatic tyre fitness decision.
- PDF generation, photo attachments, wheel-position diagrams, tyre rotation workflow and advanced analytics are planned next.
- Do not rely on this starter app as the sole record system until backups and restore have been tested.

## Create the GitHub repository

1. Sign in to GitHub.
2. Open https://github.com/new
3. Repository name: `ThreadIQ`
4. Owner: `armanwesupport`
5. Choose Public or Private.
6. Select **Add a README file** only if you are creating the repository without uploading this project ZIP. If uploading the ZIP contents, an empty repository is easiest.
7. Create repository.

## Upload using Android phone

1. Download and extract `ThreadIQ-GitHub-Starter.zip` on your phone.
2. Open the new repository on GitHub in Chrome.
3. Tap **Add file → Upload files**.
4. Select all extracted files and folders, including the hidden `.github` folder.
5. Commit directly to the `main` branch.

If the GitHub mobile page does not show hidden `.github` folders in the file picker, use GitHub's web interface in Chrome with **Desktop site** enabled, or upload the workflow file separately by creating `.github/workflows/android-build.yml` in the repository.

## Build Android APK

1. Open the repository on GitHub.
2. Tap the **Actions** tab.
3. Open **Build ThreadIQ Android APK**.
4. Tap **Run workflow** (or wait for the first push workflow to finish).
5. Wait for the green success check.
6. Open the completed workflow run.
7. Scroll to **Artifacts**.
8. Download `ThreadIQ-debug-apk`.
9. Extract the ZIP and install `app-debug.apk` on your Android phone.

The first build can take several minutes. Android may ask you to allow installation from the browser or file manager you used.

## Enable GitHub Pages demo (optional)

1. Repository → Settings → Pages.
2. Under Build and deployment, choose **GitHub Actions**.
3. The `Deploy ThreadIQ Web Demo` workflow publishes the web app.
4. The site URL will appear in the workflow deployment summary.

## Local development

Requires Node.js 20 and Java 17:

```bash
npm install
npx cap add android
npx cap sync android
```

For local Android Studio builds:

```bash
cd android
./gradlew assembleDebug
```

## Data storage

Records are stored in the browser/app's local IndexedDB database. Clearing app data or uninstalling the app may remove local records. Export JSON backups regularly. Cloud backup and conflict-safe synchronization must be implemented before multi-device or multi-company use.

## Future architecture

- Cloud API and PostgreSQL
- Company/site data isolation
- User roles and permissions
- Reliable sync queue and conflict resolution
- Photo storage and PDF reports
- Vehicle-specific wheel configuration templates
