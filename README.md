# Study Banger

Study Banger is a Spicetify custom app for focused work sessions. It combines a configurable Pomodoro-style timer with Spotify playlist playback and a minimal focus view.

## Why this fork exists

The original app was difficult to install correctly and could render without working playback when users copied the source folder directly into Spicetify. This fork treats the project as a buildable Spicetify custom app: build first, then deploy the generated files.

## Features

- Dashboard view for setup and control
- Separate minimal Focus view
- Timer presets with radio-style selection
- Custom work/break duration
- Spotify playlist playback via `Spicetify.Player.playUri`
- Custom playlists via Spotify playlist URL or `spotify:playlist:...` URI
- Playlist metadata and covers are cached in `localStorage`
- Playlist cover fetches are throttled to reduce Spotify `429 Too Many Requests` errors
- Broken/expired playlist images fall back to generated covers
- Optional Focus view elements:
  - mode label
  - current song
  - 24-hour clock
  - date
  - controls
- Controls can be hidden in Focus view and temporarily shown on hover/focus
- Escape returns from Focus view to the dashboard
- Best-effort restore of the previous playback context when ending a study session

## Timer behavior

When a work or break block reaches zero, the app switches to the next mode and pauses. This is intentional: the next block starts only when the user presses Start again.

## Playlist covers

The app tries to use the same playlist artwork Spotify uses in the library by fetching playlist metadata through Spicetify/Spotify. Results are cached so the app does not request every cover repeatedly on every render.

If Spotify returns `429 Too Many Requests`, wait a few minutes and reload Spotify. Existing cached covers will continue to be used.

## Installation

Do **not** copy the repository source folder directly into Spicetify's `CustomApps` folder. Build the app first.

### 1. Clone or open the project

```powershell
cd "C:\Users\bruch\Daten\VSCode\Default\spicetify-study-banger-app"
```

### 2. Install dependencies

```powershell
npm install
```

### 3. Build

```powershell
npm run build-local
```

This creates the compiled app in:

```text
dist/
```

### 4. Deploy to Spicetify

Copy the generated files to:

```text
%APPDATA%\spicetify\CustomApps\study-banger
```

The deployed folder should contain:

```text
extension.js
index.js
manifest.json
style.css
```

### 5. Enable the custom app

```powershell
spicetify config custom_apps study-banger
spicetify apply
```

If you use several custom apps, check your current config first:

```powershell
spicetify config custom_apps
```

## VS Code task workflow

If this repo is inside your `Default` workspace, use:

```text
Tasks: Run Task -> Deploy Study Banger
```

The deploy task should:

1. run `npm install` if `node_modules` is missing
2. run `npm run build-local`
3. copy the generated build output to Spicetify's `CustomApps\study-banger`
4. run `spicetify apply`

## Troubleshooting

### The app opens but looks broken

Usually this means the source repo was copied directly into Spicetify instead of the compiled build output. Run the build and deploy only the generated files.

### Playlist covers do not load

The app fetches covers slowly and caches them. If Spotify has recently returned `429 Too Many Requests`, reload Spotify later. Expired image URLs are detected and replaced with generated fallback covers.

### The previous playlist does not restore exactly

Restore is best effort. The app stores the current Spotify context/track when the study session starts and tries to play it again on exit. It cannot reliably restore queue state, exact playback position or all autoplay/radio contexts.

## Git notes

Do not commit build output:

```gitignore
dist/
node_modules/
diagnostics/
tsc-errors.txt
*.log
```

If `dist/` was previously tracked, remove it from Git while keeping it locally:

```powershell
git rm --cached -r dist
```

## Suggested commit

```text
fix: cache playlist covers and fallback broken images
```
