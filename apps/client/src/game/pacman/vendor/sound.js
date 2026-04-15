/* Sound handlers added by Dr James Freeman who was sad such a great reverse was a silent movie  */

var audio = new preloadAudio();

function audioTrack(url, volume) {
    var audio = new Audio(url);
    if (volume) audio.volume = volume;
    audio.load();
    var looping = false;
    this.play = function(noResetTime) {
        playSound(noResetTime);
    };
    this.startLoop = function(noResetTime) {
        if (looping) return;
        audio.addEventListener('ended', audioLoop);
        audioLoop(noResetTime);
        looping = true;
    };
    this.stopLoop = function(noResetTime) {
        try{ audio.removeEventListener('ended', audioLoop) } catch (e) {};
        audio.pause();
        if (!noResetTime) audio.currentTime = 0;
        looping = false;
    };
    this.isPlaying = function() {
        return !audio.paused;
    };
    this.isPaused = function() {
        return audio.paused;
    }; 
    this.stop = this.stopLoop;

    function audioLoop(noResetTime) {
        playSound(noResetTime);
    }
    function playSound(noResetTime) {
        // for really rapid sound repeat set noResetTime
        if(!audio.paused) {
            audio.pause();
            if (!noResetTime ) audio.currentTime = 0;
        }
        try{
            var playPromise = audio.play();
            if(playPromise) {
                playPromise.then(function(){}).catch(function(err){});
            }
        } 
        catch(err){ console.error(err) }
    }
}


function preloadAudio() {

    this.credit            = new audioTrack('/pacman/sounds/credit.mp3');
    this.coffeeBreakMusic  = new audioTrack('/pacman/sounds/coffee-break-music.mp3');
    this.die               = new audioTrack('/pacman/sounds/miss.mp3');
    this.ghostReturnToHome = new audioTrack('/pacman/sounds/ghost-return-to-home.mp3');
    this.eatingGhost       = new audioTrack('/pacman/sounds/eating-ghost.mp3');
    this.ghostTurnToBlue   = new audioTrack('/pacman/sounds/ghost-turn-to-blue.mp3', 0.5);
    this.eatingFruit       = new audioTrack('/pacman/sounds/eating-fruit.mp3');
    this.ghostSpurtMove1   = new audioTrack('/pacman/sounds/ghost-spurt-move-1.mp3');
    this.ghostSpurtMove2   = new audioTrack('/pacman/sounds/ghost-spurt-move-2.mp3');
    this.ghostSpurtMove3   = new audioTrack('/pacman/sounds/ghost-spurt-move-3.mp3');
    this.ghostSpurtMove4   = new audioTrack('/pacman/sounds/ghost-spurt-move-4.mp3');
    this.ghostNormalMove   = new audioTrack('/pacman/sounds/ghost-normal-move.mp3');
    this.extend            = new audioTrack('/pacman/sounds/extend.mp3');
    this.eating            = new audioTrack('/pacman/sounds/eating.mp3', 0.5);
    this.startMusic        = new audioTrack('/pacman/sounds/start-music.mp3');

    this.ghostReset = function(noResetTime) {
        for (var s in this) {
            if (s == 'silence' || s == 'ghostReset' ) return;
            if (s.match(/^ghost/)) this[s].stopLoop(noResetTime);
        }
    };

    this.silence = function(noResetTime) {
        for (var s in this) {
            if (s == 'silence' || s == 'ghostReset' ) return;
            this[s].stopLoop(noResetTime);
        }
    }
}
