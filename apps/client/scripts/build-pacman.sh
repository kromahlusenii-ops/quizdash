#!/bin/bash
# Concatenates Pac-Man vendor source files into a single bundle for the browser.
# Output goes to public/pacman/pacman-bundle.js

VENDOR_DIR="$(dirname "$0")/../src/game/pacman/vendor"
OUTPUT="$(dirname "$0")/../public/pacman/pacman-bundle.js"

echo "(function(){" > "$OUTPUT"

for file in \
    inherit.js \
    sound.js \
    random.js \
    game.js \
    direction.js \
    Map.js \
    colors.js \
    mapgen.js \
    atlas.js \
    renderers.js  \
    hud.js \
    galagaStars.js \
    Button.js \
    Menu.js \
    inGameMenu.js \
    sprites.js \
    Actor.js \
    Ghost.js \
    Player.js \
    actors.js \
    targets.js \
    ghostCommander.js \
    ghostReleaser.js \
    elroyTimer.js \
    energizer.js \
    fruit.js \
    executive.js \
    states.js \
    input.js \
    cutscenes.js \
    maps.js \
    vcr.js \
    main.js
do
    cat "$VENDOR_DIR/$file" >> "$OUTPUT"
    echo "" >> "$OUTPUT"
done

echo "})();" >> "$OUTPUT"

echo "Built pacman-bundle.js ($(wc -c < "$OUTPUT") bytes)"
