# Study Banger

Study Banger is a Spicetify custom app for focused work sessions. It combines a configurable Pomodoro-style timer with Spotify playlist playback, a dashboard view, and a minimal focus view.

## Features

- Dashboard view for setup and session control
- Minimal Focus view with a large centered timer
- Timer presets with radio-style selection
- Custom focus and break durations
- Spotify playlist playback through `Spicetify.Player.playUri`
- Custom playlists via Spotify playlist URL or `spotify:playlist:...` URI
- Default study playlists, including the three original Study Banger playlists
- Playlist artwork loading through Spicetify metadata APIs with fallback handling
- Generated fallback covers when Spotify artwork is missing or expired
- Optional Focus view elements:
  - mode label
  - current song
  - 24-hour clock
  - date
  - controls
- Focus controls can be hidden and temporarily shown on hover/focus
- `Escape` returns from Focus view to the dashboard
- Best-effort restore of the previous playback context when ending a study session

## Installation

There are two supported installation paths:

1. Marketplace discovery, if the app is listed in Spicetify Marketplace
2. Manual build and deploy from this repository

Do **not** copy the source repository directly into Spicetify's `CustomApps` folder. Build the app first, then deploy the generated files.

## Install through Spicetify Marketplace

Spicetify Marketplace can browse custom apps, but custom apps may still require manual installation steps after discovery.

1. Install Spicetify and Spicetify Marketplace.
2. Open Spotify.
3. Open Marketplace from the Spotify sidebar.
4. Search for `Study Banger`.
5. Open the app listing.
6. Follow the listing instructions. If Marketplace only downloads or opens the source repository, continue with the manual build steps below.

The deployed custom app folder must eventually exist here on Windows:

```text
%APPDATA%\spicetify\CustomApps\study-banger
```

and should contain the compiled files:

```text
extension.js
index.js
manifest.json
style.css
```

Then enable the app:

```powershell
spicetify config custom_apps study-banger
spicetify apply
```

If multiple custom apps are installed, check the current config first:

```powershell
spicetify config custom_apps
```

## Manual build and deploy

### 1. Clone or open the repository

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

Copy the generated files from `dist/` to:

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

### 5. Enable the app

```powershell
spicetify config custom_apps study-banger
spicetify apply
```

Restart Spotify after applying if the app does not appear immediately.

## VS Code task workflow

If this repo is inside your `Default` workspace and the deploy task is configured, use:

```text
Tasks: Run Task -> Deploy Study Banger
```

The deploy task should:

1. run `npm install` if `node_modules` is missing
2. run `npm run build-local`
3. copy the generated build output to Spicetify's `CustomApps\study-banger`
4. run `spicetify apply`

## Timer behavior

When a focus or break block reaches zero, the app switches to the next mode and pauses. The next block starts only when the user presses `Start` again.

## Playlist covers

The first three original Study Banger playlists keep their original hardcoded cover URLs. If one of those legacy Spotify CDN URLs no longer loads, the app automatically falls back to a generated cover.

For the other playlists and custom playlists, the app does not use Spotify's public Web API playlist image endpoint by default. That endpoint can return `429 Too Many Requests` in the Spotify Desktop/Spicetify runtime.

Instead, the app follows the pattern used by other Spicetify extensions:

1. `Spicetify.Platform.PlaylistAPI.getMetadata(uri)`
2. fallback to `Spicetify.CosmosAsync.get("sp://core-playlist/v1/playlist/" + uri)`
3. fallback to artwork already visible in the Spotify DOM
4. generated fallback cover

Fetched playlist artwork is cached in local storage for six hours because Spotify playlist image URLs are temporary.

## Troubleshooting

### The app opens but looks broken

This usually means the source repo was copied directly into Spicetify instead of the compiled build output. Run the build and deploy only the generated files from `dist/`.

### The app does not appear in Spotify

Check that the deployed folder name is exactly:

```text
study-banger
```

Then verify the Spicetify config:

```powershell
spicetify config custom_apps
```

Apply again:

```powershell
spicetify apply
```

Then restart Spotify.

### Playlist covers do not load

The app falls back to generated covers when a Spotify image URL is expired, missing, or blocked. Use `Refresh covers` inside the app after opening or scrolling the relevant playlists in Spotify.

### The previous playlist does not restore exactly

Playback restore is best effort. The app stores the current Spotify context or track when the study session starts and tries to play it again on exit. It cannot reliably restore queue state, exact playback position, or all autoplay/radio contexts.

## Development notes

Do not commit build output:

```gitignore
dist/
node_modules/
diagnostics/
tsc-errors.txt
*.log
```

If `dist/` was previously tracked, remove it from Git while keeping the local files:

```powershell
git rm --cached -r dist
```

## Screenshots for the README

Recommended screenshots before publishing:

1. Start screen / ready screen
2. Dashboard with timer presets visible
3. Playlist section with covers and generated fallbacks
4. Minimal Focus view with timer and current song
5. Optional: Marketplace listing screenshot after publication

Store them in:

```text
docs/screenshots/
```

Suggested names:

```text
docs/screenshots/ready.png
docs/screenshots/dashboard.png
docs/screenshots/playlists.png
docs/screenshots/focus-view.png
docs/screenshots/marketplace.png
```

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request or contributing to the repository.

## Code of Conduct

Please read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before contributing.

## License

The project is made available under the [MIT License](LICENSE).
