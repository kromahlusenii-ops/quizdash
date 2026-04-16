//////////////////////////////////////////////////////////////////////////////////////
// Entry Point (modified for React integration)

var initPacman = function(canvasEl, options) {
    options = options || {};
    loadHighScores();
    initRenderer(canvasEl);
    atlas.create();
    // Attach swipe listeners to the canvas itself, NOT the parent element.
    // Siblings of the canvas (e.g. React overlays) would otherwise have their
    // touchstart preventDefaulted as events bubble up, making buttons untappable.
    initSwipe(canvasEl);
    gameMode = GAME_PACMAN;
    practiceMode = false;

    if (options.onGameOver) {
        setOnGameOver(options.onGameOver);
    }

    switchState(newGameState);
    executive.init();
};

// Expose API on window for TypeScript wrapper
window.__pacman = {
    initPacman: initPacman,
    executive: executive,
    energizer: energizer,
    getScore: getScore,
    cleanupInput: cleanupInput,
    audio: audio,
};
