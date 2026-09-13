# Edunova Desktop (Tauri v2)

A native desktop client for Edunova. Lightweight (a few MB), fast, secure, and it always
loads the current published platform, so web updates appear without reinstalling.

## Layout

```
src-tauri/
  Cargo.toml            Rust crate (tauri 2, shell/dialog/process/os plugins)
  tauri.conf.json       Windows/macOS/Linux bundles (nsis, msi, dmg, appimage, deb)
  capabilities/default.json  Permissions, scoped to the Edunova origins
  src/main.rs, src/lib.rs    Splash window + desktop-only UI enhancement layer
  icons/                App icons (ico + png sizes)
public/splash.html      Animated startup splash shown until the app is ready
```

The main window opens `https://edunovamis.lovable.app/auth/login?desktop=1`.
Change that URL in `src-tauri/tauri.conf.json` (and the allowed origins in
`capabilities/default.json`) if the production domain changes.

## Build locally

Requires Rust (https://rustup.rs) plus platform prerequisites
(https://tauri.app/start/prerequisites). Windows also needs the MSVC build tools
and WebView2 (bundled with Windows 11).

```bash
bun install
bun run tauri:dev     # development
bun run tauri:build   # produces installers in src-tauri/target/release/bundle
```

Windows output: `Edunova_1.0.0_x64-setup.exe` (NSIS) and `Edunova_1.0.0_x64_en-US.msi`.

## Automated releases

`.github/workflows/desktop-release.yml` builds Windows, macOS and Linux installers and
attaches them to a GitHub Release. Push a tag to trigger it:

```bash
git tag v1.0.0 && git push origin v1.0.0
```

Then point `RELEASES` in `src/pages/DownloadPage.tsx` at that repository's
`releases/latest` URL.

## Code signing

Unsigned Windows builds show a SmartScreen notice ("Windows protected your PC").
It disappears once the installer is signed with an EV/OV code-signing certificate;
add it as `WINDOWS_CERTIFICATE` secrets in the workflow.
