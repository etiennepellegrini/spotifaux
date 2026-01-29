// spotifaux - Browse Spotify, Play Elsewhere
// Phase 1: Minimal Viable Extension

(function Spotifaux() {
    'use strict';

    const LOG_PREFIX = '[spotifaux]';

    function log(...args) {
        console.log(LOG_PREFIX, ...args);
    }

    function getTrackInfo() {
        // Try multiple ways to get track data (API varies by Spicetify version)

        // Method 1: Spicetify.Player.data.item (newer API)
        if (Spicetify.Player.data?.item) {
            const item = Spicetify.Player.data.item;
            return {
                name: item.name,
                artist: item.artists?.[0]?.name || item.metadata?.artist_name || 'Unknown',
                album: item.album?.name || item.metadata?.album_title || 'Unknown',
                uri: item.uri,
                source: 'data.item'
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
                source: 'data.track'
            };
        }

        // Method 3: Direct methods
        const uri = Spicetify.Player.data?.track?.uri ||
                    Spicetify.Player.data?.item?.uri ||
                    null;

        if (uri) {
            return {
                name: 'Unknown (URI only)',
                artist: 'Unknown',
                album: 'Unknown',
                uri: uri,
                source: 'fallback'
            };
        }

        return null;
    }

    function handlePlayback(eventSource) {
        log(`Handling playback (source: ${eventSource})`);

        // ALWAYS pause first, regardless of whether we can get track info
        Spicetify.Player.pause();
        log('Playback paused');

        // Debug: Log what's available
        log('Spicetify.Player.data:', Spicetify.Player.data);

        // Get track info
        const trackInfo = getTrackInfo();

        if (trackInfo) {
            log('Track detected:', trackInfo);
            log('Spotify URI:', trackInfo.uri);
        } else {
            log('Could not extract track info');
            log('Available Player keys:', Object.keys(Spicetify.Player));
            if (Spicetify.Player.data) {
                log('Available data keys:', Object.keys(Spicetify.Player.data));
            }
        }

        // TODO Phase 2: Call Odesli API to get Apple Music link
        // TODO Phase 3: Open in Music.app via music:// URL scheme
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
        log('Spicetify version:', Spicetify.Platform?.version || 'unknown');

        // Register song change listener
        Spicetify.Player.addEventListener('songchange', (event) => {
            log('songchange event fired', event);
            handlePlayback('songchange');
        });
        log('Registered songchange listener');

        // Also hook into play/pause to catch play actions
        Spicetify.Player.addEventListener('onplaypause', (event) => {
            log('onplaypause event fired, isPlaying:', Spicetify.Player.isPlaying());
            if (Spicetify.Player.isPlaying()) {
                handlePlayback('onplaypause');
            }
        });
        log('Registered play/pause listener');

        log('Extension initialized successfully!');
        log('Target: Apple Music (Music.app)');
        log('Status: Phase 1 - Intercept & Log');
    }

    // Start initialization
    init();
})();
