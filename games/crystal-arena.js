// Crystal Arena (זירת הגבישים) — camera game.
// Four answer crystals sit in the four screen corners. The player holds a
// saturated coloured object — a glove, a ball, a sticky note — and rests it in
// the corner of the answer they want; the game tracks that hue.
// Colour matching needs no model and no runtime dependency, so the game keeps
// working offline, and the same match mask drives the on-screen marker so the
// player can see what the camera is following. Click, touch and keyboard are
// always available and are the guaranteed fallback.
// See CRYSTAL_ARENA_SPEC.md.
(function (global) {
    'use strict';

    // DOM order is the Hebrew reading order (top-right first), which is also the
    // Tab order. Zone rectangles are in *screen* space: the sampled frame is
    // mirrored exactly like the displayed video, so both share one coordinate
    // system and "top-left on screen" is "top-left in the sample".
    const CRYSTAL_ARENA_SLOTS = [
        {id: 'tr', corner: 'top-right', key: 1, x: [0.56, 1.00], y: [0.00, 0.44]},
        {id: 'tl', corner: 'top-left', key: 2, x: [0.00, 0.44], y: [0.00, 0.44]},
        {id: 'br', corner: 'bottom-right', key: 3, x: [0.56, 1.00], y: [0.56, 1.00]},
        {id: 'bl', corner: 'bottom-left', key: 4, x: [0.00, 0.44], y: [0.56, 1.00]},
    ];

    // Arrow-key neighbours in screen space (independent of DOM order).
    const CRYSTAL_ARENA_NEIGHBOURS = {
        tl: {left: 'tr', right: 'tr', up: 'bl', down: 'bl'},
        tr: {left: 'tl', right: 'tl', up: 'br', down: 'br'},
        bl: {left: 'br', right: 'br', up: 'tl', down: 'tl'},
        br: {left: 'bl', right: 'bl', up: 'tr', down: 'tr'},
    };

    // The player holds a saturated object — a glove, a ball, a sticky note — and
    // the game follows that hue. Two earlier attempts tried to find the hand
    // itself: frame differencing never fired at all, and background subtraction
    // fired on anything that was not the wall, because neither had any concept of
    // a hand. Matching a colour the player chose means the tracker knows exactly
    // what it is looking for, so shadows, shoulders and furniture cannot match.
    // Tuning note: the first shipped set of thresholds let occasional wrong
    // answers through — a reflection, a hand passing over a corner on its way
    // somewhere else, or a second object close enough in hue. Four gates were
    // added to fix that: hitMargin, dominance, maxJump and minHueStrength.
    //
    // Those four reject a *wrong* answer. The plain sensitivity floors below
    // (saturation, blob size) only decide whether the object is seen at all, and
    // raising them cost range: a player standing back shows a smaller, blurrier
    // prop, and it stopped registering even on the right corner. They are kept
    // near their original values, and strictness lives in the four gates instead.
    //
    // What one fixed hue could not survive is *changing light*. A calibrated hue
    // is one object under one lamp at one angle: turn the prop over, carry it
    // through the shadow of your own body, let the webcam re-balance when a cloud
    // passes, and the very same object reads several degrees off and a good deal
    // less saturated. The envelope that was tight enough to reject the room was
    // then also tight enough to drop the prop, and the marker died mid-reach.
    //
    // So the tracker no longer follows a colour — it follows an *object*, and
    // colour is one of the things it knows about it. Position, velocity and blob
    // size carry the identity between frames; the colour envelope is allowed to
    // grow to fit what that object turns out to look like. See
    // `createCrystalArenaTracker` for how the growth is earned rather than given.
    const CRYSTAL_ARENA_TRACKER_DEFAULTS = {
        width: 96,             // colour matching is cheap, so sample finer than before
        height: 72,
        hueTolerance: 18,      // degrees either side of the calibrated hue
        minSaturation: 0.38,   // below this a pixel is washed out and its hue is unreliable
        minValue: 0.25,        // below this it is too dark to trust
        minBlobPixels: 18,     // smaller colour islands are reflections, not the prop
        dilate: 1,             // close specular highlights that split the object
        smoothing: 0.4,        // glide toward each new reading
        dwellFrames: 8,        // ~0.25s of resting still in a corner before it counts
        cooldownMs: 600,
        floodLimit: 0.30,      // matching this much of the frame means the wall is that colour
        calibrationShare: 0.16, // this share of the calibration box must be saturated
        minHueStrength: 0.30,  // the calibration box must be dominated by ONE hue
        hitMargin: 0.03,       // trims the quadrant fallback; measured crystals get 0
        dominance: 1.5,        // the winning blob must clearly out-size the runner-up
        maxJump: 0.30,         // a leap this far is a different object, not the same one

        // --- the halo: what might be the object under other light --------
        haloHue: 14,           // extra degrees the candidate envelope allows
        haloSaturation: 0.12,  // and how much duller a candidate pixel may be
        haloValue: 0.08,
        haloMinSaturation: 0.20, // however far the model moves, a halo pixel needs this much colour
        haloMinValue: 0.15,      // and this much light, or its hue means nothing
        haloFloodLimit: 0.55,  // a halo covering this much of the frame is the room, so ignore it

        // --- what may be learned, and how fast it is given back ----------
        maxHueTolerance: 32,   // the learned envelope never widens past this from the calibrated hue
        minSaturationFloor: 0.26, // nor drops its floors below these
        minValueFloor: 0.20,
        learnHueMargin: 3,     // learned bounds clear the observation by this much
        learnSatMargin: 0.04,
        learnValMargin: 0.04,
        minCorePixels: 6,      // core pixels that make a blob trusted, not merely followed
        minGhostPixels: 8,     // outside-the-envelope pixels worth remembering
        learnSizeRatio: 0.35,  // a chain that changed size this much is no longer the same object
        confirmFrames: 5,      // unbroken frames before a chain may teach the model
        graceFrames: 6,        // frames the object may vanish for without breaking the chain
        pendingLimit: 30,      // provisional readings held while the chain is unproven
        relaxPerFrame: 0.004,  // unlearning per idle frame, so a lesson cannot outlive its light
        ghostPenalty: 0.6,     // a halo-only blob loses to a solid one of the same shape
    };

    const CRYSTAL_ARENA_THEME_MOTIFS = {
        base: {
            crystal: '💧', core: '🔮', shard: '✦',
            arena: 'ברכת הראי', particles: ['#B0E0E6', '#78909c', '#ffffff'],
            flash: '#ffffff', spent: '#78909c', scrim: 0.62,
        },
        soldiers: {
            crystal: '🎖️', core: '📡', shard: '✧',
            arena: 'מגרש האותות', particles: ['#BDB76B', '#FFD700', '#e7dfb1'],
            flash: '#FFD700', spent: '#8d8a6a', scrim: 0.6,
        },
        unicorn: {
            crystal: '💎', core: '🌈', shard: '✨',
            arena: 'זירת החלומות', particles: ['#FFB6C1', '#FFD700', '#d0bfff', '#ffffff'],
            flash: '#fff1a8', spent: '#c9a6d8', scrim: 0.58,
        },
        space: {
            crystal: '🛰️', core: '🌌', shard: '✦',
            arena: 'סיפון התצפית', particles: ['#87CEEB', '#1E90FF', '#FFD700', '#ffffff'],
            flash: '#dffaff', spent: '#3f5570', scrim: 0.62,
        },
        dark: {
            crystal: '🔷', core: '🕯️', shard: '✧',
            arena: 'כספת הלילה', particles: ['#BB86FC', '#7dd3c7', '#E0E0E0'],
            flash: '#d9bcff', spent: '#4a4a55', scrim: 0.62,
        },
        code: {
            crystal: '🟩', core: '💻', shard: '#',
            arena: 'רשת הטרמינל', particles: ['#00FF41', '#39FF14', '#008F11'],
            flash: '#c9ffd6', spent: '#1f4a2c', scrim: 0.72,
        },
    };

    const CRYSTAL_ARENA_INPUT_MODE_KEY = 'crystal_arena_input_mode';
    const CRYSTAL_ARENA_COLOUR_KEY = 'crystal_arena_colour_profile';
    const CRYSTAL_ARENA_CALIBRATION_FRAMES = 12; // ~0.4s of a steady colour reading
    const CRYSTAL_ARENA_CALIBRATION_DRIFT = 14;  // degrees of wobble still counted as steady
    const CRYSTAL_ARENA_CORNER_FRAMES = 8;       // frames the object must sit in a marked corner
    const CRYSTAL_ARENA_STEP_NUDGE_MS = 6000;    // after this long on one step, offer help

    // Calibration is a guided opening: the game marks a spot, the player puts the
    // object down and leaves it there. The first spot reads the colour; the four
    // that follow prove every corner actually registers in this room, so a corner
    // that cannot be reached is discovered here and not mid-question.
    const CRYSTAL_ARENA_CALIBRATION_STEPS = [{
        id: 'colour',
        kind: 'colour',
        x: 0.5,
        y: 0.30,
        title: 'הניחו כאן את החפץ',
        hint: 'משהו בצבע חזק — כפפה, כדור, פתק צהוב. הניחו אותו על הסימון ועזבו.',
    }].concat(CRYSTAL_ARENA_SLOTS.map(slot => ({
        id: slot.id,
        kind: 'corner',
        slot: slot.id,
        x: (slot.x[0] + slot.x[1]) / 2,
        y: (slot.y[0] + slot.y[1]) / 2,
        title: 'ועכשיו לכאן',
        hint: 'העבירו את החפץ לסימון והשאירו אותו שם רגע.',
    })));

    // The hue histogram reads a box around whichever spot is being marked.
    function crystalArenaCalibrationBox(step) {
        return {
            x: Math.max(0, Math.min(1 - 0.28, step.x - 0.14)),
            y: Math.max(0, Math.min(1 - 0.36, step.y - 0.18)),
            w: 0.28,
            h: 0.36,
        };
    }
    const CRYSTAL_ARENA_MAX_SHARDS = 14;

    // States in which a question is already on screen. Switching the camera on or
    // off in one of these must return to it rather than start a new round.
    const CRYSTAL_ARENA_PLAY_STATES = ['preparingRound', 'waitingForAnswer', 'answerFeedback'];

    // Why the camera cannot even be asked for, or null when a prompt is possible.
    // getUserMedia is exposed only in a secure context, so an app opened over plain
    // http on a LAN address has no `mediaDevices` at all — that is a hosting
    // problem, not an unsupported browser, and the message must say so.
    function crystalArenaCameraBlocker() {
        if (typeof navigator === 'undefined') return 'אין גישה למצלמה בסביבה הזו. אפשר להמשיך בלחיצות.';
        const media = navigator.mediaDevices;
        if (media && typeof media.getUserMedia === 'function') return null;
        const secure = typeof window === 'undefined' || window.isSecureContext !== false;
        if (!secure) {
            return 'המצלמה עובדת רק ב-HTTPS או ב-localhost. אפשר להמשיך בלחיצות.';
        }
        return 'הדפדפן הזה לא תומך במצלמה. אפשר להמשיך בלחיצות.';
    }

    function crystalArenaCameraErrorNotice(error) {
        const name = error && error.name;
        if (name === 'NotAllowedError' || name === 'SecurityError' || name === 'PermissionDeniedError') {
            return 'ההרשאה למצלמה נדחתה. אפשר לאשר דרך אייקון המצלמה בשורת הכתובת, או להמשיך בלחיצות.';
        }
        if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError') {
            return 'לא נמצאה מצלמה במכשיר. אפשר להמשיך בלחיצות.';
        }
        if (name === 'NotReadableError' || name === 'TrackStartError') {
            return 'המצלמה תפוסה על ידי תוכנה אחרת. אפשר להמשיך בלחיצות.';
        }
        return 'לא הצלחנו להפעיל את המצלמה. אפשר להמשיך בלחיצות.';
    }

    function crystalArenaLuminance(hex) {
        if (!/^#[0-9a-f]{6}$/i.test(hex || '')) return 0;
        const value = parseInt(hex.slice(1), 16);
        return (((value >> 16) & 255) * 0.2126 + ((value >> 8) & 255) * 0.7152 + (value & 255) * 0.0722) / 255;
    }

    // The crystal outline is the game's strongest silhouette cue, so it must not
    // be a palette colour that happens to match the theme background (the dark
    // theme's primary is nearly black on a near-black stage). Pick whichever
    // palette colour sits furthest from the background in luminance.
    function crystalArenaEdgeColor(palette) {
        const background = crystalArenaLuminance(palette.background);
        return ['primary', 'tertiary', 'accent', 'secondary']
            .map(name => palette[name])
            .filter(color => /^#[0-9a-f]{6}$/i.test(color || ''))
            .reduce((best, color) => (
                Math.abs(crystalArenaLuminance(color) - background) > Math.abs(crystalArenaLuminance(best) - background)
                    ? color : best
            ), palette.primary);
    }

    function crystalArenaRgb(hex) {
        if (!/^#[0-9a-f]{6}$/i.test(hex || '')) return [255, 255, 255];
        const value = parseInt(hex.slice(1), 16);
        return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
    }

    function crystalArenaHexAlpha(hex, alpha) {
        if (!/^#[0-9a-f]{6}$/i.test(hex || '')) {
            return hex;
        }
        const value = parseInt(hex.slice(1), 16);
        return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
    }

    function crystalArenaZonePixels(slot, width, height) {
        const x0 = Math.max(0, Math.floor(slot.x[0] * width));
        const x1 = Math.min(width, Math.ceil(slot.x[1] * width));
        const y0 = Math.max(0, Math.floor(slot.y[0] * height));
        const y1 = Math.min(height, Math.ceil(slot.y[1] * height));
        const pixels = [];
        for (let y = y0; y < y1; y += 1) {
            for (let x = x0; x < x1; x += 1) {
                pixels.push(y * width + x);
            }
        }
        return pixels;
    }

    // The part of the camera frame that `object-fit: cover` actually puts on
    // screen. Sampling the whole frame instead tracks a picture the player cannot
    // see: on a portrait phone a 4:3 feed in a 1:2 box shows barely a third of its
    // width, so most of every corner zone sits outside the visible picture and the
    // object has to be pushed far past the crystal before it counts. Returns the
    // source rectangle in frame pixels; a degenerate box falls back to everything.
    function crystalArenaCoverCrop(frameWidth, frameHeight, boxWidth, boxHeight) {
        const whole = {x: 0, y: 0, width: frameWidth, height: frameHeight};
        if (!(frameWidth > 0 && frameHeight > 0 && boxWidth > 0 && boxHeight > 0)) return whole;
        const frameAspect = frameWidth / frameHeight;
        const boxAspect = boxWidth / boxHeight;
        if (Math.abs(frameAspect - boxAspect) < 0.001) return whole;
        if (frameAspect > boxAspect) {
            // Wider than the box: the sides are cropped away.
            const width = frameHeight * boxAspect;
            return {x: (frameWidth - width) / 2, y: 0, width: width, height: frameHeight};
        }
        // Taller than the box: the top and bottom are cropped away.
        const height = frameWidth / boxAspect;
        return {x: 0, y: (frameHeight - height) / 2, width: frameWidth, height: height};
    }

    // True when any two zones share ground. Measured crystal rectangles cannot
    // overlap on a laid-out page, so an overlap means the measurement is garbage
    // (mid-transition, display:none, a stale ref) and must not reach the tracker,
    // where it would make one corner shadow another.
    function crystalArenaZonesOverlap(zones) {
        for (let a = 0; a < zones.length; a += 1) {
            for (let b = a + 1; b < zones.length; b += 1) {
                const one = zones[a];
                const two = zones[b];
                if (one.x[0] < two.x[1] && two.x[0] < one.x[1] &&
                    one.y[0] < two.y[1] && two.y[0] < one.y[1]) return true;
            }
        }
        return false;
    }

    // The box the object must sit in for a corner to actually be *selected*.
    // Only the boundaries facing the middle of the frame move: the outer edges
    // stay pinned to the frame, because the prop is very often held right at the
    // edge of the picture. The effect is a wider neutral band through the centre,
    // so an object drifting past a corner on its way elsewhere no longer answers.
    function crystalArenaHitBox(slot, margin) {
        const inset = margin || 0;
        const squeeze = (low, high) => {
            const from = low > 0 ? low + inset : low;
            const to = high < 1 ? high - inset : high;
            return to > from ? [from, to] : [low, high];
        };
        return {x: squeeze(slot.x[0], slot.x[1]), y: squeeze(slot.y[0], slot.y[1])};
    }

    function validateCrystalArenaSlots(slots) {
        const errors = [];
        if (!Array.isArray(slots) || slots.length !== 4) {
            return ['the arena needs exactly four corner slots'];
        }
        const ids = new Set();
        const keys = new Set();
        const seenPixels = new Set();
        const sample = CRYSTAL_ARENA_TRACKER_DEFAULTS;
        slots.forEach((slot, index) => {
            if (!slot.id || ids.has(slot.id)) errors.push(`invalid or duplicate slot id at ${index}`);
            ids.add(slot.id);
            if (!(slot.key >= 1 && slot.key <= 4) || keys.has(slot.key)) errors.push(`slot ${slot.id} needs a unique key 1-4`);
            keys.add(slot.key);
            if (!CRYSTAL_ARENA_NEIGHBOURS[slot.id]) errors.push(`slot ${slot.id} has no keyboard neighbours`);
            const pixels = crystalArenaZonePixels(slot, sample.width, sample.height);
            if (!pixels.length) {
                errors.push(`slot ${slot.id} covers no sample pixels`);
                return;
            }
            pixels.forEach(pixel => {
                if (seenPixels.has(pixel)) errors.push(`slot ${slot.id} overlaps another zone`);
                seenPixels.add(pixel);
            });
        });
        return Array.from(new Set(errors));
    }

    // Grows the mask by one pixel. A hand in a 64x48 mask breaks into palm and
    // finger islands; without this they compete with each other for marker slots.
    // Ping-pongs between two caller-owned buffers so nothing is allocated per
    // frame; returns whichever buffer holds the result.
    function crystalArenaDilate(source, bufferA, bufferB, width, height, iterations) {
        let input = source;
        let output = bufferA;
        for (let pass = 0; pass < iterations; pass += 1) {
            for (let y = 0; y < height; y += 1) {
                for (let x = 0; x < width; x += 1) {
                    const index = y * width + x;
                    output[index] = (
                        input[index] ||
                        (x > 0 && input[index - 1]) ||
                        (x < width - 1 && input[index + 1]) ||
                        (y > 0 && input[index - width]) ||
                        (y < height - 1 && input[index + width])
                    ) ? 1 : 0;
                }
            }
            if (pass === iterations - 1) break;
            const next = output === bufferA ? bufferB : bufferA;
            input = output;
            output = next;
        }
        return output;
    }

    // Finds the largest connected foreground islands, which are the player's hands
    // (and head/torso when they are not part of the background yet). Used only for
    // the on-screen markers — never for deciding a strike. 4-connected flood fill
    // over a 64x48 mask is a few thousand steps per frame.
    //
    // The optional `probe` turns the same walk into a measurement of each island.
    // It carries the tracker's two envelopes — `core` (pixels the model already
    // accepts) and `member` (pixels the wider halo accepts) — plus the per-pixel
    // hue offset, saturation and value buffers. With it, a blob reports how much
    // of itself is a solid colour match, and what the rest of it actually looks
    // like: the "rest" is the shaded or angled part of the object, and it is what
    // the model has to learn to keep hold of the prop as the light moves.
    function crystalArenaFindBlobs(mask, width, height, minPixels, maxBlobs, probe) {
        const visited = new Uint8Array(mask.length);
        const stack = [];
        const blobs = [];
        for (let start = 0; start < mask.length; start += 1) {
            if (!mask[start] || visited[start]) continue;
            visited[start] = 1;
            stack.length = 0;
            stack.push(start);
            let count = 0;
            let sumX = 0;
            let sumY = 0;
            let minX = width;
            let maxX = -1;
            let minY = height;
            let maxY = -1;
            let corePixels = 0;
            let coreSumX = 0;
            let coreSumY = 0;
            let ghostPixels = 0;
            let ghostHue = 0;
            let ghostWeight = 0;
            let ghostSat = 0;
            let ghostVal = 0;
            while (stack.length) {
                const pixel = stack.pop();
                const x = pixel % width;
                const y = (pixel - x) / width;
                count += 1;
                sumX += x;
                sumY += y;
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
                if (probe) {
                    if (probe.core[pixel]) {
                        corePixels += 1;
                        coreSumX += x;
                        coreSumY += y;
                    } else if (probe.member[pixel]) {
                        // Weighted by saturation for the same reason calibration is:
                        // a vivid pixel says more about the object's colour than a
                        // nearly grey one does.
                        const weight = probe.sat[pixel];
                        ghostPixels += 1;
                        ghostHue += probe.hue[pixel] * weight;
                        ghostWeight += weight;
                        ghostSat += probe.sat[pixel];
                        ghostVal += probe.val[pixel];
                    }
                }
                if (x > 0 && mask[pixel - 1] && !visited[pixel - 1]) { visited[pixel - 1] = 1; stack.push(pixel - 1); }
                if (x < width - 1 && mask[pixel + 1] && !visited[pixel + 1]) { visited[pixel + 1] = 1; stack.push(pixel + 1); }
                if (y > 0 && mask[pixel - width] && !visited[pixel - width]) { visited[pixel - width] = 1; stack.push(pixel - width); }
                if (y < height - 1 && mask[pixel + width] && !visited[pixel + width]) { visited[pixel + width] = 1; stack.push(pixel + width); }
            }
            if (count < minPixels) continue;
            blobs.push({
                // The core pixels are the part we are sure about, so when there are
                // any they own the position. Otherwise a shadow spreading down one
                // side of the object would drag the marker — and the answer — off
                // the thing the player is actually holding.
                x: (corePixels ? coreSumX / corePixels : sumX / count) / width,
                y: (corePixels ? coreSumY / corePixels : sumY / count) / height,
                width: (maxX - minX + 1) / width,
                height: (maxY - minY + 1) / height,
                size: count / mask.length,
                pixels: count,
                corePixels: corePixels,
                ghostPixels: ghostPixels,
                ghost: ghostPixels && ghostWeight ? {
                    offset: ghostHue / ghostWeight,
                    sat: ghostSat / ghostPixels,
                    val: ghostVal / ghostPixels,
                } : null,
            });
        }
        blobs.sort((a, b) => b.pixels - a.pixels);
        return blobs.slice(0, maxBlobs);
    }

    // Converts one RGB pixel to hue (0-360), saturation and value (0-1).
    function crystalArenaHsv(r, g, b, out) {
        const max = r > g ? (r > b ? r : b) : (g > b ? g : b);
        const min = r < g ? (r < b ? r : b) : (g < b ? g : b);
        const chroma = max - min;
        let hue = 0;
        if (chroma !== 0) {
            if (max === r) hue = 60 * (((g - b) / chroma) % 6);
            else if (max === g) hue = 60 * ((b - r) / chroma + 2);
            else hue = 60 * ((r - g) / chroma + 4);
            if (hue < 0) hue += 360;
        }
        out[0] = hue;
        out[1] = max === 0 ? 0 : chroma / max;
        out[2] = max / 255;
        return out;
    }

    // Shortest distance between two hues on the colour wheel, in degrees.
    function crystalArenaHueDistance(a, b) {
        const raw = Math.abs(a - b) % 360;
        return raw > 180 ? 360 - raw : raw;
    }

    // The same distance, but signed: negative below the anchor hue, positive
    // above. Light does not blur an object's hue symmetrically — a warm lamp
    // drags it one way round the wheel and a cool window the other — so the two
    // sides of the envelope have to be able to move independently.
    function crystalArenaHueOffset(hue, anchor) {
        let delta = (hue - anchor) % 360;
        if (delta > 180) delta -= 360;
        else if (delta < -180) delta += 360;
        return delta;
    }

    // What the tracker currently believes the object looks like. `base` is what
    // calibration measured and never changes — every learned bound is clamped
    // against it and unwinds back toward it — while `lo`/`hi`/`sat`/`val` are the
    // live core envelope, which only ever loosens.
    function crystalArenaAppearanceModel(profile, config) {
        const tolerance = profile.tolerance > 0 ? profile.tolerance : config.hueTolerance;
        const base = {lo: tolerance, hi: tolerance, sat: config.minSaturation, val: config.minValue};
        return {
            hue: profile.hue,
            base: base,
            lo: base.lo,
            hi: base.hi,
            sat: base.sat,
            val: base.val,
            adapted: false,
            lessons: 0,
        };
    }

    // The wider envelope around the core. A halo pixel means "this could be the
    // object under different light" — never "this is the object". Halo pixels are
    // followed, drawn faintly and learned from, but on their own they can never
    // answer a question, so widening the halo cannot produce a wrong answer.
    function crystalArenaHaloBounds(model, config) {
        return {
            lo: model.lo + config.haloHue,
            hi: model.hi + config.haloHue,
            sat: Math.max(model.sat - config.haloSaturation, config.haloMinSaturation),
            val: Math.max(model.val - config.haloValue, config.haloMinValue),
        };
    }

    // True once the model has moved away from the calibrated envelope.
    function crystalArenaModelAdapted(model) {
        return model.lo > model.base.lo + 0.01 || model.hi > model.base.hi + 0.01 ||
            model.sat < model.base.sat - 0.001 || model.val < model.base.val - 0.001;
    }

    // How much a blob looks like the continuation of the object already being
    // followed. Position dominates (things move a little between frames and never
    // teleport), blob size is a secondary vote, and a halo-only blob is docked so
    // that a solid match wins whenever there is one to be had. This is the part
    // that makes the tracker follow an object rather than a colour: when the light
    // changes, the blob in the right place with the right size is still the prop
    // even though its hue has moved.
    function crystalArenaBlobScore(blob, predictedX, predictedY, track, config, solid) {
        const distance = Math.hypot(blob.x - predictedX, blob.y - predictedY);
        const proximity = 1 / (1 + distance / Math.max(0.01, config.maxJump));
        const known = track.pixels || blob.pixels;
        const ratio = Math.min(blob.pixels, known) / Math.max(blob.pixels, known);
        return proximity * (0.45 + 0.55 * ratio) * (solid ? 1 : config.ghostPenalty);
    }

    // Finds the dominant saturated hue inside a region — this is what calibration
    // reads when the player holds their object up to the camera. A 36-bin circular
    // histogram is stable against the noise of a single frame, and the returned
    // share tells us whether we actually saw an object or just a dim wall.
    function crystalArenaDominantHue(rgba, width, height, box, options) {
        const config = Object.assign({}, CRYSTAL_ARENA_TRACKER_DEFAULTS, options || {});
        const x0 = Math.max(0, Math.floor(box.x * width));
        const x1 = Math.min(width, Math.ceil((box.x + box.w) * width));
        const y0 = Math.max(0, Math.floor(box.y * height));
        const y1 = Math.min(height, Math.ceil((box.y + box.h) * height));
        const bins = new Float64Array(36);
        const hsv = [0, 0, 0];
        let considered = 0;
        let saturated = 0;
        for (let y = y0; y < y1; y += 1) {
            for (let x = x0; x < x1; x += 1) {
                const offset = (y * width + x) * 4;
                crystalArenaHsv(rgba[offset], rgba[offset + 1], rgba[offset + 2], hsv);
                considered += 1;
                if (hsv[1] < config.minSaturation || hsv[2] < config.minValue) continue;
                saturated += 1;
                // Weight by saturation so a vivid prop outvotes a washed-out wall.
                bins[Math.floor(hsv[0] / 10) % 36] += hsv[1];
            }
        }
        if (!considered || saturated / considered < config.calibrationShare) return null;

        let peak = 0;
        for (let bin = 1; bin < 36; bin += 1) {
            if (bins[bin] > bins[peak]) peak = bin;
        }
        // Refine with the neighbouring bins so the hue is not quantised to 10°.
        const left = bins[(peak + 35) % 36];
        const right = bins[(peak + 1) % 36];
        const total = left + bins[peak] + right;
        const centre = peak * 10 + 5;
        const hue = total ? (centre + (right - left) / total * 10 + 360) % 360 : centre;
        // Saturation mass carried by the peak and its two neighbours, per saturated
        // pixel in the box. A vivid object of one colour scores high; a box holding
        // several different colours spreads its mass and scores low. Calibrating on
        // such a box is what produces a profile that later matches half the room.
        const strength = total / (saturated || 1);
        if (strength < config.minHueStrength) return null;
        return {hue: hue, share: saturated / considered, strength: strength};
    }

    // Object tracker. The player holds a saturated object — a glove, a ball, a
    // sticky note — and calibration measures its colour. Unlike the presence
    // detectors this replaced, it knows exactly *what* it is looking for, so a
    // shadow, a shoulder or a chair simply do not match.
    //
    // Colour alone was not enough to keep hold of it once the light moved. The
    // tracker therefore keeps an appearance model with two envelopes, and a
    // notion of identity that does not depend on colour at all:
    //
    //  * The **core** envelope is the strict one calibration produced. Only core
    //    pixels prove an object is the prop, and only a blob solidly made of them
    //    can charge a corner. Nothing below ever relaxes that rule.
    //  * The **halo** around it is a wider "this could be the same thing in a
    //    different light". Halo blobs are followed and drawn, so the marker stays
    //    on the prop as it passes through a shadow, but a halo blob on its own
    //    can never answer a question.
    //  * A **track** carries identity between frames through position, velocity
    //    and size. That is what makes a blob "the same object" while its colour
    //    is moving, and it is why the candidate is picked by score rather than by
    //    being the biggest one on screen.
    //
    // Learning is the point of all three, and it is gated on continuity rather
    // than on colour. Whenever the object shows a part the core envelope rejects
    // — the shaded side, a face turned to the light, the whole prop after the
    // webcam re-balanced — that reading is set aside as *provisional*, not
    // applied. Only when the same unbroken track lands back on a clean,
    // unambiguous core sighting is the chain proven to have been the prop all
    // along, and the provisional readings are folded into the core envelope. Its
    // having moved there continuously is the evidence; a chain that breaks before
    // it is proven teaches nothing at all.
    //
    // Three things stop that from drifting onto the wall: learned bounds are hard
    // clamped against the calibrated ones, they unwind again while nothing is
    // being tracked, and a widening that makes the core flood the frame is thrown
    // away the moment it does.
    function createCrystalArenaTracker(options) {
        const config = Object.assign({}, CRYSTAL_ARENA_TRACKER_DEFAULTS, options || {});
        let slots = config.slots || CRYSTAL_ARENA_SLOTS;
        let hitBoxes = [];
        const size = config.width * config.height;
        // 0 = no match, 1 = halo, 2 = core. The overlay draws the two levels
        // differently, which doubles as the clearest debugging view available.
        const mask = new Uint8Array(size);
        const coreMask = new Uint8Array(size);
        const memberMask = new Uint8Array(size);
        const dilateA = new Uint8Array(size);
        const dilateB = new Uint8Array(size);
        // Per-pixel appearance, kept so the blob walk can measure an island
        // without converting every pixel to HSV a second time.
        const hueBuf = new Float32Array(size);
        const satBuf = new Float32Array(size);
        const valBuf = new Float32Array(size);
        const probe = {core: coreMask, member: memberMask, hue: hueBuf, sat: satBuf, val: valBuf};
        const hsv = [0, 0, 0];
        // Readings taken while the current chain was still unproven.
        const pending = [];
        let profile = null;
        let model = null;
        let frames = 0;
        let target = null;
        let track = null;
        let chainFrames = 0;
        let chainSolid = false;
        let chainSolidPixels = 0;
        let misses = 0;
        let ghosting = false;
        let learnBlockedUntil = 0;
        let dwellZone = null;
        let dwellFrames = 0;
        let lastHitZone = null;
        let cooldownUntil = 0;

        // The zones the tracker answers from. The default quadrants are a fallback
        // for when nothing has measured the page: they are far larger than the
        // drawn crystals, so an object entering the quadrant fires the answer long
        // before it reaches the crystal the player is aiming at. The component
        // measures the real crystal rectangles and hands them over here, and those
        // need no inset — the drawn shape IS the target.
        function setSlots(nextSlots, margin) {
            if (!Array.isArray(nextSlots) || !nextSlots.length) return;
            slots = nextSlots;
            const inset = margin === undefined ? config.hitMargin : margin;
            hitBoxes = slots.map(slot => Object.assign({id: slot.id}, crystalArenaHitBox(slot, inset)));
            dwellZone = null;
            dwellFrames = 0;
            lastHitZone = null;
        }

        function zoneOf(x, y) {
            for (let index = 0; index < hitBoxes.length; index += 1) {
                const box = hitBoxes[index];
                if (x >= box.x[0] && x <= box.x[1] && y >= box.y[0] && y <= box.y[1]) return box.id;
            }
            return null;
        }

        function snapshot(hit) {
            return {
                hit: hit,
                ready: !!model,
                target: target,
                zone: dwellZone,
                dwell: config.dwellFrames ? Math.min(1, dwellFrames / config.dwellFrames) : 0,
                mask: mask,
                frames: frames,
                // The object is being held by shape and motion while its colour
                // sits outside the core envelope: the marker follows it, but no
                // answer can come from it until the model has learned that look.
                ghost: ghosting,
                adapted: !!(model && model.adapted),
                pending: pending.length,
            };
        }

        // The chain is the evidence that a run of frames was all one object.
        // Dropping it also drops everything provisional, so a reading that was
        // never proven can never be picked up later by accident.
        function breakChain() {
            track = null;
            chainFrames = 0;
            chainSolid = false;
            chainSolidPixels = 0;
            pending.length = 0;
        }

        // Folds the provisional readings into the core envelope. Each one only
        // pushes the bound it actually needs, and every bound is clamped: the
        // envelope can loosen up to the configured limit and no further, whatever
        // the camera reports.
        function learnPending() {
            if (!model || !pending.length) return;
            for (let index = 0; index < pending.length; index += 1) {
                const sample = pending[index];
                if (sample.offset >= 0) {
                    model.hi = Math.min(config.maxHueTolerance,
                        Math.max(model.hi, sample.offset + config.learnHueMargin));
                } else {
                    model.lo = Math.min(config.maxHueTolerance,
                        Math.max(model.lo, -sample.offset + config.learnHueMargin));
                }
                model.sat = Math.max(config.minSaturationFloor,
                    Math.min(model.sat, sample.sat - config.learnSatMargin));
                model.val = Math.max(config.minValueFloor,
                    Math.min(model.val, sample.val - config.learnValMargin));
            }
            pending.length = 0;
            model.lessons += 1;
            model.adapted = crystalArenaModelAdapted(model);
        }

        // A lesson learned under one light must not outlive it. With nothing being
        // tracked the envelope creeps back toward what calibration measured, so a
        // widening that was useful for one reach cannot accumulate over a session
        // into a profile that matches the room.
        function relaxModel() {
            if (!model || !model.adapted) return;
            const degrees = config.relaxPerFrame * config.maxHueTolerance;
            model.lo = Math.max(model.base.lo, model.lo - degrees);
            model.hi = Math.max(model.base.hi, model.hi - degrees);
            model.sat = Math.min(model.base.sat, model.sat + config.relaxPerFrame);
            model.val = Math.min(model.base.val, model.val + config.relaxPerFrame);
            model.adapted = crystalArenaModelAdapted(model);
        }

        // Everything learned, thrown away at once. Used when the widened envelope
        // turns out to match the room: whatever it was taught, it was wrong.
        function revertModel(now) {
            if (!model) return;
            model.lo = model.base.lo;
            model.hi = model.base.hi;
            model.sat = model.base.sat;
            model.val = model.base.val;
            model.adapted = false;
            learnBlockedUntil = now + config.cooldownMs * 8;
        }

        function reset() {
            frames = 0;
            target = null;
            dwellZone = null;
            dwellFrames = 0;
            lastHitZone = null;
            cooldownUntil = 0;
            ghosting = false;
            misses = 0;
            breakChain();
            mask.fill(0);
        }

        function setProfile(next) {
            profile = next ? {hue: next.hue, tolerance: next.tolerance || config.hueTolerance} : null;
            // A new calibration is a new object, or the same object under a light
            // worth re-reading. Either way nothing learned about the old one still
            // applies, so the model starts again from what was just measured.
            model = profile ? crystalArenaAppearanceModel(profile, config) : null;
            learnBlockedUntil = 0;
            reset();
        }

        function ingest(rgba, now) {
            if (!model || !rgba || rgba.length !== size * 4) {
                mask.fill(0);
                target = null;
                ghosting = false;
                return snapshot(null);
            }
            frames += 1;

            const halo = crystalArenaHaloBounds(model, config);
            let core = 0;
            let outer = 0;
            for (let index = 0, offset = 0; index < size; index += 1, offset += 4) {
                crystalArenaHsv(rgba[offset], rgba[offset + 1], rgba[offset + 2], hsv);
                const delta = crystalArenaHueOffset(hsv[0], model.hue);
                hueBuf[index] = delta;
                satBuf[index] = hsv[1];
                valBuf[index] = hsv[2];
                let level = 0;
                if (hsv[1] >= model.sat && hsv[2] >= model.val && delta >= -model.lo && delta <= model.hi) {
                    level = 2;
                    core += 1;
                } else if (hsv[1] >= halo.sat && hsv[2] >= halo.val && delta >= -halo.lo && delta <= halo.hi) {
                    level = 1;
                    outer += 1;
                }
                mask[index] = level;
                coreMask[index] = level === 2 ? 1 : 0;
            }

            // A core match covering most of the frame means the profile hue is also
            // the wall colour; refuse to track rather than fire in every corner. If
            // that only became true after the model widened, the widening is the
            // culprit and goes back.
            if (core / size > config.floodLimit) {
                if (model.adapted) revertModel(now);
                breakChain();
                target = null;
                ghosting = false;
                dwellZone = null;
                dwellFrames = 0;
                return snapshot(null);
            }
            // The same danger one step out: a halo covering half the room would
            // merge the prop into the furniture, so this frame is matched on the
            // core envelope alone.
            const useHalo = (core + outer) / size <= config.haloFloodLimit;
            for (let index = 0; index < size; index += 1) {
                memberMask[index] = mask[index] === 2 || (useHalo && mask[index] === 1) ? 1 : 0;
            }

            const merged = config.dilate > 0
                ? crystalArenaDilate(memberMask, dilateA, dilateB, config.width, config.height, config.dilate)
                : memberMask;
            const blobs = crystalArenaFindBlobs(merged, config.width, config.height, config.minBlobPixels, 4, probe);
            const isSolid = blob => blob.corePixels >= config.minCorePixels;

            // Which island is the object. With a track running, the one that
            // continues its motion at its size wins — that is the whole reason a
            // prop can change colour mid-reach and still be followed. With no
            // track, size decides, except that a solid blob always beats a
            // halo-only one however big the latter looks.
            let found = null;
            if (track) {
                const predictedX = track.x + track.vx;
                const predictedY = track.y + track.vy;
                let best = 0;
                for (let index = 0; index < blobs.length; index += 1) {
                    const blob = blobs[index];
                    const score = crystalArenaBlobScore(blob, predictedX, predictedY, track, config, isSolid(blob));
                    if (!found || score > best) {
                        best = score;
                        found = blob;
                    }
                }
            } else {
                for (let index = 0; index < blobs.length; index += 1) {
                    const blob = blobs[index];
                    if (!found) {
                        found = blob;
                    } else if (isSolid(blob) !== isSolid(found) ? isSolid(blob) : blob.pixels > found.pixels) {
                        found = blob;
                    }
                }
            }

            if (!found) {
                target = null;
                ghosting = false;
                dwellZone = null;
                dwellFrames = 0;
                // Nothing on screen re-arms every corner: the object has left, so
                // bringing it back may answer the same corner again.
                lastHitZone = null;
                // A brief loss is part of ordinary movement — the prop passes
                // behind a hand, the exposure hunts for a moment — so the chain
                // survives it and the readings either side stay connected. A long
                // one is a different reach, and unwinds what was learned.
                misses += 1;
                if (misses > config.graceFrames) {
                    breakChain();
                    relaxModel();
                }
                return snapshot(null);
            }
            misses = 0;
            const solid = isSolid(found);
            ghosting = !solid;

            // Position, velocity and size are the identity. A leap across the frame
            // is a different object rather than the same one moving, so the track
            // restarts there instead of inheriting any credit.
            let jumped = false;
            if (!track) {
                track = {x: found.x, y: found.y, vx: 0, vy: 0, pixels: found.pixels};
            } else {
                jumped = Math.hypot(found.x - track.x, found.y - track.y) > config.maxJump;
                if (jumped) {
                    track = {x: found.x, y: found.y, vx: 0, vy: 0, pixels: found.pixels};
                } else {
                    track.vx = found.x - track.x;
                    track.vy = found.y - track.y;
                    track.x = found.x;
                    track.y = found.y;
                    track.pixels = track.pixels + (found.pixels - track.pixels) * config.smoothing;
                }
            }

            // Glide the drawn marker toward the new reading so it never snaps.
            if (!target || jumped) {
                target = {x: found.x, y: found.y, width: found.width, height: found.height, pixels: found.pixels};
            } else {
                target = {
                    x: target.x + (found.x - target.x) * config.smoothing,
                    y: target.y + (found.y - target.y) * config.smoothing,
                    width: target.width + (found.width - target.width) * config.smoothing,
                    height: target.height + (found.height - target.height) * config.smoothing,
                    pixels: found.pixels,
                };
            }

            if (jumped || !chainFrames) {
                chainFrames = 1;
                chainSolid = solid;
                chainSolidPixels = solid ? found.pixels : 0;
                pending.length = 0;
            } else {
                chainFrames += 1;
                if (solid) {
                    chainSolid = true;
                    chainSolidPixels = found.pixels;
                }
            }

            // Two islands of the same colour and similar size mean the tracker
            // cannot tell which one the player is actually holding. The marker
            // keeps following its candidate, but an ambiguous frame earns no dwell.
            // `confident` counts only solid rivals, since only a solid blob could
            // have been the answer instead; learning is held to the stricter
            // `unambiguous`, where a halo blob competing for the same identity is
            // enough of a doubt to teach nothing this frame.
            let rival = null;
            let anyRival = null;
            for (let index = 0; index < blobs.length; index += 1) {
                const blob = blobs[index];
                if (blob === found) continue;
                if (!anyRival || blob.pixels > anyRival.pixels) anyRival = blob;
                if (!isSolid(blob)) continue;
                if (!rival || blob.pixels > rival.pixels) rival = blob;
            }
            const confident = solid && (!rival || found.pixels >= rival.pixels * config.dominance);
            const unambiguous = !anyRival || found.pixels >= anyRival.pixels * config.dominance;

            // The in-between readings. Set aside, never applied here: at this point
            // the run of frames is only a claim that this was one object moving.
            if (found.ghost && found.ghostPixels >= config.minGhostPixels && pending.length < config.pendingLimit) {
                pending.push(found.ghost);
            }
            // …and here the claim is settled. This same unbroken track was the prop
            // beyond doubt at least once, it has run long enough to be a movement
            // rather than a coincidence, it is still the only thing that could be
            // the prop, and it is still roughly the size it was when it was proven.
            // So it is the prop now too — and everything it looked like along the
            // way becomes part of what the prop looks like. That is the whole
            // repair: the object is identified by having moved here continuously,
            // and its shaded, angled, re-balanced appearances come along with it.
            const held = chainSolidPixels
                ? Math.min(found.pixels, chainSolidPixels) / Math.max(found.pixels, chainSolidPixels)
                : 0;
            if (chainSolid && chainFrames >= config.confirmFrames && unambiguous &&
                held >= config.learnSizeRatio && now >= learnBlockedUntil) {
                learnPending();
            }

            const zone = zoneOf(target.x, target.y);
            if (zone !== dwellZone || jumped) {
                dwellZone = zone;
                dwellFrames = zone && !jumped ? 1 : 0;
            } else if (zone) {
                dwellFrames += 1;
            }
            if (!confident) dwellFrames = 0;
            // Leaving a corner re-arms it; the object must come back out before it
            // can select the same answer twice.
            if (lastHitZone && zone !== lastHitZone) lastHitZone = null;

            if (zone && dwellFrames >= config.dwellFrames && zone !== lastHitZone && now >= cooldownUntil) {
                lastHitZone = zone;
                cooldownUntil = now + config.cooldownMs;
                return snapshot(zone);
            }
            return snapshot(null);
        }

        setSlots(slots);

        return {
            config: config,
            ingest: ingest,
            reset: reset,
            setSlots: setSlots,
            setProfile: setProfile,
            getZones: function () { return hitBoxes; },
            getProfile: function () { return profile; },
            // The live envelope, for tests and for anything that wants to show how
            // far the tracker has had to stretch to keep hold of the object.
            getModel: function () { return model; },
            frameCount: function () { return frames; },
        };
    }

    function resolveCrystalArenaTheme() {
        const requested = typeof getLocalStorage === 'function' ? getLocalStorage('theme', 'base') : 'base';
        const key = CRYSTAL_ARENA_THEME_MOTIFS[requested] && typeof themeOptions !== 'undefined' && themeOptions[requested]
            ? requested : 'base';
        const palette = typeof themeOptions !== 'undefined' && themeOptions[key]
            ? themeOptions[key].colors
            : {primary: '#006064', secondary: '#78909c', tertiary: '#B0E0E6', accent: '#C0C0C0', background: '#F5F5F5', text: '#000000'};
        const motif = CRYSTAL_ARENA_THEME_MOTIFS[key];
        return {
            key: key,
            palette: palette,
            motif: motif,
            css: {
                '--ca-primary': palette.primary,
                '--ca-secondary': palette.secondary,
                '--ca-tertiary': palette.tertiary,
                '--ca-accent': palette.accent,
                '--ca-bg': palette.background,
                '--ca-ink': palette.text,
                '--ca-plate': crystalArenaHexAlpha(palette.background, 0.94),
                '--ca-plate-edge': crystalArenaHexAlpha(palette.tertiary, 0.85),
                '--ca-glow': crystalArenaHexAlpha(palette.accent, 0.55),
                '--ca-rim': crystalArenaHexAlpha(palette.primary, 0.75),
                '--ca-edge': crystalArenaEdgeColor(palette),
                // The camera feed always sits under a themed scrim so answer and
                // question text keeps its contrast over a moving picture.
                '--ca-scrim': crystalArenaHexAlpha(palette.background, motif.scrim),
                '--ca-flash': motif.flash,
                '--ca-spent': motif.spent,
                '--ca-correct': key === 'soldiers' ? '#FFD700' : (key === 'dark' ? '#7ee0c4' : (key === 'code' ? '#39FF14' : '#51cf66')),
                '--ca-wrong': key === 'code' ? '#ff5f56' : (key === 'unicorn' ? '#c2185b' : '#d1495b'),
            },
        };
    }

    function crystalArenaStopStream(stream) {
        if (!stream || typeof stream.getTracks !== 'function') return;
        stream.getTracks().forEach(track => {
            try { track.stop(); } catch (error) { /* the track may already be dead */ }
        });
    }

    function createCrystalArenaComponent(BaseGameComponent) {
        const slotErrors = validateCrystalArenaSlots(CRYSTAL_ARENA_SLOTS);
        if (slotErrors.length) {
            throw new Error('crystal-arena: ' + slotErrors.join('; '));
        }

        return Vue.component('crystal-arena', Vue.extend({
            extends: BaseGameComponent,
            template: `
            <div ref="root" class="ca-game"
                 :class="['ca-theme-' + caTheme.key, 'ca-state-' + gameState, 'ca-mode-' + inputMode, {'ca-reduced': reducedMotion, 'ca-camera-live': cameraState === 'live', 'ca-has-notice': showNotice}]"
                 :style="caTheme.css" dir="rtl">

              <div class="ca-stage" aria-hidden="true">
                <video ref="video" class="ca-video" playsinline muted autoplay></video>
                <canvas ref="vision" class="ca-vision" :width="sampleWidth" :height="sampleHeight"></canvas>
                <div class="ca-scrim"></div>
                <div class="ca-grid"></div>
                <div class="ca-rings"><i></i><i></i><i></i></div>
                <div class="ca-vignette"></div>
                <div class="ca-motes">
                  <i v-for="(mote, index) in ambientMotes" :key="index" :style="moteStyle(mote)"></i>
                </div>
              </div>

              <!-- Above the crystals so a hand held in a corner is confirmed on top
                   of that crystal, and never interactive. -->
              <div class="ca-hands" aria-hidden="true">
                <i ref="handMarkers" class="ca-hand"><b>✦</b></i>
              </div>

              <header class="ca-hud">
                <button class="ca-round-button" type="button" @click="exitGame" aria-label="יציאה">←</button>
                <div class="ca-hud-center">
                  <div class="ca-charge" :aria-label="'התקדמות בשלב: ' + progressLabel">
                    <i :style="{width: learningPercent + '%'}"></i>
                    <b dir="ltr">{{ progressLabel }}</b>
                  </div>
                  <div class="ca-streak" v-if="streak > 1" dir="ltr">🔥 {{ streak }}</div>
                </div>
                <div class="ca-score" dir="ltr">✦ {{ score }}</div>
                <button v-if="cameraState === 'live'" class="ca-round-button" type="button"
                        @click="recalibrate" aria-label="כיול צבע מחדש">🎨</button>
                <button class="ca-round-button" type="button" @click="toggleCamera"
                        :aria-pressed="String(cameraState === 'live')"
                        :aria-label="cameraState === 'live' ? 'כיבוי מצלמה' : 'הפעלת מצלמה'">
                  {{ cameraState === 'live' ? '📷' : '🚫' }}
                </button>
                <button class="ca-round-button" type="button" @click="toggleFullscreen" aria-label="מסך מלא">⛶</button>
              </header>

              <div v-if="showNotice" class="ca-notice" role="status" aria-live="polite">
                <span>{{ cameraNotice }}</span>
                <button type="button" class="ca-notice-retry" @click="startCamera">נסו שוב 📷</button>
                <button type="button" class="ca-notice-close" @click="dismissNotice" aria-label="סגירת ההודעה">✕</button>
              </div>

              <div class="ca-arena">
                <button v-for="slot in slots" :key="slot.id"
                        ref="slotButtons"
                        type="button"
                        class="ca-crystal"
                        :class="crystalClasses(slot)"
                        :aria-keyshortcuts="String(slot.key)"
                        :disabled="!canStrike || !!spent[slot.id] || !optionFor(slot.id)"
                        @click="strike(slot.id, 'pointer')">
                  <svg class="ca-crystal-art" viewBox="0 0 100 100" aria-hidden="true" preserveAspectRatio="none">
                    <polygon class="ca-facet-back" points="50,3 93,29 93,71 50,97 7,71 7,29"></polygon>
                    <polygon class="ca-facet-top" points="50,3 93,29 50,50 7,29"></polygon>
                    <polygon class="ca-facet-low" points="50,50 93,71 50,97 7,71"></polygon>
                    <polygon class="ca-facet-energy" points="50,3 93,29 93,71 50,97 7,71 7,29"></polygon>
                    <polyline class="ca-facet-crack" points="30,22 52,46 38,62 60,84" fill="none"></polyline>
                  </svg>
                  <span class="ca-crystal-mark" aria-hidden="true">{{ slotMark(slot) }}</span>
                  <span class="ca-crystal-label" :class="{'ca-long': hasLongAnswers}" :dir="optionDirection(slot.id)">
                    <span v-html="optionFor(slot.id)"></span>
                  </span>
                  <span class="ca-shards" aria-hidden="true">
                    <i v-for="shard in (shards[slot.id] || [])" :key="shard.id" :style="shardStyle(shard)"></i>
                  </span>
                </button>

                <section class="ca-core" :class="{'ca-core-charged': coreCharged}">
                  <div class="ca-core-ring" :style="{'--ca-progress': learningPercent + '%'}"><i></i></div>
                  <div class="ca-core-plate">
                    <div class="ca-core-kicker">{{ caTheme.motif.arena }}</div>
                    <div class="ca-core-question" :dir="questionDirection" v-html="questionHtml"></div>
                    <div class="ca-core-hint">{{ hintText }}</div>
                  </div>
                  <div class="ca-feedback"
                       :class="{'ca-feedback-good': answerWasCorrect === true, 'ca-feedback-wrong': answerWasCorrect === false}"
                       aria-live="polite">{{ feedback }}</div>
                </section>
              </div>

              <div v-if="gameState === 'intro' || gameState === 'requestingCamera'" class="ca-intro">
                <div class="ca-intro-card">
                  <div class="ca-intro-glyph" aria-hidden="true">{{ caTheme.motif.core }}</div>
                  <h2>זירת הגבישים</h2>
                  <p class="ca-intro-copy">ארבעה גבישים עולים בפינות המסך. דפקו עם היד על הפינה של התשובה הנכונה — או לחצו עליה.</p>
                  <p v-if="cameraNotice" class="ca-intro-notice">{{ cameraNotice }}</p>
                  <div class="ca-intro-actions">
                    <button type="button" class="ca-primary" :disabled="gameState === 'requestingCamera'" @click="startCamera">
                      {{ gameState === 'requestingCamera' ? 'מבקשים גישה…' : '📷 הפעילו מצלמה' }}
                    </button>
                    <button type="button" class="ca-secondary" @click="startManual">👆 בלי מצלמה</button>
                  </div>
                  <p class="ca-intro-privacy">התמונה נשארת במכשיר שלכם ואינה נשמרת או נשלחת לשום מקום.</p>
                </div>
              </div>

              <div v-if="gameState === 'calibrating' && inputMode === 'camera'" class="ca-calibrate" aria-live="polite">
                <div class="ca-spot" :class="{'ca-spot-holding': calibrationHold > 0}"
                     :style="calibrationSpotStyle" aria-hidden="true">
                  <i></i><i></i><i></i><i></i>
                  <b></b>
                </div>
                <div class="ca-calibrate-card">
                  <ol class="ca-steps" aria-hidden="true">
                    <li v-for="(step, index) in calibrationSteps" :key="step.id"
                        :class="{'ca-step-done': index < calibrationStep, 'ca-step-now': index === calibrationStep}"></li>
                  </ol>
                  <h3>{{ calibrationCurrent ? calibrationCurrent.title : 'מוכן!' }}</h3>
                  <p>{{ calibrationCurrent ? calibrationCurrent.hint : '' }}</p>
                  <div class="ca-lockon">
                    <b :style="calibrationSwatch" aria-hidden="true"></b>
                    <span>
                      <em>{{ calibrationMessage }}</em>
                      <u aria-hidden="true"><i :style="{width: calibrationPercent + '%'}"></i></u>
                    </span>
                  </div>
                  <div class="ca-intro-actions">
                    <button v-if="calibrationCurrent && calibrationCurrent.kind === 'colour'"
                            type="button" class="ca-primary"
                            :disabled="calibrationSample === null" @click="acceptCalibration">
                      זה הצבע ▶
                    </button>
                    <button v-else type="button" class="ca-primary" @click="skipCalibrationRest">
                      אפשר להתחיל ▶
                    </button>
                    <button v-if="savedColourProfile && calibrationStep === 0"
                            type="button" class="ca-secondary" @click="useSavedColour">
                      הצבע מהפעם הקודמת
                    </button>
                    <button type="button" class="ca-secondary" @click="startManual">בלי מצלמה</button>
                  </div>
                </div>
              </div>

              <div v-else-if="gameState === 'calibrating'" class="ca-calibrate" aria-live="polite">
                <div class="ca-calibrate-card">
                  <div class="ca-calibrate-glyph" aria-hidden="true">✦</div>
                  <p>הזירה נטענת…</p>
                </div>
              </div>

              <canvas ref="sampler" class="ca-sampler" :width="sampleWidth" :height="sampleHeight" aria-hidden="true"></canvas>
            </div>`,

            data: function () {
                return {
                    slots: CRYSTAL_ARENA_SLOTS,
                    caTheme: resolveCrystalArenaTheme(),
                    gameState: 'loading',
                    inputMode: 'manual',
                    cameraState: 'off',
                    cameraNotice: '',
                    currentQuestion: null,
                    optionBySlot: {},
                    spent: {},
                    reactions: {},
                    shards: {},
                    inputLocked: true,
                    answerWasCorrect: null,
                    feedback: '',
                    roundToken: 0,
                    streak: 0,
                    coreCharged: false,
                    reducedMotion: false,
                    ambientMotes: [],
                    colourProfile: null,
                    calibrationSample: null,
                    calibrationHold: 0,
                    calibrationStep: 0,
                    calibrationDone: [],
                    calibrationNudge: false,
                    forceCalibration: false,
                    savedColourProfile: null,
                    // The measured on-screen rectangles of the four crystals, in
                    // frame coordinates. Null until the page has been laid out.
                    slotZones: null,
                    sampleWidth: CRYSTAL_ARENA_TRACKER_DEFAULTS.width,
                    sampleHeight: CRYSTAL_ARENA_TRACKER_DEFAULTS.height,
                };
            },

            computed: {
                canStrike: function () {
                    return this.gameState === 'waitingForAnswer' && !this.inputLocked;
                },
                calibrationSteps: function () {
                    return CRYSTAL_ARENA_CALIBRATION_STEPS;
                },
                calibrationCurrent: function () {
                    return CRYSTAL_ARENA_CALIBRATION_STEPS[this.calibrationStep] || null;
                },
                calibrationPercent: function () {
                    const step = this.calibrationCurrent;
                    if (!step) return 100;
                    const target = step.kind === 'colour'
                        ? CRYSTAL_ARENA_CALIBRATION_FRAMES : CRYSTAL_ARENA_CORNER_FRAMES;
                    return Math.round(Math.min(1, this.calibrationHold / target) * 100);
                },
                calibrationSpotStyle: function () {
                    const step = this.calibrationCurrent;
                    if (!step) return {opacity: 0};
                    // A corner step asks the player to put the object where the
                    // tracker will look for it, so the spot follows the measured
                    // crystal. The constant is the pre-layout fallback.
                    const zone = step.kind === 'corner' && this.slotZones
                        ? this.slotZones.filter(item => item.id === step.slot)[0] : null;
                    const x = zone ? (zone.x[0] + zone.x[1]) / 2 : step.x;
                    const y = zone ? (zone.y[0] + zone.y[1]) / 2 : step.y;
                    return {left: (x * 100).toFixed(2) + '%', top: (y * 100).toFixed(2) + '%'};
                },
                calibrationSwatch: function () {
                    if (this.calibrationSample === null) return {opacity: 0};
                    return {background: 'hsl(' + Math.round(this.calibrationSample) + ', 85%, 52%)', opacity: 1};
                },
                calibrationMessage: function () {
                    const step = this.calibrationCurrent;
                    if (!step) return 'מוכן!';
                    if (step.kind === 'colour') {
                        if (this.calibrationSample === null) {
                            return this.calibrationNudge
                                ? 'עדיין לא רואה צבע חזק — נסו לקרב את החפץ למצלמה או להוסיף אור.'
                                : 'מחפשים צבע חזק על הסימון…';
                        }
                        return 'רואה את הצבע — עוד רגע…';
                    }
                    if (this.calibrationHold > 0) return 'מצוין, מחזיק…';
                    return this.calibrationNudge
                        ? 'לא רואה את החפץ בפינה הזאת — נסו לקרב אותו למצלמה.'
                        : 'העבירו את החפץ לסימון.';
                },
                // The intro card carries its own copy of the notice, so the HUD strip
                // only appears once play has started.
                showNotice: function () {
                    return !!this.cameraNotice && this.gameState !== 'intro' && this.gameState !== 'requestingCamera';
                },
                questionHtml: function () {
                    return this.currentQuestion ? this.currentQuestion.question : 'מכינים את הזירה…';
                },
                questionDirection: function () {
                    return this.textDirection(this.questionHtml);
                },
                learningPercent: function () {
                    if (!this.progress || !this.progress.total) return 0;
                    return Math.max(0, Math.min(100, Math.round((this.progress.progress / this.progress.total) * 100)));
                },
                progressLabel: function () {
                    return this.progress ? `${this.progress.progress} / ${this.progress.total}` : '0 / 0';
                },
                hasLongAnswers: function () {
                    return this.slots.some(slot => this.plainText(this.optionFor(slot.id)).length > 12);
                },
                hintText: function () {
                    if (this.gameState === 'answerFeedback') return '';
                    return this.inputMode === 'camera' && this.cameraState === 'live'
                        ? 'החזיקו את החפץ בפינה הנכונה'
                        : 'בחרו את הפינה הנכונה';
                },
            },

            methods: {
                // --- lifecycle -------------------------------------------------
                create: function () {
                    this.caTheme = resolveCrystalArenaTheme();
                    this.resetRunState();
                    this.$nextTick(() => {
                        if (this._destroyedCa || !this.isCurrentRoute()) return;
                        this.setupSampler();
                        this.startAnimationLoop();
                        this.savedColourProfile = this.loadColourProfile();
                        // The game opens straight into calibration. `intro` is now only
                        // the fallback surface: startCamera falls back to it when the
                        // camera is blocked, denied or missing, and it still carries the
                        // "no camera" route and the privacy note.
                        this.gameState = 'intro';
                        const remembered = typeof getLocalStorage === 'function'
                            ? getLocalStorage(CRYSTAL_ARENA_INPUT_MODE_KEY, '') : '';
                        if (remembered === 'manual') {
                            this.startManual();
                            return;
                        }
                        this.later(() => this.startCamera(), 200);
                    });
                },
                resetRunState: function () {
                    this.gameState = 'loading';
                    this.currentQuestion = null;
                    this.optionBySlot = {};
                    this.spent = {};
                    this.reactions = {};
                    this.shards = {};
                    this.inputLocked = true;
                    this.answerWasCorrect = null;
                    this.feedback = '';
                    this.streak = 0;
                    this.coreCharged = false;
                    this.roundToken += 1;
                    this._runToken = (this._runToken || 0) + 1;
                },
                isCurrentRoute: function () {
                    return !!this.$route &&
                        this.$route.params.currentAppId === this.currentAppId &&
                        this.$route.path.indexOf('/play/crystal_arena/') === 0;
                },
                later: function (callback, delay) {
                    if (!this._timersCa) this._timersCa = new Set();
                    const token = this._runToken;
                    const timer = setTimeout(() => {
                        this._timersCa.delete(timer);
                        if (!this._destroyedCa && token === this._runToken && this.isCurrentRoute()) callback();
                    }, this.reducedMotion ? Math.min(delay, 120) : delay);
                    this._timersCa.add(timer);
                    return timer;
                },
                clearTimers: function () {
                    if (!this._timersCa) return;
                    this._timersCa.forEach(timer => clearTimeout(timer));
                    this._timersCa.clear();
                },

                // --- camera ----------------------------------------------------
                setupSampler: function () {
                    const canvas = this.$refs.sampler;
                    if (!canvas || !canvas.getContext) return;
                    this._sampleCtx = canvas.getContext('2d', {willReadFrequently: true}) || canvas.getContext('2d');

                    const vision = this.$refs.vision;
                    if (vision && vision.getContext) {
                        this._visionCtx = vision.getContext('2d');
                        this._visionImage = this._visionCtx.createImageData(vision.width, vision.height);
                        // Same contrast-picked colour the crystal outlines use: the
                        // theme accent is silver on the light palettes and the
                        // silhouette would vanish.
                        this._visionRgb = crystalArenaRgb(this.caTheme.css['--ca-edge']);
                    }
                },
                startCamera: function () {
                    if (this.cameraState === 'requesting' || this.cameraState === 'live') return;
                    const blocker = crystalArenaCameraBlocker();
                    if (blocker) {
                        this.failCamera(blocker);
                        return;
                    }
                    // Turning the camera on mid-round must not disturb the round:
                    // only the intro shows the "asking for access" overlay, and the
                    // state we came from is restored whichever way the prompt goes.
                    this._resumeStateCa = CRYSTAL_ARENA_PLAY_STATES.indexOf(this.gameState) !== -1
                        ? this.gameState : null;
                    this.cameraState = 'requesting';
                    if (!this._resumeStateCa) this.gameState = 'requestingCamera';
                    this.cameraNotice = '';
                    const token = this._runToken;
                    navigator.mediaDevices.getUserMedia({
                        video: {facingMode: 'user', width: {ideal: 640}, height: {ideal: 480}},
                        audio: false,
                    }).then(stream => {
                        if (this._destroyedCa || token !== this._runToken || !this.isCurrentRoute()) {
                            crystalArenaStopStream(stream);
                            return;
                        }
                        this.attachStream(stream);
                    }).catch(error => {
                        if (this._destroyedCa || token !== this._runToken) return;
                        this.failCamera(crystalArenaCameraErrorNotice(error));
                    });
                },
                attachStream: function (stream) {
                    this._stream = stream;
                    const video = this.$refs.video;
                    if (video) {
                        video.srcObject = stream;
                        video.muted = true;
                        const played = video.play();
                        if (played && played.catch) played.catch(() => {});
                    }
                    const tracks = typeof stream.getVideoTracks === 'function' ? stream.getVideoTracks() : [];
                    this._onTrackEndedCa = () => {
                        if (this._destroyedCa) return;
                        this.failCamera('המצלמה נותקה. ממשיכים בלחיצות.');
                    };
                    tracks.forEach(track => track.addEventListener('ended', this._onTrackEndedCa));
                    this.cameraState = 'live';
                    this.inputMode = 'camera';
                    this.cameraNotice = '';
                    if (typeof setLocalStorage === 'function') setLocalStorage(CRYSTAL_ARENA_INPUT_MODE_KEY, 'camera');
                    if (this._tracker) this._tracker.reset();
                    if (this._resumeStateCa) {
                        // A round is already on screen — keep its question and just
                        // start watching the corners.
                        this.gameState = this._resumeStateCa;
                        this._resumeStateCa = null;
                        return;
                    }
                    this.beginCalibration();
                },
                failCamera: function (notice) {
                    this.releaseCamera();
                    this.cameraState = 'off';
                    this.inputMode = 'manual';
                    this.cameraNotice = notice;
                    if (typeof setLocalStorage === 'function') setLocalStorage(CRYSTAL_ARENA_INPUT_MODE_KEY, 'manual');
                    if (this._resumeStateCa) {
                        this.gameState = this._resumeStateCa;
                        this._resumeStateCa = null;
                    } else if (this.gameState === 'intro' || this.gameState === 'requestingCamera') {
                        this.gameState = 'intro';
                    }
                },
                dismissNotice: function () {
                    this.cameraNotice = '';
                },
                releaseCamera: function () {
                    const stream = this._stream;
                    if (stream && this._onTrackEndedCa && typeof stream.getVideoTracks === 'function') {
                        stream.getVideoTracks().forEach(track => track.removeEventListener('ended', this._onTrackEndedCa));
                    }
                    crystalArenaStopStream(stream);
                    this._stream = null;
                    this._onTrackEndedCa = null;
                    const video = this.$refs.video;
                    if (video) {
                        try { video.pause(); } catch (error) { /* nothing to pause */ }
                        video.srcObject = null;
                    }
                    if (this._tracker) this._tracker.reset();
                    this.clearCornerEnergy();
                },
                toggleCamera: function () {
                    if (this.cameraState === 'live') {
                        this.releaseCamera();
                        this.cameraState = 'off';
                        this.inputMode = 'manual';
                        this.cameraNotice = '';
                        if (typeof setLocalStorage === 'function') setLocalStorage(CRYSTAL_ARENA_INPUT_MODE_KEY, 'manual');
                        return;
                    }
                    this.startCamera();
                },
                startManual: function () {
                    this.inputMode = 'manual';
                    this.cameraState = 'off';
                    if (typeof setLocalStorage === 'function') setLocalStorage(CRYSTAL_ARENA_INPUT_MODE_KEY, 'manual');
                    this.beginCalibration();
                },
                beginCalibration: function () {
                    if (this.gameState === 'waitingForAnswer') return;
                    if (this.inputMode !== 'camera') {
                        // Manual play has nothing to calibrate, just a short beat
                        // before the first round. This is reached from the intro AND
                        // from "בלי מצלמה" on the calibration card — where the game is
                        // already in 'calibrating', so bailing out on that state
                        // would strand the player on the card for good. Guard the
                        // double-schedule instead of the state.
                        if (this._manualStartCa) return;
                        this._manualStartCa = true;
                        this.gameState = 'calibrating';
                        this.later(() => {
                            this._manualStartCa = false;
                            this.finishCalibration();
                        }, 420);
                        return;
                    }
                    if (this.gameState === 'calibrating') return;
                    // Calibration is the opening every time: the object and the room
                    // light change between sessions. A remembered colour is offered as a
                    // one-click shortcut on the card rather than silently applied.
                    this.savedColourProfile = this.loadColourProfile();
                    this.forceCalibration = false;
                    this.startCalibrationRun();
                },
                recalibrate: function () {
                    if (this.inputMode !== 'camera' || this.cameraState !== 'live') return;
                    this.forceCalibration = true;
                    this.colourProfile = null;
                    if (this._tracker) this._tracker.setProfile(null);
                    this._resumeStateCa = null;
                    this.startCalibrationRun();
                },
                startCalibrationRun: function () {
                    this.calibrationStep = 0;
                    this.calibrationDone = [];
                    this.calibrationHold = 0;
                    this.calibrationSample = null;
                    this.calibrationNudge = false;
                    this._stepStartedCa = 0;
                    this.gameState = 'calibrating';
                },
                loadColourProfile: function () {
                    if (typeof getLocalStorage !== 'function') return null;
                    const saved = getLocalStorage(CRYSTAL_ARENA_COLOUR_KEY, null);
                    return saved && typeof saved.hue === 'number' ? saved : null;
                },
                applyColourProfile: function (profile) {
                    this.colourProfile = profile;
                    if (!this._tracker) this._tracker = createCrystalArenaTracker();
                    this._tracker.setProfile(profile);
                    if (typeof setLocalStorage === 'function') {
                        setLocalStorage(CRYSTAL_ARENA_COLOUR_KEY, profile);
                    }
                },

                // Runs on every sampled frame while the guided opening is up. The first
                // step reads the object's colour; the rest confirm the tracker can
                // actually see it resting in each marked corner.
                stepCalibration: function (rgba, now) {
                    const step = CRYSTAL_ARENA_CALIBRATION_STEPS[this.calibrationStep];
                    if (!step) {
                        this.finishCalibration();
                        return;
                    }
                    if (!this._stepStartedCa) this._stepStartedCa = now;
                    this.calibrationNudge = this.calibrationHold === 0 &&
                        now - this._stepStartedCa > CRYSTAL_ARENA_STEP_NUDGE_MS;

                    if (step.kind === 'colour') {
                        this.readCalibrationColour(rgba, step);
                    } else {
                        this.checkCalibrationCorner(rgba, step, now);
                    }
                },
                readCalibrationColour: function (rgba, step) {
                    const tracker = this._tracker || (this._tracker = createCrystalArenaTracker());
                    const config = tracker.config;
                    const reading = crystalArenaDominantHue(
                        rgba, config.width, config.height, crystalArenaCalibrationBox(step), config);
                    if (!reading) {
                        this.calibrationHold = 0;
                        this.calibrationSample = null;
                        return;
                    }
                    const previous = this.calibrationSample;
                    const steady = previous !== null &&
                        crystalArenaHueDistance(previous, reading.hue) <= CRYSTAL_ARENA_CALIBRATION_DRIFT;
                    this.calibrationSample = steady
                        ? previous + (reading.hue - previous) * 0.3
                        : reading.hue;
                    this.calibrationHold = steady ? this.calibrationHold + 1 : 1;
                    if (this.calibrationHold >= CRYSTAL_ARENA_CALIBRATION_FRAMES) {
                        this.acceptCalibration();
                    }
                },
                checkCalibrationCorner: function (rgba, step, now) {
                    const reading = this._tracker.ingest(rgba, now);
                    this.paintMatchMask(reading.mask, reading.ready);
                    this.paintTarget(reading.target);
                    const settled = reading.zone === step.slot;
                    this.calibrationHold = settled ? this.calibrationHold + 1 : 0;
                    if (this.calibrationHold >= CRYSTAL_ARENA_CORNER_FRAMES) {
                        this.advanceCalibration();
                    }
                },
                acceptCalibration: function () {
                    const step = CRYSTAL_ARENA_CALIBRATION_STEPS[this.calibrationStep];
                    if (this.gameState !== 'calibrating' || !step || step.kind !== 'colour') return;
                    if (this.calibrationSample === null) return;
                    this.applyColourProfile({
                        hue: Math.round(this.calibrationSample),
                        tolerance: CRYSTAL_ARENA_TRACKER_DEFAULTS.hueTolerance,
                    });
                    this.calibrationSample = null;
                    this.advanceCalibration();
                },
                advanceCalibration: function () {
                    const step = CRYSTAL_ARENA_CALIBRATION_STEPS[this.calibrationStep];
                    if (step) this.calibrationDone = this.calibrationDone.concat([step.id]);
                    this.calibrationHold = 0;
                    this.calibrationNudge = false;
                    this._stepStartedCa = 0;
                    this.calibrationStep += 1;
                    if (this.calibrationStep >= CRYSTAL_ARENA_CALIBRATION_STEPS.length) {
                        this.finishCalibration();
                    }
                },
                // The corner checks are a confidence pass, not a gate: once the colour
                // is known the game is playable, so the rest can always be skipped.
                skipCalibrationRest: function () {
                    if (!this.colourProfile) return;
                    this.calibrationStep = CRYSTAL_ARENA_CALIBRATION_STEPS.length;
                    this.finishCalibration();
                },
                // Returning player, same object: one click instead of five steps.
                useSavedColour: function () {
                    if (this.gameState !== 'calibrating' || !this.savedColourProfile) return;
                    this.applyColourProfile(this.savedColourProfile);
                    this.calibrationStep = CRYSTAL_ARENA_CALIBRATION_STEPS.length;
                    this.finishCalibration();
                },
                finishCalibration: function () {
                    if (this.gameState !== 'calibrating') return;
                    if (this._resumeStateCa) {
                        this.gameState = this._resumeStateCa;
                        this._resumeStateCa = null;
                        return;
                    }
                    this.prepareRound();
                },

                // --- rounds ----------------------------------------------------
                prepareRound: function () {
                    if (this._destroyedCa) return;
                    this.gameState = 'preparingRound';
                    const token = ++this.roundToken;
                    let question;
                    try {
                        question = generateFromList(
                            this.currentApp.listName,
                            this.currentApp.questionIndex,
                            this.currentApp.resultIndex,
                            this.currentAppId,
                            getSetItems(this.currentApp),
                            this.currentApp.questionType
                        );
                    } catch (error) {
                        console.error('crystal-arena: question generation failed', error);
                        this.feedback = 'לא הצלחנו להכין שאלה';
                        return;
                    }
                    if (this._destroyedCa || token !== this.roundToken) return;

                    const options = this.shuffle(question.options.slice()).slice(0, this.slots.length);
                    const mapping = {};
                    this.slots.forEach((slot, index) => { mapping[slot.id] = options[index]; });
                    this.currentQuestion = question;
                    this.questionIndex = question.questionIndex;
                    this.optionBySlot = mapping;
                    this.spent = {};
                    this.reactions = {};
                    this.shards = {};
                    this.answerWasCorrect = null;
                    this.feedback = '';
                    this.coreCharged = false;
                    this.inputLocked = true;
                    if (this._tracker) this._tracker.reset();

                    this.$nextTick(() => {
                        if (this._destroyedCa || token !== this.roundToken) return;
                        try { question.action(); } catch (error) { /* presentation only */ }
                        this.later(() => {
                            if (token !== this.roundToken) return;
                            this.gameState = 'waitingForAnswer';
                            this.inputLocked = false;
                            this.focusFirstCrystal();
                        }, 340);
                    });
                },
                strike: function (slotId, source) {
                    if (this.gameState !== 'waitingForAnswer' || this.inputLocked || this.spent[slotId]) return;
                    if (!this.currentQuestion) return;
                    // A short list can yield fewer than four options; those crystals
                    // stay dark and inert rather than accepting an empty answer.
                    const option = this.optionBySlot[slotId];
                    if (option === undefined || option === '') return;
                    const correct = option === this.currentQuestion.result;
                    this.inputLocked = true;
                    this.gameState = 'answerFeedback';
                    this.answerWasCorrect = correct;
                    this._lastSource = source;
                    if (correct) {
                        this.acceptCorrect(slotId);
                    } else {
                        this.acceptWrong(slotId);
                    }
                },
                acceptCorrect: function (slotId) {
                    this.$set(this.reactions, slotId, 'shattered');
                    this.spawnShards(slotId);
                    this.feedback = this.getSuccessMsg();
                    this.streak += 1;
                    this.coreCharged = true;
                    try { successSound.play(); } catch (error) { /* audio is optional */ }
                    updateWeightForKey(this.currentAppId, this.questionIndex, -1);
                    this.score += 1;
                    this.saveScore();
                    if (!this.reloadProgress()) return;
                    this.later(() => this.prepareRound(), 900);
                },
                acceptWrong: function (slotId) {
                    this.$set(this.reactions, slotId, 'cracked');
                    this.feedback = 'כמעט! נסו פינה אחרת';
                    this.streak = 0;
                    try { failureSound.play(); } catch (error) { /* audio is optional */ }
                    this.score = Math.max(0, this.score - 1);
                    this.saveScore();
                    updateWeightForKey(this.currentAppId, this.questionIndex, 1);
                    if (!this.reloadProgress()) return;
                    const token = this.roundToken;
                    this.later(() => {
                        if (token !== this.roundToken) return;
                        this.$set(this.spent, slotId, true);
                        this.$set(this.reactions, slotId, 'spent');
                        this.answerWasCorrect = null;
                        this.feedback = 'בחרו פינה אחרת';
                        this.gameState = 'waitingForAnswer';
                        this.inputLocked = false;
                        if (this._tracker) this._tracker.reset();
                        this.focusFirstCrystal();
                    }, 560);
                },
                spawnShards: function (slotId) {
                    if (this.reducedMotion) return;
                    const colors = this.caTheme.motif.particles;
                    const pieces = [];
                    for (let index = 0; index < CRYSTAL_ARENA_MAX_SHARDS; index += 1) {
                        const angle = (index / CRYSTAL_ARENA_MAX_SHARDS) * Math.PI * 2 + Math.random() * 0.4;
                        const distance = 42 + Math.random() * 46;
                        pieces.push({
                            id: slotId + '-' + this.roundToken + '-' + index,
                            x: Math.cos(angle) * distance,
                            y: Math.sin(angle) * distance,
                            size: 4 + Math.random() * 6,
                            delay: Math.random() * 90,
                            color: colors[index % colors.length],
                        });
                    }
                    this.$set(this.shards, slotId, pieces);
                    this.later(() => this.$set(this.shards, slotId, []), 760);
                },

                // --- motion loop -----------------------------------------------
                startAnimationLoop: function () {
                    if (this._rafCa) return;
                    const tick = () => {
                        if (this._destroyedCa) return;
                        if (!document.hidden) {
                            this.sampleMotion();
                        }
                        this._rafCa = requestAnimationFrame(tick);
                    };
                    this._rafCa = requestAnimationFrame(tick);
                },
                sampleMotion: function () {
                    if (this.inputMode !== 'camera' || this.cameraState !== 'live') return;
                    // Sampling runs through every play state, not only while an answer
                    // is open, so the tracking markers never freeze and the player can
                    // always see that the camera is following them. Only a strike is
                    // gated on the round being open.
                    if (this.gameState === 'intro' || this.gameState === 'requestingCamera') return;
                    // Webcams deliver about 30fps; sampling on every animation frame
                    // would just re-analyse the same picture at double the cost.
                    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
                    if (now - (this._lastSampleCa || 0) < 30) return;
                    this._lastSampleCa = now;
                    const rgba = this.readColourFrame();
                    if (!rgba) return;
                    if (!this._tracker) this._tracker = createCrystalArenaTracker();
                    this.refreshSlotZones(now);
                    if (this.gameState === 'calibrating') {
                        this.stepCalibration(rgba, now);
                        return;
                    }
                    const reading = this._tracker.ingest(rgba, now);
                    this.paintMatchMask(reading.mask, reading.ready);
                    this.paintTarget(reading.target);
                    this.paintCornerDwell(reading.zone, reading.dwell);
                    if (reading.hit && this.gameState === 'waitingForAnswer' && !this.spent[reading.hit]) {
                        this.strike(reading.hit, 'camera');
                    }
                },

                // Reads where the four crystals actually are on screen, in frame
                // coordinates. The tracker's built-in zones are whole quadrants,
                // which are far bigger than the drawn crystals — an object crossing
                // into the top-right quadrant answered that question long before it
                // reached the crystal the player was aiming at. The drawn shape is
                // the target, so the drawn shape is what the tracker gets.
                //
                // Frame coordinates are the root's box because .ca-stage is inset:0
                // inside it and the video fills the stage; the sampler mirrors the
                // frame exactly as CSS mirrors the video, so screen x is sample x.
                measureSlotZones: function () {
                    const root = this.$refs.root;
                    const buttons = this.$refs.slotButtons;
                    if (!root || !root.getBoundingClientRect || !buttons) return null;
                    if (buttons.length !== this.slots.length) return null;
                    const box = root.getBoundingClientRect();
                    if (!(box.width > 0 && box.height > 0)) return null;
                    const zones = [];
                    for (let index = 0; index < this.slots.length; index += 1) {
                        const element = buttons[index];
                        if (!element || !element.getBoundingClientRect) return null;
                        const rect = element.getBoundingClientRect();
                        if (!(rect.width > 0 && rect.height > 0)) return null;
                        zones.push({
                            id: this.slots[index].id,
                            key: this.slots[index].key,
                            x: [(rect.left - box.left) / box.width, (rect.right - box.left) / box.width],
                            y: [(rect.top - box.top) / box.height, (rect.bottom - box.top) / box.height],
                        });
                    }
                    return crystalArenaZonesOverlap(zones) ? null : zones;
                },
                // Layout changes with rotation, fullscreen and answer length, so the
                // zones are re-read on a slow beat rather than wired to listeners
                // that would need tearing down. Handing identical zones to the
                // tracker would reset its dwell every time, so only changes apply.
                refreshSlotZones: function (now) {
                    if (!this._tracker) return;
                    if (now - (this._zonesAtCa || 0) < 500) return;
                    this._zonesAtCa = now;
                    const zones = this.measureSlotZones();
                    if (!zones) return;
                    const signature = zones.map(zone =>
                        zone.id + ':' + zone.x.concat(zone.y).map(n => n.toFixed(3)).join(',')).join('|');
                    if (signature === this._zoneSignatureCa) return;
                    this._zoneSignatureCa = signature;
                    this.slotZones = zones;
                    // No inset: the crystal is already a precise target, unlike the
                    // quadrant fallback that the margin exists to trim.
                    this._tracker.setSlots(zones, 0);
                },

                // Draws the mirrored frame into the sampler and hands back its raw
                // RGBA. Mirrored *and cropped exactly like the <video> element*, so
                // sample space is the picture on screen: the corner a player sees
                // their object in is the corner the tracker reads.
                readColourFrame: function () {
                    const video = this.$refs.video;
                    const canvas = this.$refs.sampler;
                    const context = this._sampleCtx;
                    if (!video || !canvas || !context) return null;
                    if (video.readyState < 2 || !video.videoWidth) return null;
                    const crop = crystalArenaCoverCrop(
                        video.videoWidth, video.videoHeight, video.clientWidth, video.clientHeight);
                    context.save();
                    context.setTransform(-1, 0, 0, 1, canvas.width, 0);
                    context.drawImage(video, crop.x, crop.y, crop.width, crop.height,
                        0, 0, canvas.width, canvas.height);
                    context.restore();
                    try {
                        return context.getImageData(0, 0, canvas.width, canvas.height).data;
                    } catch (error) {
                        return null;
                    }
                },

                // Fills each corner crystal in proportion to how long the object has
                // rested there, so the player sees the answer charging up before it
                // fires and can pull out in time.
                paintCornerDwell: function (zone, dwell) {
                    const buttons = this.$refs.slotButtons;
                    if (!buttons || !buttons.length) return;
                    this.slots.forEach((slot, index) => {
                        const element = buttons[index];
                        if (!element) return;
                        element.style.setProperty('--ca-energy', slot.id === zone ? dwell.toFixed(3) : '0');
                    });
                },
                clearCornerEnergy: function () {
                    const buttons = this.$refs.slotButtons || [];
                    buttons.forEach(element => {
                        if (element) element.style.setProperty('--ca-energy', '0');
                    });
                    this.paintTarget(null);
                    const context = this._visionCtx;
                    if (context) context.clearRect(0, 0, context.canvas.width, context.canvas.height);
                },

                // Draws every pixel that matched. Seeing the object light up is the
                // clearest proof that the calibration took. The two match levels are
                // drawn at different strengths: solid where the tracker is sure of the
                // colour, faint where it is only holding on to the object through a
                // shadow or an angle, which is exactly where the player can see the
                // tracking survive a change in the light.
                paintMatchMask: function (mask, ready) {
                    const context = this._visionCtx;
                    const image = this._visionImage;
                    if (!context || !image || !mask) return;
                    const rgb = this._visionRgb;
                    const data = image.data;
                    const alpha = ready ? 210 : 0;
                    const faint = Math.round(alpha * 0.42);
                    for (let index = 0, offset = 0; index < mask.length; index += 1, offset += 4) {
                        data[offset] = rgb[0];
                        data[offset + 1] = rgb[1];
                        data[offset + 2] = rgb[2];
                        data[offset + 3] = mask[index] === 2 ? alpha : (mask[index] ? faint : 0);
                    }
                    context.putImageData(image, 0, 0);
                },

                // One marker, on the one object being tracked. The tracker already
                // smooths the position, so this only projects it onto the stage.
                paintTarget: function (target) {
                    const marker = (this.$refs.handMarkers || [])[0];
                    if (!marker) return;
                    if (!target) {
                        marker.style.opacity = '0';
                        return;
                    }
                    marker.style.opacity = '1';
                    marker.style.left = (Math.max(0.04, Math.min(0.96, target.x)) * 100).toFixed(2) + '%';
                    marker.style.top = (Math.max(0.05, Math.min(0.95, target.y)) * 100).toFixed(2) + '%';
                    marker.style.width = Math.max(7, Math.min(20, Math.max(target.width, target.height) * 110)).toFixed(1) + '%';
                },

                // --- presentation helpers --------------------------------------
                optionFor: function (slotId) {
                    return this.optionBySlot[slotId] === undefined ? '' : this.optionBySlot[slotId];
                },
                plainText: function (value) {
                    return String(value === undefined || value === null ? '' : value).replace(/<[^>]*>/g, '').trim();
                },
                textDirection: function (value) {
                    const plain = this.plainText(value);
                    if (!plain) return 'rtl';
                    return typeof isHebrew === 'function' && isHebrew(plain) ? 'rtl' : 'ltr';
                },
                optionDirection: function (slotId) {
                    return this.textDirection(this.optionFor(slotId));
                },
                slotMark: function (slot) {
                    const reaction = this.reactions[slot.id];
                    if (reaction === 'shattered') return '✦';
                    if (reaction === 'cracked' || reaction === 'spent') return '✕';
                    return '';
                },
                crystalClasses: function (slot) {
                    return [
                        'ca-slot-' + slot.id,
                        'ca-reaction-' + (this.reactions[slot.id] || 'idle'),
                        {'ca-crystal-spent': !!this.spent[slot.id]},
                    ];
                },
                shardStyle: function (shard) {
                    return {
                        '--ca-shard-x': shard.x + 'px',
                        '--ca-shard-y': shard.y + 'px',
                        width: shard.size + 'px',
                        height: shard.size + 'px',
                        background: shard.color,
                        animationDelay: shard.delay + 'ms',
                    };
                },
                moteStyle: function (mote) {
                    return {
                        left: mote.left + '%',
                        top: mote.top + '%',
                        width: mote.size + 'px',
                        height: mote.size + 'px',
                        background: mote.color,
                        animationDuration: mote.duration + 's',
                        animationDelay: mote.delay + 's',
                    };
                },
                setupAmbient: function () {
                    const colors = this.caTheme.motif.particles;
                    this.ambientMotes = Array.from({length: 14}, (unused, index) => ({
                        left: (index * 41 + 9) % 100,
                        top: (index * 57 + 23) % 100,
                        size: 3 + (index % 4) * 1.4,
                        duration: 8 + (index % 5) * 1.6,
                        delay: -(index % 7) * 1.3,
                        color: colors[index % colors.length],
                    }));
                },
                // Answering destroys the element that had focus, so a keyboard
                // player needs it put back or the next round is unreachable by
                // arrow keys. Nobody else does — and moving focus onto the first
                // crystal draws a focus ring on it, which reads as "the top-right
                // answer is already selected" at the start of a round. So this
                // only ever fires for a player who is actually on the keyboard.
                // Keyboard play survives the first round without it: the 1-4 keys
                // are handled on the document, and arrow keys fall back to the
                // first slot when nothing is focused.
                focusFirstCrystal: function () {
                    this.$nextTick(() => {
                        if (this._destroyedCa || this._lastSource !== 'keyboard') return;
                        const buttons = this.$refs.slotButtons || [];
                        const first = buttons.filter(button => button && !button.disabled)[0];
                        if (first && first.focus) first.focus({preventScroll: true});
                    });
                },

                // --- input -----------------------------------------------------
                onKeyDown: function (event) {
                    if (this.gameState === 'intro' || this.gameState === 'requestingCamera') return;
                    if (!this.canStrike) return;
                    const number = Number(event.key);
                    if (number >= 1 && number <= this.slots.length) {
                        const slot = this.slots.filter(item => item.key === number)[0];
                        if (slot && !this.spent[slot.id]) {
                            event.preventDefault();
                            this.strike(slot.id, 'keyboard');
                        }
                        return;
                    }
                    const direction = {ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down'}[event.key];
                    if (!direction) return;
                    const buttons = this.$refs.slotButtons || [];
                    const currentIndex = buttons.indexOf(document.activeElement);
                    const fromId = currentIndex >= 0 ? this.slots[currentIndex].id : this.slots[0].id;
                    const targetId = CRYSTAL_ARENA_NEIGHBOURS[fromId][direction];
                    const targetIndex = this.slots.findIndex(slot => slot.id === targetId);
                    const target = buttons[targetIndex];
                    if (target && !target.disabled) {
                        event.preventDefault();
                        target.focus();
                    }
                },
                onVisibilityChange: function () {
                    if (document.hidden) {
                        if (this._tracker) this._tracker.reset();
                        this.clearCornerEnergy();
                    }
                },

                // --- chrome ----------------------------------------------------
                toggleFullscreen: function () {
                    const root = this.$refs.root;
                    if (!root) return;
                    if (document.fullscreenElement || document.webkitFullscreenElement) {
                        const exit = document.exitFullscreen || document.webkitExitFullscreen;
                        if (exit) exit.call(document);
                        return;
                    }
                    const request = root.requestFullscreen || root.webkitRequestFullscreen;
                    if (request) {
                        const result = request.call(root);
                        if (result && result.catch) result.catch(() => {});
                    }
                },
                exitGame: function () {
                    if (typeof parseAdventureId === 'function') {
                        const parsed = parseAdventureId(this.currentAppId);
                        if (parsed) {
                            this.$router.push('/adventure/world/' + parsed.world.id);
                            return;
                        }
                    }
                    this.$router.push('/app/' + this.currentAppId);
                },
            },

            mounted: function () {
                this._destroyedCa = false;
                if (!this._timersCa) this._timersCa = new Set();
                this._tracker = createCrystalArenaTracker();
                this._mediaCa = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
                this.reducedMotion = !!(this._mediaCa && this._mediaCa.matches);
                this._onKeyCa = event => this.onKeyDown(event);
                this._onVisibilityCa = () => this.onVisibilityChange();
                window.addEventListener('keydown', this._onKeyCa);
                document.addEventListener('visibilitychange', this._onVisibilityCa);
                this.setupAmbient();
            },

            beforeDestroy: function () {
                this._destroyedCa = true;
                this._runToken = (this._runToken || 0) + 1;
                this.roundToken += 1;
                this.clearTimers();
                if (this._rafCa) cancelAnimationFrame(this._rafCa);
                this._rafCa = null;
                if (this._onKeyCa) window.removeEventListener('keydown', this._onKeyCa);
                if (this._onVisibilityCa) document.removeEventListener('visibilitychange', this._onVisibilityCa);
                this._onKeyCa = null;
                this._onVisibilityCa = null;
                this.releaseCamera();
                this._tracker = null;
                this._sampleCtx = null;

                this._visionCtx = null;
                this._visionImage = null;

                if (document.fullscreenElement === this.$refs.root && document.exitFullscreen) {
                    document.exitFullscreen().catch(() => {});
                }
            },
        }));
    }

    global.CRYSTAL_ARENA_SLOTS = CRYSTAL_ARENA_SLOTS;
    global.CRYSTAL_ARENA_TRACKER_DEFAULTS = CRYSTAL_ARENA_TRACKER_DEFAULTS;
    global.CRYSTAL_ARENA_PLAY_STATES = CRYSTAL_ARENA_PLAY_STATES;
    global.CRYSTAL_ARENA_CALIBRATION_STEPS = CRYSTAL_ARENA_CALIBRATION_STEPS;
    global.crystalArenaCalibrationBox = crystalArenaCalibrationBox;
    global.crystalArenaCameraBlocker = crystalArenaCameraBlocker;
    global.crystalArenaCameraErrorNotice = crystalArenaCameraErrorNotice;
    global.validateCrystalArenaSlots = validateCrystalArenaSlots;
    global.crystalArenaZonePixels = crystalArenaZonePixels;
    global.crystalArenaHitBox = crystalArenaHitBox;
    global.crystalArenaCoverCrop = crystalArenaCoverCrop;
    global.crystalArenaFindBlobs = crystalArenaFindBlobs;
    global.crystalArenaDilate = crystalArenaDilate;
    global.crystalArenaHsv = crystalArenaHsv;
    global.crystalArenaHueDistance = crystalArenaHueDistance;
    global.crystalArenaHueOffset = crystalArenaHueOffset;
    global.crystalArenaAppearanceModel = crystalArenaAppearanceModel;
    global.crystalArenaHaloBounds = crystalArenaHaloBounds;
    global.crystalArenaBlobScore = crystalArenaBlobScore;
    global.crystalArenaDominantHue = crystalArenaDominantHue;
    global.createCrystalArenaTracker = createCrystalArenaTracker;
    global.resolveCrystalArenaTheme = resolveCrystalArenaTheme;
    global.crystalArenaStopStream = crystalArenaStopStream;
    global.createCrystalArenaComponent = createCrystalArenaComponent;
})(typeof window !== 'undefined' ? window : globalThis);
