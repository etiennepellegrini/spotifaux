// spotifaux - Browse Spotify, Play Elsewhere
// Phase 1: Minimal Viable Extension

(function Spotifaux() {
    'use strict';

    const LOG_PREFIX = '[spotifaux]';

    function log(...args) {
        console.log(LOG_PREFIX, ...args);
    }

    function logTrackInfo(track) {
        if (!track) {
            log('No track data available');
            return;
        }

        const info = {
            name: track.metadata?.title || 'Unknown',
            artist: track.metadata?.artist_name || 'Unknown',
            album: track.metadata?.album_title || 'Unknown',
            uri: track.uri || 'Unknown',
            duration: track.metadata?.duration || 0,
        };

        log('Track detected:', info);
        log('Spotify URI:', info.uri);
        log('Full metadata:', track.metadata);
    }

    function onSongChange() {
        log('Song change detected!');

        // Get current track data
        const playerData = Spicetify.Player.data;
        if (!playerData || !playerData.track) {
            log('No player data available');
            return;
        }

        const track = playerData.track;
        logTrackInfo(track);

        // Pause Spotify immediately
        Spicetify.Player.pause();
        log('Playback paused');

        // TODO Phase 2: Call Odesli API to get Apple Music link
        // TODO Phase 3: Open in Music.app via music:// URL scheme
    }

    function init() {
        log('Extension loading...');

        // Wait for Spicetify APIs to be ready
        if (!Spicetify.Player || !Spicetify.Player.addEventListener) {
            log('Spicetify not ready, retrying in 300ms...');
            setTimeout(init, 300);
            return;
        }

        log('Spicetify API ready');

        // Register song change listener
        Spicetify.Player.addEventListener('songchange', onSongChange);
        log('Registered songchange listener');

        // Also hook into play button to catch the very first play
        // This helps pause before audio actually starts
        Spicetify.Player.addEventListener('onplaypause', (event) => {
            if (Spicetify.Player.isPlaying()) {
                log('Play detected, triggering redirect check...');
                onSongChange();
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
