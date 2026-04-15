//////////////////////////////////////////////////////////////////////////////////////
// Entry Point (modified for React integration)

var initPacman = function(canvasEl, options) {
    options = options || {};
    loadHighScores();
    initRenderer(canvasEl);
    atlas.create();
    initSwipe(canvasEl.parentElement);
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
