// spotifaux - Browse Spotify, Play Elsewhere
// Phase 2: Open in song.link (redirects to Apple Music)

(function Spotifaux() {
    'use strict';

    const LOG_PREFIX = '[spotifaux]';

    // Track the last processed URI to avoid duplicate processing
    let lastProcessedUri = null;

    function log(...args) {
        console.log(LOG_PREFIX, ...args);
    }

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

    // Convert Spotify URI to song.link URL
    function getSongLinkUrl(spotifyUri) {
        // spotify:track:4JHxhiaDpp5omCMtOs1QrB -> https://song.link/s/4JHxhiaDpp5omCMtOs1QrB
        const parts = spotifyUri.split(':');
        if (parts.length === 3 && parts[1] === 'track') {
            return `https://song.link/s/${parts[2]}`;
        }
        // Fallback: use full Spotify URL
        if (parts.length === 3) {
            return `https://song.link/https://open.spotify.com/${parts[1]}/${parts[2]}`;
        }
        return null;
    }

    function openSongLink(trackInfo) {
        const url = getSongLinkUrl(trackInfo.uri);
        if (!url) {
            log('Could not generate song.link URL for:', trackInfo.uri);
            Spicetify.showNotification('Could not open song.link', true);
            return;
        }

        log('Opening song.link:', url);
        window.open(url, '_blank');
        Spicetify.showNotification(`Opening: ${trackInfo.name}`);
    }

    function handlePlayback(eventSource) {
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

        // Open song.link
        openSongLink(trackInfo);
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
        Spicetify.Player.addEventListener('songchange', () => {
            handlePlayback('songchange');
        });

        // Also hook into play/pause to catch play actions
        Spicetify.Player.addEventListener('onplaypause', () => {
            if (Spicetify.Player.isPlaying()) {
                handlePlayback('onplaypause');
            }
        });

        log('Extension initialized');
        log('Mode: Open song.link (click Apple Music to play)');
    }

    init();
})();
