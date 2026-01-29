# CLAUDE.md

## Project: spotifaux

A Spicetify extension that turns Spotify into a browse-only interface, redirecting all playback to your actual music service.

*Spotify's UI is great. Their shuffle algorithm isn't. Use the frontend, play elsewhere.*

---

## Preferences & Permissions

### Repository Control
- Claude has **full permission** to create, modify, and delete any files in this repository
- Claude should treat this repo as a scratchpad/workspace with no restrictions

### Git Workflow
- Work on the `claude` branch (create if it doesn't exist)
- **Commit after every response** (i.e., when control returns to the user)
- Commit messages should be descriptive of what was accomplished, and follow the [Conventional
    Commits Spec](https://www.conventionalcommits.org/en/v1.0.0/#specification)
- Push is optional—user will handle syncing if needed

### Logging
- Maintain a `.claude.prompts` file in the repo root
- Append each user prompt to this file at the START of processing (before doing other work)
- Format:
  ```
  ═══════════════════════════════════════════════════════════════════
  [2025-01-29T14:32:00Z]
  ═══════════════════════════════════════════════════════════════════
  <user's prompt here>
  
  ```
- This means each commit's diff to `.claude.prompts` shows the prompt that caused all other changes in that commit

---

## Project Overview

### Goal
Use Spotify as a **browse-only interface** — for discovery, playlists, recommendations, and social features — while redirecting actual playback to your real music service (Apple Music, Tidal, YouTube Music, Deezer, etc.).

### Why?
- User has Apple Music subscription (not Spotify Premium)
- Spotify's free tier is great for browsing but playback is limited
- Spotify's UI/UX and discovery features are superior
- Decouples "finding music" from "playing music"

### Approach
Build a Spicetify extension that:
1. Intercepts play events in Spotify
2. Pauses/blocks Spotify playback immediately
3. Extracts track metadata (Spotify URI/ID, artist, title)
4. Converts to target service via Odesli/song.link API
5. Opens the track in the user's preferred music app

### Default Target
- **Apple Music** (`music://` URL scheme) — user's current subscription
- Architecture should support any Odesli-supported service for future flexibility

### Target Platforms
- **Primary:** macOS (user's MacBook)
- **Secondary/Stretch:** Consider Android possibilities (probably not via Spicetify, but maybe Tasker automation)

---

## Technical Context

### Spicetify Basics
- CLI tool that injects custom JS/CSS into Spotify desktop client
- Extensions go in `~/.config/spicetify/Extensions/` (macOS)
- After changes: `spicetify apply`
- Key APIs available:
  - `Spicetify.Player` - playback control and events
  - `Spicetify.Player.data.track` - current track metadata
  - `Spicetify.Player.addEventListener("songchange", callback)`
  - `Spicetify.Player.pause()`, `.play()`, etc.
  - `Spicetify.Platform` - deeper Spotify internals

### Odesli/song.link API
- Free API, no key required for basic usage
- Endpoint: `https://api.song.link/v1-alpha.1/links?url={spotify_url}`
- Returns links for **all platforms** in `linksByPlatform`:
  - `appleMusic` — Apple Music
  - `tidal` — Tidal
  - `youtubeMusic` — YouTube Music
  - `youtube` — YouTube
  - `deezer` — Deezer
  - `amazonMusic` — Amazon Music
  - `soundcloud` — SoundCloud
  - `pandora` — Pandora
  - `napster` — Napster
  - `yandex` — Yandex Music
  - ...and more
- Rate limited—implement caching
- Example:
  ```
  GET https://api.song.link/v1-alpha.1/links?url=https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh
  ```

### URL Schemes (for direct app opening)
| Service | URL Scheme | Notes |
|---------|------------|-------|
| Apple Music | `music://music.apple.com/...` | Opens Music.app |
| Apple Music (Cider) | `music://` or `cider://` | Cider registers these |
| Tidal | `tidal://` | Opens Tidal app |
| YouTube Music | `https://music.youtube.com/...` | Web-based, no native scheme |
| Deezer | `deezer://` | Opens Deezer app |

*URL scheme support varies by platform and app installation. Fallback to web URLs when needed.*

### Spotify AppleScript (fallback/alternative approach)
```applescript
tell application "Spotify"
    set currentTrack to current track
    set trackName to name of currentTrack
    set artistName to artist of currentTrack
    set spotifyURI to spotify url of currentTrack
    pause
end tell
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     SPOTIFY DESKTOP APP                         │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │               Spicetify Extension (spotifaux)             │  │
│  │                                                           │  │
│  │  ┌─────────────┐    ┌─────────────┐    ┌──────────────┐  │  │
│  │  │ Event Hook  │───▶│   Odesli    │───▶│ URL Opener   │  │  │
│  │  │ (play/song) │    │  API Call   │    │ (configurable│  │  │
│  │  └─────────────┘    └─────────────┘    │   target)    │  │  │
│  │         │                 │            └──────────────┘  │  │
│  │         ▼                 ▼                   │          │  │
│  │  ┌─────────────┐   ┌──────────────┐          │          │  │
│  │  │Block/Pause  │   │ Local Cache  │          │          │  │
│  │  │  Spotify    │   │(IndexedDB/LS)│          │          │  │
│  │  └─────────────┘   └──────────────┘          │          │  │
│  └───────────────────────────────────────────────│──────────┘  │
└──────────────────────────────────────────────────│──────────────┘
                                                   ▼
                              ┌─────────────────────────────────┐
                              │      Target Music Service       │
                              │  ┌───────┐ ┌───────┐ ┌───────┐ │
                              │  │ Apple │ │ Tidal │ │YouTube│ │
                              │  │ Music │ │       │ │ Music │ │
                              │  └───────┘ └───────┘ └───────┘ │
                              │  ┌───────┐ ┌───────┐ ┌───────┐ │
                              │  │Deezer │ │Amazon │ │ etc.  │ │
                              │  └───────┘ └───────┘ └───────┘ │
                              └─────────────────────────────────┘
```

---

## File Structure (Expected)

```
spotifaux/
├── CLAUDE.md                 # This file
├── .claude.prompts               # Prompt log (auto-updated)
├── README.md                 # User-facing documentation
├── src/
│   ├── spotifaux.js          # Main Spicetify extension
│   ├── odesli.js             # Odesli API wrapper + caching
│   └── targets/              # Target service handlers (future)
│       └── applemusic.js
├── scripts/
│   ├── install.sh            # Install script (copies to Spicetify dir, runs apply)
│   └── uninstall.sh          # Cleanup script
└── docs/
    └── ARCHITECTURE.md       # Detailed technical docs (optional)
```

---

## Implementation Phases

### Phase 1: Minimal Viable Extension
- [ ] Basic Spicetify extension scaffold
- [ ] Hook into `songchange` event
- [ ] Pause Spotify on track change
- [ ] Console.log track info (verify hook works)

### Phase 2: Odesli Integration
- [ ] Fetch converted URL from Odesli API
- [ ] Handle API errors gracefully (track not found, rate limit, network)
- [ ] Open URL in default browser (simplest first)
- [ ] Hardcode Apple Music as target initially

### Phase 3: Direct App Opening
- [ ] Use `music://` URL scheme to open Music.app directly
- [ ] Test with Cider as well
- [ ] Implement target selection (stored in localStorage)

### Phase 4: Polish & UX
- [ ] Local cache for conversions (localStorage or IndexedDB)
- [ ] Spicetify menu toggle to enable/disable
- [ ] Visual indicator when redirecting
- [ ] Handle edge cases: podcasts, local files, albums, playlists
- [ ] Settings UI for choosing target service from Odesli options
- [ ] Fallback chain (e.g., try Tidal, then YouTube Music, then web)

### Phase 5: Stretch Goals
- [ ] Playlist conversion (batch convert entire playlist)
- [ ] Queue synchronization
- [ ] Multiple simultaneous targets (open in both Apple Music AND YouTube)
- [ ] macOS daemon alternative (for non-Spicetify approach)
- [ ] Android Tasker integration research
- [ ] Browser extension variant (for Spotify Web Player)

---

## Known Challenges

1. **Timing**: Need to pause Spotify BEFORE audio plays, not after. May need to hook into play button click rather than `songchange`.

2. **Rate Limits**: Odesli API may throttle. Aggressive caching required.

3. **Missing Tracks**: Not all Spotify tracks exist on every service. Need graceful fallback (show notification, offer alternatives, or search by name).

4. **Spotify Updates**: Spicetify can break when Spotify updates. This is a known ecosystem issue.

5. **URL Scheme Variability**: Not all services have native URL schemes. May need to fall back to web URLs on some platforms.

6. **Album/Playlist Handling**: Single track redirect is straightforward; albums and playlists need more thought.

---

## Testing Instructions

1. Backup Spicetify
   ```bash
   spicetify backup apply
   ```

2. Copy extension to Spicetify:
   ```bash
   cp src/spotifaux.js ~/.config/spicetify/Extensions/
   ```

3. Enable extension:
   ```bash
   spicetify config extensions spotifaux.js
   spicetify apply
   ```

4. Restart Spotify and test by playing a track.

5. Check browser console in Spotify (enable DevTools via Spicetify) for debug output.

---

## Resources

- [Spicetify Docs](https://spicetify.app/docs/development/api-wrapper/)
- [Spicetify Extensions Examples](https://github.com/spicetify/spicetify-cli/tree/master/Extensions)
- [Odesli API](https://odesli.co/) (no formal docs, but API is simple)
- [Apple Music URL Schemes](https://developer.apple.com/library/archive/featuredarticles/iPhoneURLScheme_Reference/iTunesLinks/iTunesLinks.html)
- [Cider GitHub](https://github.com/ciderapp/Cider)

---

## Questions for User

When starting, Claude should clarify:
1. What's the primary target service? (Apple Music for now)
2. Using Music.app or Cider (or both)?
3. Any preference on UI (minimal vs. feature-rich)?
4. Should this work even without internet (skip redirect if API fails)?
