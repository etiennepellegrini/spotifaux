// spotifaux - Browse Spotify, Play Elsewhere
// Phase 2: Odesli Integration + Apple Music Redirect

(function Spotifaux() {
    'use strict';

    const LOG_PREFIX = '[spotifaux]';
    const ODESLI_API = 'https://api.song.link/v1-alpha.1/links';
    const CORS_PROXY = 'https://corsproxy.io/?';  // Needed because Spotify blocks cross-origin requests
    const TARGET_PLATFORM = 'appleMusic';
    const CACHE_KEY = 'spotifaux_cache';
    const CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

    // Track the last processed URI to avoid duplicate processing
    let lastProcessedUri = null;

    function log(...args) {
        console.log(LOG_PREFIX, ...args);
    }

    // Simple localStorage cache for Odesli lookups
    const cache = {
        get(spotifyUri) {
            try {
                const data = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
                const entry = data[spotifyUri];
                if (entry && Date.now() - entry.timestamp < CACHE_MAX_AGE) {
                    return entry.value;
                }
            } catch (e) {
                log('Cache read error:', e);
            }
            return null;
        },

        set(spotifyUri, value) {
            try {
                const data = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
                data[spotifyUri] = { value, timestamp: Date.now() };
                localStorage.setItem(CACHE_KEY, JSON.stringify(data));
            } catch (e) {
                log('Cache write error:', e);
            }
        }
    };

    function getTrackInfo() {
        // Method 1: Spicetify.Player.data.item (newer API)
        if (Spicetify.Player.data?.item) {
            const item = Spicetify.Player.data.item;
            return {
                name: item.name,
                artist: item.artists?.[0]?.name || item.metadata?.artist_name || 'Unknown',
                album: item.album?.name || item.metadata?.album_title || 'Unknown',
                uri: item.uri,
            };
        }

        // Method 2: Spicetify.Player.data.track (older API)
        if (Spicetify.Player.data?.track) {
            const track = Spicetify.Player.data.track;
            return {
                name: track.metadata?.title || 'Unknown',
                artist: track.metadata?.artist_name || 'Unknown',
                album: track.metadata?.album_title || 'Unknown',
                uri: track.uri,
            };
        }

        return null;
    }

    // Convert Spotify URI to open.spotify.com URL for Odesli
    function spotifyUriToUrl(uri) {
        // spotify:track:4JHxhiaDpp5omCMtOs1QrB -> https://open.spotify.com/track/4JHxhiaDpp5omCMtOs1QrB
        const parts = uri.split(':');
        if (parts.length === 3) {
            return `https://open.spotify.com/${parts[1]}/${parts[2]}`;
        }
        return null;
    }

    async function fetchOdesliLink(spotifyUri) {
        // Check cache first
        const cached = cache.get(spotifyUri);
        if (cached) {
            log('Cache hit for', spotifyUri);
            return cached;
        }

        const spotifyUrl = spotifyUriToUrl(spotifyUri);
        if (!spotifyUrl) {
            log('Could not convert URI to URL:', spotifyUri);
            return null;
        }

        const odesliUrl = `${ODESLI_API}?url=${encodeURIComponent(spotifyUrl)}`;
        const apiUrl = `${CORS_PROXY}${encodeURIComponent(odesliUrl)}`;
        log('Fetching from Odesli (via proxy):', odesliUrl);

        try {
            const response = await fetch(apiUrl);

            if (!response.ok) {
                if (response.status === 429) {
                    log('Rate limited by Odesli API');
                } else {
                    log('Odesli API error:', response.status, response.statusText);
                }
                return null;
            }

            const data = await response.json();
            log('Odesli response:', data);

            // Extract Apple Music link
            const appleMusic = data.linksByPlatform?.[TARGET_PLATFORM];
            if (appleMusic?.url) {
                const result = {
                    url: appleMusic.url,
                    nativeUrl: appleMusic.nativeAppUriDesktop || appleMusic.nativeAppUriMobile,
                    entityUniqueId: appleMusic.entityUniqueId,
                };
                cache.set(spotifyUri, result);
                return result;
            }

            log('No Apple Music link found for this track');
            // Cache the miss to avoid repeated lookups
            cache.set(spotifyUri, { notFound: true });
            return { notFound: true };

        } catch (error) {
            log('Odesli fetch error:', error);
            return null;
        }
    }

    function openInAppleMusic(linkData) {
        if (!linkData || linkData.notFound) {
            log('Cannot open: no Apple Music link available');
            Spicetify.showNotification('Track not found on Apple Music', true);
            return;
        }

        // Convert web URL to music:// URL scheme for direct app opening
        // https://music.apple.com/us/album/... -> music://music.apple.com/us/album/...
        let targetUrl = linkData.url;
        if (targetUrl.startsWith('https://music.apple.com')) {
            targetUrl = targetUrl.replace('https://', 'music://');
        }

        log('Opening in Apple Music:', targetUrl);
        window.open(targetUrl, '_blank');
    }

    async function handlePlayback(eventSource) {
        // Get track info first to check if we should process
        const trackInfo = getTrackInfo();

        if (!trackInfo) {
            log('No track info available');
            return;
        }

        // Skip if we already processed this exact URI (prevents double-processing)
        if (trackInfo.uri === lastProcessedUri) {
            log('Skipping duplicate processing for:', trackInfo.uri);
            return;
        }

        log(`Processing track (source: ${eventSource}):`, trackInfo.name, '-', trackInfo.artist);

        // Pause Spotify
        Spicetify.Player.pause();
        log('Playback paused');

        // Mark as processed
        lastProcessedUri = trackInfo.uri;

        // Fetch Apple Music link and open
        const linkData = await fetchOdesliLink(trackInfo.uri);
        openInAppleMusic(linkData);
    }

    function init() {
        log('Extension loading...');

        // Wait for Spicetify APIs to be ready
        if (!Spicetify?.Player?.addEventListener) {
            log('Spicetify not ready, retrying in 300ms...');
            setTimeout(init, 300);
            return;
        }

        log('Spicetify API ready');

        // Register song change listener
        Spicetify.Player.addEventListener('songchange', (event) => {
            handlePlayback('songchange');
        });

        // Also hook into play/pause to catch play actions
        Spicetify.Player.addEventListener('onplaypause', (event) => {
            if (Spicetify.Player.isPlaying()) {
                handlePlayback('onplaypause');
            }
        });

        log('Extension initialized');
        log('Target: Apple Music (Music.app)');
        log('Status: Phase 2 - Odesli Integration');
    }

    init();
})();
