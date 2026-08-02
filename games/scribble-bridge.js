/**
 * Scribble Bridge — the shared 3D layer that carries a run between the top-down
 * dungeon and the side-view platformer.
 *
 * The two games are separate 2D canvases, but they already agree on a world:
 * both measure in pixels at PITCH = 64 per tile, and both project with
 *
 *     screen = (world - cam) * cam.z + view / 2
 *
 * That is an orthographic camera written out by hand. So a real orthographic
 * camera can be made to reproduce either game's framing *exactly*, and the arc
 * between those two camera poses is the transition. Nothing here fades one
 * flat layer into another: there is one room, built once, seen from two angles.
 *
 * Axes, and the whole design rests on these three lines:
 *
 *     X = the axis both games share (horizontal travel)
 *     Y = height          (only the side view reads it)
 *     Z = depth           (only the top view reads it)
 *
 *     dungeon    (wx, wy) -> (wx/PITCH, 0, wy/PITCH)
 *     platformer (wx, wy) -> (wx/PITCH, (floor - wy)/PITCH, 0)
 *
 * X survives the rotation, which is why the pawn does not jump: it keeps the
 * axis the two games agree on and is handed the one it was missing.
 *
 * The module loads without THREE and without a DOM — the camera and blueprint
 * maths are pure functions, so tests can exercise the part that has to be exact
 * without standing up WebGL.
 */
(function (global) {
    'use strict';

    // Must match both games. Neither imports the other, so this is asserted in
    // the tests rather than shared through a constant.
    const PITCH = 64;

    // How far the camera sits from its target. Orthographic projection ignores
    // distance for scale, so this only has to clear the geometry.
    const ORBIT_RADIUS = 40;

    // ---------------------------------------------------------------- easing

    function easeInOut(u) {
        return u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
    }

    function clamp01(v) {
        return v < 0 ? 0 : v > 1 ? 1 : v;
    }

    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    // ------------------------------------------------------- camera contract

    /**
     * The orthographic frustum that reproduces a 2D game's framing.
     *
     * One 3D unit is one tile, which is PITCH world pixels, which the 2D games
     * draw at `cam.z` screen pixels each — so a unit covers `cam.z * PITCH`
     * screen pixels, and the frustum is just the viewport measured in units.
     *
     * `unit` is that pixels-per-unit figure, and it is also what turns a 3D
     * point back into a screen position, so overlay buttons keep working.
     */
    function bridgeFrustum(view, camZ, pitch) {
        const unit = camZ * (pitch || PITCH);
        const halfW = view.w / (2 * unit);
        const halfH = view.h / (2 * unit);
        return { left: -halfW, right: halfW, top: halfH, bottom: -halfH, unit: unit };
    }

    /**
     * Where the dungeon's camera is looking, in 3D. The floor is the Y = 0
     * plane, so a top-down camera target sits on it.
     */
    function topTarget(cam, pitch) {
        const p = pitch || PITCH;
        return [cam.x / p, 0, cam.y / p];
    }

    /**
     * Where the platformer's camera is looking, in 3D. Its world y grows
     * downward from the room's floor line, so height is the distance above it.
     */
    function sideTarget(cam, floorY, pitch) {
        const p = pitch || PITCH;
        return [cam.x / p, (floorY - cam.y) / p, 0];
    }

    /**
     * The camera pose partway through the arc.
     *
     * The move is a single rotation about X, from looking straight down to
     * looking straight ahead. Writing it as an elevation angle keeps `up`
     * exactly perpendicular the whole way, which a naive lerp of two up-vectors
     * does not — that is what makes the horizon roll instead of tilt.
     *
     *     phi = 90deg  ->  above the target, up = -Z   (the dungeon's framing)
     *     phi = 0deg   ->  in front of it,   up = +Y   (the platformer's)
     *
     * Target and scale travel with it, so a transition between two rooms that
     * are framed differently still lands exactly on the destination framing.
     */
    function bridgePose(framing, progress) {
        const t = easeInOut(clamp01(progress));
        const from = framing.top;
        const to = framing.side;

        const target = [
            lerp(from.target[0], to.target[0], t),
            lerp(from.target[1], to.target[1], t),
            lerp(from.target[2], to.target[2], t),
        ];

        const phi = lerp(Math.PI / 2, 0, t);
        const sin = Math.sin(phi);
        const cos = Math.cos(phi);

        return {
            target: target,
            position: [target[0], target[1] + ORBIT_RADIUS * sin, target[2] + ORBIT_RADIUS * cos],
            up: [0, cos, -sin],
            // Scale is interpolated in pixels-per-unit, not in the games' zoom,
            // because that is the quantity the eye is actually tracking.
            unit: lerp(from.unit, to.unit, t),
        };
    }

    /**
     * The two endpoint framings, each captured from a live game camera.
     *
     * `top` comes from the dungeon (cam + view), `side` from the platformer
     * (cam + view + the room's floor line). Either may be given the other's
     * values when a transition begins and ends in the same view — that is the
     * degenerate arc, and it is exactly what proves the seam is right.
     */
    function bridgeFraming(top, side, pitch) {
        const p = pitch || PITCH;
        return {
            top: {
                target: topTarget(top.cam, p),
                unit: bridgeFrustum(top.view, top.cam.z, p).unit,
            },
            side: {
                target: sideTarget(side.cam, side.floorY || 0, p),
                unit: bridgeFrustum(side.view, side.cam.z, p).unit,
            },
        };
    }

    // ------------------------------------------------ magic-door cinematic

    function segment(value, from, to) {
        if (to === from) return value >= to ? 1 : 0;
        return clamp01((value - from) / (to - from));
    }

    function pointLerp(from, to, t) {
        return [
            lerp(from[0], to[0], t),
            lerp(from[1], to[1], t),
            lerp(from[2], to[2], t),
        ];
    }

    function quadraticPoint(from, control, to, t) {
        const a = 1 - t;
        return [
            a * a * from[0] + 2 * a * t * control[0] + t * t * to[0],
            a * a * from[1] + 2 * a * t * control[1] + t * t * to[1],
            a * a * from[2] + 2 * a * t * control[2] + t * t * to[2],
        ];
    }

    function directionBetween(from, to) {
        const dx = to[0] - from[0];
        const dy = to[1] - from[1];
        const dz = to[2] - from[2];
        const length = Math.hypot(dx, dy, dz) || 1;
        return [dx / length, dy / length, dz / length];
    }

    function smoothRoute(points, radius) {
        if (points.length < 3) return points.map(function (point) { return point.slice(); });
        const route = [points[0].slice()];
        const cornerRadius = radius == null ? 0.42 : radius;
        for (let i = 1; i < points.length - 1; i++) {
            const previous = points[i - 1];
            const corner = points[i];
            const next = points[i + 1];
            const incoming = directionBetween(previous, corner);
            const outgoing = directionBetween(corner, next);
            const previousLength = Math.hypot(corner[0] - previous[0],
                corner[1] - previous[1], corner[2] - previous[2]);
            const nextLength = Math.hypot(next[0] - corner[0],
                next[1] - corner[1], next[2] - corner[2]);
            const trim = Math.min(cornerRadius, previousLength * 0.35, nextLength * 0.35);
            const before = [corner[0] - incoming[0] * trim,
                corner[1] - incoming[1] * trim, corner[2] - incoming[2] * trim];
            const after = [corner[0] + outgoing[0] * trim,
                corner[1] + outgoing[1] * trim, corner[2] + outgoing[2] * trim];
            route.push(before);
            for (let step = 1; step <= 3; step++) {
                route.push(quadraticPoint(before, corner, after, step / 4));
            }
            route.push(after);
        }
        route.push(points[points.length - 1].slice());
        return route;
    }

    function routeMetrics(points) {
        const lengths = [];
        let total = 0;
        for (let i = 0; i < points.length - 1; i++) {
            const length = Math.hypot(
                points[i + 1][0] - points[i][0],
                points[i + 1][1] - points[i][1],
                points[i + 1][2] - points[i][2]);
            lengths.push(length);
            total += length;
        }
        return {lengths: lengths, total: total || 1};
    }

    function routePoint(points, metrics, progress) {
        let distance = clamp01(progress) * metrics.total;
        for (let i = 0; i < metrics.lengths.length; i++) {
            if (distance <= metrics.lengths[i] || i === metrics.lengths.length - 1) {
                const t = metrics.lengths[i] ? distance / metrics.lengths[i] : 0;
                return pointLerp(points[i], points[i + 1], clamp01(t));
            }
            distance -= metrics.lengths[i];
        }
        return points[points.length - 1].slice();
    }

    function routeDistanceToPoint(metrics, pointIndex) {
        let distance = 0;
        for (let i = 0; i < pointIndex && i < metrics.lengths.length; i++) {
            distance += metrics.lengths[i];
        }
        return distance;
    }

    function nearestRouteDistance(points, metrics, target) {
        let bestDistance = 0;
        let bestSeparation = Infinity;
        let travelled = 0;
        for (let i = 0; i < points.length - 1; i++) {
            const from = points[i];
            const to = points[i + 1];
            const dx = to[0] - from[0];
            const dy = to[1] - from[1];
            const dz = to[2] - from[2];
            const lengthSq = dx * dx + dy * dy + dz * dz || 1;
            const t = clamp01(((target[0] - from[0]) * dx +
                (target[1] - from[1]) * dy + (target[2] - from[2]) * dz) / lengthSq);
            const nearest = [from[0] + dx * t, from[1] + dy * t, from[2] + dz * t];
            const separation = Math.hypot(target[0] - nearest[0],
                target[1] - nearest[1], target[2] - nearest[2]);
            if (separation < bestSeparation) {
                bestSeparation = separation;
                bestDistance = travelled + metrics.lengths[i] * t;
            }
            travelled += metrics.lengths[i];
        }
        return bestDistance;
    }

    function cameraUp(position, target, candidate) {
        const view = directionBetween(position, target);
        const dot = candidate[0] * view[0] + candidate[1] * view[1] + candidate[2] * view[2];
        const projected = [
            candidate[0] - view[0] * dot,
            candidate[1] - view[1] * dot,
            candidate[2] - view[2] * dot,
        ];
        const length = Math.hypot(projected[0], projected[1], projected[2]) || 1;
        return [projected[0] / length, projected[1] / length, projected[2] / length];
    }

    /**
     * Camera and effect state for the top-down -> side-view magic-door move.
     *
     * The projection changes while the camera is still exactly overhead and at
     * the same scale, so the first perspective frame still reads as the original
     * 2D drawing. Zoom and rotation then happen together. No player is part of
     * this state; the bolt is the sole carrier.
     */
    function magicDoorTransitionState(progress, options) {
        const p = clamp01(progress);
        const opts = options || {};
        const view = opts.view || { w: 1280, h: 800 };
        const tunnelWidth = opts.tunnelWidth || 7;
        const narrowTunnelWidth = opts.narrowTunnelWidth || 2;
        const tunnelHeight = opts.tunnelHeight || 8;
        const handoffEyeHeight = opts.handoffEyeHeight || 3.4;
        const start = opts.start || [0, 0.22, 1.1];
        const door = opts.door || [0, 0.35, -3.35];
        const entry = opts.entry || [0, 1.5, -4.8];
        const defaultImpact = opts.impact || [entry[0] + 4, handoffEyeHeight, -53.1];
        const route = smoothRoute(opts.route || [
            entry,
            [entry[0], entry[1], -12],
            [entry[0] + 9, entry[1], -12],
            [entry[0] + 9, entry[1], -20],
            [entry[0] - 3, entry[1], -20],
            [entry[0] - 3, entry[1], -25],
            [entry[0] + 3, entry[1], -25],
            [entry[0] + 3, entry[1], -30],
            [entry[0] - 5, entry[1], -30],
            [entry[0] - 5, entry[1], -36],
            [entry[0] + 5, entry[1], -36],
            [entry[0] + 5, entry[1], -41],
            [entry[0] - 2, entry[1], -41],
            [entry[0] - 2, entry[1], -46],
            [entry[0] + 4, handoffEyeHeight, -46],
            defaultImpact,
        ]);
        const routeInfo = routeMetrics(route);
        const impact = route[route.length - 1];
        const approachRoute = [];
        for (let step = 0; step <= 16; step++) {
            approachRoute.push(quadraticPoint(start, [0, 1.45, -0.8], door, step / 16));
        }
        approachRoute.push(entry.slice());
        const approachInfo = routeMetrics(approachRoute);
        const flightRoute = approachRoute.concat(route.slice(1));
        const flightInfo = routeMetrics(flightRoute);
        const flightStart = 0.04;
        const flightEnd = 0.82;
        const shatterEnd = 0.865;
        const characterStart = 0.875;
        const characterEnd = 0.96;
        const initialMultiplier = opts.initialMultiplier || 1.35;
        const fastMultiplier = opts.fastMultiplier || 2.4;
        const fastStartPoint = opts.fastStart || route[Math.min(4, route.length - 1)];
        const fastStartDistance = Math.min(flightInfo.total,
            approachInfo.total + nearestRouteDistance(route, routeInfo, fastStartPoint));
        const destinationEntryPoint = opts.destinationEntry || route[Math.max(0, route.length - 2)];
        const destinationStartDistance = Math.min(flightInfo.total,
            approachInfo.total + nearestRouteDistance(route, routeInfo, destinationEntryPoint));
        const weightedFastStart = fastStartDistance / initialMultiplier;
        const weightedFlightDistance = weightedFastStart +
            (flightInfo.total - fastStartDistance) / fastMultiplier;
        const doorPointIndex = approachRoute.length - 2;
        const entryPointIndex = approachRoute.length - 1;
        const doorDistance = routeDistanceToPoint(flightInfo, doorPointIndex);
        const entryDistance = routeDistanceToPoint(flightInfo, entryPointIndex);
        const progressAtDistance = function (distance) {
            const weightedDistance = distance <= fastStartDistance ? distance / initialMultiplier :
                weightedFastStart + (distance - fastStartDistance) / fastMultiplier;
            return flightStart + (flightEnd - flightStart) * weightedDistance / weightedFlightDistance;
        };
        const doorHitProgress = progressAtDistance(doorDistance);
        const entryProgress = progressAtDistance(entryDistance);
        const perspectiveStart = Math.max(flightStart + 0.025, doorHitProgress - 0.025);
        const zoomStart = progressAtDistance(Math.min(flightInfo.total, entryDistance + 4.5));
        const zoomEnd = Math.min(flightEnd - 0.36, zoomStart + 0.115);
        const turnStart = zoomStart + 0.075;
        const turnEnd = Math.min(flightEnd - 0.25, turnStart + 0.135);
        const fastStartProgress = progressAtDistance(fastStartDistance);
        const destinationStartProgress = progressAtDistance(destinationStartDistance);
        const tunnelUnit = Math.max(
            opts.tunnelUnit || 150,
            view.w / (tunnelWidth - 0.35),
            view.h / (tunnelHeight - 0.35)
        );
        const handoffFov = opts.handoffFov || 46;
        const handoffDistance = opts.handoffDistance ||
            (handoffEyeHeight / Math.tan(handoffFov * Math.PI / 360) - 0.02);

        function flightDistanceAt(value) {
            const weightedDistance = segment(value, flightStart, flightEnd) * weightedFlightDistance;
            return Math.min(flightInfo.total,
                weightedDistance <= weightedFastStart ? weightedDistance * initialMultiplier :
                    fastStartDistance + (weightedDistance - weightedFastStart) * fastMultiplier);
        }

        function boltAt(value) {
            if (value < flightStart) return start.slice();
            if (value < flightEnd) {
                return routePoint(flightRoute, flightInfo,
                    flightDistanceAt(value) / flightInfo.total);
            }
            return impact.slice();
        }

        const bolt = boltAt(p);
        const nextBolt = boltAt(Math.min(flightEnd, p + 0.002));
        const finalDirection = directionBetween(route[route.length - 2], impact);
        const direction = p >= flightEnd ? finalDirection : directionBetween(bolt, nextBolt);
        const flightDistance = flightDistanceAt(p);
        const tunnelTravel = clamp01((flightDistance - approachInfo.total) / routeInfo.total);
        let phase = 'ready';
        if (p >= flightStart) phase = 'follow-2d';
        if (p >= perspectiveStart) phase = 'top-3d';
        if (p >= doorHitProgress) phase = 'door-burst';
        if (p >= entryProgress) phase = 'tunnel-entry';
        if (p >= zoomStart) phase = 'camera-zoom';
        if (p >= turnStart) phase = 'camera-turn';
        if (p >= turnEnd) phase = 'corridor-turns';
        if (p >= fastStartProgress) phase = 'rapid-corridors';
        if (p >= destinationStartProgress) phase = 'destination-room';
        if (p >= flightEnd - 0.055) phase = 'approach';
        if (p >= flightEnd) phase = 'impact';
        if (p >= shatterEnd) phase = 'side-handoff';
        if (p >= characterStart) phase = 'character-entry';

        const flashProgress = segment(p, flightEnd, flightEnd + 0.018);
        const flash = p >= flightEnd && p < flightEnd + 0.018 ?
            Math.sin(flashProgress * Math.PI) * 0.58 : 0;

        let pose;
        if (p < perspectiveStart) {
            const follow = easeInOut(segment(p, flightStart, perspectiveStart - 0.018));
            const roomTarget = opts.roomTarget || [start[0], 0, 0];
            const target = pointLerp(roomTarget, [bolt[0], 0, bolt[2]], follow);
            pose = {
                target: target,
                position: [target[0], target[1] + ORBIT_RADIUS, target[2]],
                up: [0, 0, -1],
                unit: opts.startUnit || 56,
            };
        } else {
            const zoom = easeInOut(segment(p, zoomStart, zoomEnd));
            const turn = easeInOut(segment(p, turnStart, turnEnd));
            const rapidFollow = easeInOut(segment(p, fastStartProgress, fastStartProgress + 0.025));
            const destinationMoveStart = destinationStartProgress + 0.025;
            const destinationFrame = easeInOut(segment(p, destinationMoveStart, flightEnd - 0.006));
            const closeRadius = lerp(opts.chaseRadius || 2.6,
                opts.rapidChaseRadius || 1.05, rapidFollow);
            const aheadDistance = lerp(1.15, 0.12, rapidFollow);
            const ahead = aheadDistance / routeInfo.total;
            const desiredUnit = lerp(opts.startUnit || 56, tunnelUnit, zoom);
            const turnFov = lerp(2, 54, turn);
            const fov = p < destinationStartProgress ? turnFov :
                lerp(54, handoffFov, easeInOut(segment(p, destinationStartProgress, flightEnd)));
            const topDistance = view.h /
                (2 * desiredUnit * Math.tan(fov * Math.PI / 360));
            const flatTarget = [bolt[0], 0, bolt[2]];
            const travelled = Math.max(0, flightDistance - flightDistanceAt(turnStart));
            const lagDistance = Math.min(closeRadius * turn, travelled * 0.65);
            const chasePosition = routePoint(route, routeInfo,
                Math.max(0, tunnelTravel - lagDistance / routeInfo.total));
            const finalPosition = [
                impact[0] - finalDirection[0] * handoffDistance,
                handoffEyeHeight,
                impact[2] - finalDirection[2] * handoffDistance,
            ];
            const levelPosition = pointLerp(chasePosition, finalPosition, destinationFrame);
            const levelTarget = routePoint(route, routeInfo, Math.min(1, tunnelTravel + ahead));
            const chaseTarget = pointLerp(flatTarget, levelTarget, turn);
            const lockedTarget = [
                levelPosition[0] + finalDirection[0] * handoffDistance,
                levelPosition[1],
                levelPosition[2] + finalDirection[2] * handoffDistance,
            ];
            const orientationLock = easeInOut(segment(p,
                destinationStartProgress, destinationMoveStart));
            const target = pointLerp(chaseTarget, lockedTarget, orientationLock);
            const overheadPosition = [flatTarget[0], flatTarget[1] + topDistance, flatTarget[2]];
            const horizontalPosition = pointLerp(overheadPosition, levelPosition, turn);
            const position = [
                horizontalPosition[0],
                lerp(overheadPosition[1], levelPosition[1], turn),
                horizontalPosition[2],
            ];
            const upCandidate = pointLerp([0, 0, -1], [0, 1, 0], turn);
            pose = {
                target: target,
                position: position,
                up: cameraUp(position, target, upCandidate),
                unit: desiredUnit,
                perspective: true,
                fov: fov,
            };
        }

        return {
            progress: p,
            phase: phase,
            flash: flash,
            tunnel: {
                width: tunnelWidth, narrowWidth: narrowTunnelWidth,
                height: tunnelHeight, unit: tunnelUnit,
                route: route.map(function (point) { return point.slice(); }),
            },
            pose: pose,
            timing: {
                flightStart: flightStart,
                perspectiveStart: perspectiveStart,
                doorHit: doorHitProgress,
                entry: entryProgress,
                zoomStart: zoomStart,
                zoomEnd: zoomEnd,
                turnStart: turnStart,
                turnEnd: turnEnd,
                fastStart: fastStartProgress,
                destinationStart: destinationStartProgress,
                impact: flightEnd,
                shatterEnd: shatterEnd,
                characterStart: characterStart,
                characterEnd: characterEnd,
            },
            doorBurst: {
                visible: p >= doorHitProgress && p < doorHitProgress + 0.075,
                broken: p >= doorHitProgress,
                position: door.slice(),
                amount: easeInOut(segment(p, doorHitProgress, doorHitProgress + 0.048)),
                opacity: 1 - easeInOut(segment(p, doorHitProgress + 0.032, doorHitProgress + 0.075)),
            },
            wallBurst: {
                visible: p >= flightEnd && p < characterStart,
                position: impact.slice(),
                direction: finalDirection.slice(),
                amount: easeInOut(segment(p, flightEnd, shatterEnd)),
                opacity: 1 - easeInOut(segment(p, shatterEnd - 0.006, characterStart)),
            },
            bolt: {
                visible: p >= flightStart - 0.005,
                position: bolt,
                direction: direction,
                spin: p * Math.PI * 12,
                distance: flightDistance,
                speed: weightedFlightDistance / (flightEnd - flightStart) *
                    (p >= fastStartProgress ? fastMultiplier : initialMultiplier),
                impact: easeInOut(segment(p, flightEnd, shatterEnd)),
            },
            character: (function () {
                const amount = easeInOut(segment(p, characterStart, characterEnd));
                const verticalSpan = 2 * handoffDistance *
                    Math.tan(handoffFov * Math.PI / 360);
                const leftEdge = impact[0] - verticalSpan *
                    (view.w / Math.max(1, view.h)) / 2;
                return {
                    visible: p >= characterStart,
                    amount: amount,
                    position: [lerp(leftEdge - 0.65, leftEdge + 1.25, amount),
                        Math.abs(Math.sin(amount * Math.PI * 3)) * 0.055,
                        impact[2] - finalDirection[2] * 0.72],
                };
            })(),
        };
    }

    /**
     * Builds the authored room plus an open-top, turning transition tunnel.
     */
    function magicDoorTransitionStage(spec) {
        const stage = bridgeStage(spec);
        stage.planes.forEach(function (plane) {
            const onFloor = plane.reading === 'top' && plane.position && plane.position[1] <= 0.06;
            plane.group = onFloor ? 'chamber-floor' : 'chamber-walls';
        });
        stage.instances.forEach(function (instance) { instance.group = 'chamber-walls'; });
        const ox = spec.origin[0];
        const oz = spec.origin[1];
        const centreX = ox + (spec.width - 1) / 2;
        const doorZ = oz;
        const tunnelWidth = spec.tunnelWidth || 7;
        const tunnelHeight = spec.tunnelHeight || 8;
        const tunnelStart = spec.tunnelStart == null ? doorZ - 0.5 : spec.tunnelStart;
        const top = spec.top || {};
        const side = spec.side || {};

        stage.planes.forEach(function (plane) {
            if (plane.group === 'chamber-walls' && plane.position && plane.position[2] < doorZ - 0.2) {
                plane.group = 'separator-wall';
            }
        });
        stage.instances.forEach(function (instance) {
            if (instance.position && instance.position[2] <= doorZ) instance.group = 'separator-wall';
        });

        stage.planes.forEach(function (plane) {
            const underSelectedDoor = plane.group === 'chamber-floor' && plane.position &&
                Math.abs(plane.position[0] - centreX) < 0.01 &&
                Math.abs(plane.position[2] - doorZ) < 0.01;
            if (underSelectedDoor) plane.group = 'selected-door-base';
        });

        // The outgoing room remains the original flat drawing. Its floor plates,
        // wall ink, doors and wand stay, but none of its standing 3D geometry is
        // carried into this transition stage.
        stage.planes = stage.planes.filter(function (plane) {
            return plane.group === 'chamber-floor' || plane.group === 'selected-door-base';
        });
        stage.instances = [];

        function plane(name, sprite, position, rotation, size, repeat, reading, group) {
            stage.planes.push({
                name: name,
                sprite: sprite,
                reading: reading || 'transition',
                position: position,
                rotation: rotation,
                size: size,
                repeat: repeat,
                group: group || (reading === 'top' ? 'chamber-floor' : 'tunnel-walls'),
            });
        }

        [-2.4, 0, 2.4].forEach(function (offset, index) {
            plane('magic-door-' + index, top.door || top.wall,
                [centreX + offset, 0.035, doorZ + 0.14], [-90, 0, 0], [1.45, 1.25], null, 'top',
                index === 1 ? 'selected-door' : 'chamber-floor');
        });
        plane('magic-door-open', top.openDoor || top.floor,
            [centreX, 0.035, doorZ + 0.14], [-90, 0, 0], [1.45, 1.25], null, 'top',
            'selected-door-open');
        plane('magic-wand', top.wand || top.floor,
            [centreX, 0.055, oz + spec.depth - 2], [-90, 0, 0], [1.2, 1.2], null, 'top',
            'chamber-floor');

        const narrowTunnelWidth = Math.max(2, Math.round(spec.narrowTunnelWidth || 2));
        const narrowAfterSegment = spec.narrowAfterSegment == null ? 4 : spec.narrowAfterSegment;
        const firstZ = Math.round(tunnelStart - 0.5);
        const routeCentres = spec.tunnelRoute || [
            [centreX, firstZ],
            [centreX, firstZ - 8],
            [centreX + 9, firstZ - 8],
            [centreX + 9, firstZ - 16],
            [centreX - 3, firstZ - 16],
            [centreX - 3, firstZ - 21],
            [centreX + 3, firstZ - 21],
            [centreX + 3, firstZ - 26],
            [centreX - 5, firstZ - 26],
            [centreX - 5, firstZ - 32],
            [centreX + 5, firstZ - 32],
            [centreX + 5, firstZ - 37],
            [centreX - 2, firstZ - 37],
            [centreX - 2, firstZ - 42],
            [centreX + 4, firstZ - 42],
            [centreX + 4, firstZ - 49],
            [centreX + 4, firstZ - 63],
        ];
        const branchRoutes = spec.tunnelBranches || [
            [[centreX + 3, firstZ - 21], [centreX + 7, firstZ - 21],
                [centreX + 7, firstZ - 23]],
            [[centreX - 5, firstZ - 32], [centreX - 9, firstZ - 32],
                [centreX - 9, firstZ - 36], [centreX - 7, firstZ - 36]],
            [[centreX - 2, firstZ - 37], [centreX - 7, firstZ - 37],
                [centreX - 7, firstZ - 42], [centreX - 2, firstZ - 42]],
        ];
        const occupied = new Set();
        const destinationRoom = {
            minX: centreX - 3,
            maxX: centreX + 11,
            minZ: firstZ - 63,
            maxZ: firstZ - 50,
        };
        const destinationLadders = [centreX - 1, centreX + 2, centreX + 6, centreX + 9];
        const handoffEyeHeight = spec.handoffEyeHeight || 3.4;

        function occupySegment(from, to, width) {
            const dx = Math.sign(to[0] - from[0]);
            const dz = Math.sign(to[1] - from[1]);
            const crossX = -dz;
            const crossZ = dx;
            const laneStart = -Math.floor(width / 2);
            const steps = Math.max(Math.abs(to[0] - from[0]), Math.abs(to[1] - from[1]));
            for (let step = 0; step <= steps; step++) {
                const x = from[0] + dx * step;
                const z = from[1] + dz * step;
                for (let lane = 0; lane < width; lane++) {
                    const offset = laneStart + lane;
                    occupied.add((x + crossX * offset) + ',' + (z + crossZ * offset));
                }
            }
        }

        for (let i = 0; i < routeCentres.length - 1; i++) {
            const from = routeCentres[i];
            const to = routeCentres[i + 1];
            occupySegment(from, to, i < narrowAfterSegment ? tunnelWidth : narrowTunnelWidth);
        }
        branchRoutes.forEach(function (branch) {
            for (let i = 0; i < branch.length - 1; i++) {
                occupySegment(branch[i], branch[i + 1], narrowTunnelWidth);
            }
        });
        for (let z = destinationRoom.minZ; z <= destinationRoom.maxZ; z++) {
            for (let x = destinationRoom.minX; x <= destinationRoom.maxX; x++) {
                occupied.add(x + ',' + z);
            }
        }

        const rows = {};
        occupied.forEach(function (key) {
            const parts = key.split(',').map(Number);
            (rows[parts[1]] || (rows[parts[1]] = [])).push(parts[0]);
        });
        let floorIndex = 0;
        Object.keys(rows).map(Number).sort(function (a, b) { return a - b; }).forEach(function (z) {
            const xs = rows[z].sort(function (a, b) { return a - b; });
            let runStart = xs[0];
            for (let i = 1; i <= xs.length; i++) {
                if (i < xs.length && xs[i] === xs[i - 1] + 1) continue;
                const runEnd = xs[i - 1];
                const length = runEnd - runStart + 1;
                const x = (runStart + runEnd) / 2;
                plane('tunnel-floor-' + floorIndex, top.floor,
                    [x, 0, z], [-90, 0, 0], [length, 1], [length, 1], null, 'tunnel-floor');
                floorIndex++;
                runStart = xs[i];
            }
        });

        const last = routeCentres[routeCentres.length - 1];
        const previous = routeCentres[routeCentres.length - 2];
        const finalDx = Math.sign(last[0] - previous[0]);
        const finalDz = Math.sign(last[1] - previous[1]);
        let wallIndex = 0;
        const wallCaps = new Set();
        const studioCapFace = 0.66;
        const studioCapTopInset = 0.02;

        function boundaryWall(x, z, nx, nz, rotation) {
            if (occupied.has((x + nx) + ',' + (z + nz))) return;
            if (z >= doorZ) return;
            const opensIntoChamber = nz === 1 && Math.abs(z - firstZ) < 0.01;
            if (opensIntoChamber) return;
            const onImpact = nx === finalDx && nz === finalDz &&
                Math.abs((x - last[0]) * finalDx + (z - last[1]) * finalDz) < 0.01;
            plane((onImpact ? 'tunnel-impact-wall-' : 'tunnel-wall-') + wallIndex,
                side.wall,
                [x + nx * 0.5, tunnelHeight / 2, z + nz * 0.5], rotation,
                [1, tunnelHeight], [1, tunnelHeight], null, 'tunnel-walls');
            const capX = x + nx * studioCapFace;
            const capZ = z + nz * studioCapFace;
            const capKey = capX.toFixed(3) + ',' + capZ.toFixed(3);
            if (!wallCaps.has(capKey)) {
                wallCaps.add(capKey);
                plane('tunnel-wall-cap-' + wallIndex, side.cap || side.wall,
                    [capX, tunnelHeight - studioCapTopInset, capZ],
                    [-90, 0, nz ? 90 : 0], [1, 1], [1, 1],
                    'top', 'tunnel-wall-tops');
            }
            wallIndex++;
        }

        occupied.forEach(function (key) {
            const parts = key.split(',').map(Number);
            const x = parts[0], z = parts[1];
            boundaryWall(x, z, -1, 0, [0, 90, 0]);
            boundaryWall(x, z, 1, 0, [0, -90, 0]);
            boundaryWall(x, z, 0, -1, [0, 0, 0]);
            boundaryWall(x, z, 0, 1, [0, 180, 0]);
        });

        destinationLadders.forEach(function (x, index) {
            plane('destination-ladder-' + index, side.ladder || side.wall,
                [x, 2.55, destinationRoom.minZ - 0.48], [0, 0, 0],
                [1.15, 5.1], [1, 5], null, 'destination-details');
        });

        stage.instances.push({
            name: 'arrival-character',
            group: 'arrival-character',
            position: [0, -100, 0],
            yaw: 0,
            planes: [
                {sprite: side.characterBody, reading: 'transition',
                    position: [0, 0.64, 0], rotation: [0, 0, 0], size: [0.72, 1.28]},
                {sprite: side.characterHand, reading: 'transition',
                    position: [-0.43, 0.55, 0.025], rotation: [0, 0, 0], size: [0.24, 0.24]},
                {sprite: side.characterHand, reading: 'transition',
                    position: [0.43, 0.55, 0.025], rotation: [0, 0, 0], size: [0.24, 0.24]},
            ],
        });

        const finalDirection = [finalDx, 0, finalDz];
        const impact = [
            last[0] + finalDirection[0] * 0.48,
            handoffEyeHeight,
            last[1] + finalDirection[2] * 0.48,
        ];
        const roomDepth = destinationRoom.maxZ - destinationRoom.minZ;
        const route = routeCentres.map(function (point) {
            const roomProgress = clamp01((destinationRoom.maxZ - point[1]) / roomDepth);
            return [point[0], lerp(1.5, handoffEyeHeight, easeInOut(roomProgress)), point[1]];
        });
        route.push(impact);

        stage.magic = {
            centreX: centreX,
            door: [centreX, 0.35, doorZ - 0.35],
            entry: route[0].slice(),
            turnStart: route[1].slice(),
            approach: route[route.length - 2].slice(),
            impact: impact,
            route: route,
            branches: branchRoutes.map(function (branch) {
                return branch.map(function (point) { return [point[0], 1.5, point[1]]; });
            }),
            destinationEntry: [centreX + 4, 1.5, destinationRoom.maxZ],
            destinationRoom: Object.assign({}, destinationRoom),
            destinationLadders: destinationLadders.slice(),
            arrivalCharacter: 'arrival-character',
            tunnelWidth: tunnelWidth,
            narrowTunnelWidth: narrowTunnelWidth,
            narrowAfterSegment: narrowAfterSegment,
            fastStart: route[Math.min(narrowAfterSegment, route.length - 1)].slice(),
            tunnelHeight: tunnelHeight,
            tunnelStart: tunnelStart,
            tunnelEnd: impact[2],
        };
        return stage;
    }

    // ---------------------------------------------------------- studio recipes

    // The studio authors on a 2.5-unit tile; the bridge works in tiles, because
    // that is what the two games' PITCH means. Everything coming out of a
    // recipe is divided by this.
    const STUDIO_TILE = 2.5;

    /**
     * Converts a Hybrid Asset Studio recipe into bridge planes.
     *
     * This is the point of the studio: a wall is not something this module
     * models, it is something authored in the Panel Composer and read back
     * here. A stepped battlement — merlons at full height, crenels recessed,
     * cross-strips between them — is a dozen panels at different heights, and
     * none of that is expressible as "a wall tile". So it is not expressed
     * here at all; it is loaded.
     *
     * `refs` supplies the two pack paths, because the "Copy values for Codex"
     * export carries `panels` but not the recipe's own top/sideReference. A
     * panel that names its own `sourceReference` — which is how a panel gets a
     * `rect`, and therefore how one PNG yields many different strips — wins
     * over the pack default.
     */
    function bridgeRecipePlanes(recipe, refs) {
        return (recipe.panels || []).map(function (panel) {
            const own = panel.sourceReference;
            const fallback = panel.reference === 'top' ? refs.top : refs.side;
            const rotation = panel.rotation || [0, 0, 0];
            return {
                source: own && own.source ? own.source : fallback,
                rect: own && own.rect ? own.rect.slice() : null,
                flipX: !!panel.flipX,
                flipY: !!panel.flipY,
                position: [
                    panel.position[0] / STUDIO_TILE,
                    panel.position[1] / STUDIO_TILE,
                    panel.position[2] / STUDIO_TILE,
                ],
                rotation: rotation.slice(),
                size: [panel.size[0] / STUDIO_TILE, panel.size[1] / STUDIO_TILE],
                // Which way the panel faces, not which pack it came from. The
                // studio's `reference` says the latter; a battlement roof is
                // cut from the top-down pack but a roof is still a roof, and a
                // vertical panel wearing arrow.png still reads from the side.
                reading: Math.abs(Math.abs(rotation[0]) - 90) < 1 ? 'top' : 'side',
            };
        });
    }

    /**
     * Places a recipe at a tile. The yaw is kept on the instance rather than
     * folded into each panel's rotation: composing a turn with panels that are
     * already rotated about two axes is not componentwise addition, and the
     * renderer gets it right for free by nesting them in a group.
     */
    /**
     * Where a recipe's panels actually sit, in tiles, relative to its origin.
     *
     * An asset authored in the Panel Composer is not necessarily centred on its
     * own origin: `Connected + arrow sides virtual 1` puts its front face at
     * z = 1.25 and its arrows at 0.85, so the whole brick leans forward of the
     * point it is placed at. Dropping one on a tile therefore lands it off the
     * tile, and a wall built from them drifts off the floor plan.
     *
     * This measures the panel positions — their centres, not their rotated
     * extents, which is enough to re-seat a brick on a grid and is the only
     * thing that can be read off a recipe without resolving every rotation.
     */
    function bridgeRecipeCentre(recipe) {
        const panels = recipe.panels || [];
        if (!panels.length) return [0, 0];
        let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
        panels.forEach(function (p) {
            minX = Math.min(minX, p.position[0]); maxX = Math.max(maxX, p.position[0]);
            minZ = Math.min(minZ, p.position[2]); maxZ = Math.max(maxZ, p.position[2]);
        });
        return [(minX + maxX) / 2 / STUDIO_TILE, (minZ + maxZ) / 2 / STUDIO_TILE];
    }

    function bridgeInstance(recipe, refs, position, yaw) {
        return {
            name: recipe.asset || recipe.name || 'recipe',
            position: position.slice(),
            yaw: yaw || 0,
            planes: bridgeRecipePlanes(recipe, refs),
        };
    }

    // ------------------------------------------------------------- blueprint

    /**
     * The transition room, built as a stage set.
     *
     * This is the studio's hybrid principle applied at room scale rather than
     * tile scale. One box, two readings, and each reading's art is edge-on —
     * therefore invisible — from the other reading's camera:
     *
     *     seen from directly above    the floor and its wall ring read, and
     *                                 they are the dungeon's own top-down art:
     *                                 a room, exactly as the dungeon draws it.
     *
     *     seen from directly ahead    the floor collapses to the ground line
     *                                 and the back wall reads, and it is the
     *                                 platformer's own side art: a level.
     *
     * The floor doing double duty is the part that makes this a real hybrid
     * rather than two pictures in one place: the dungeon's floor plane, seen
     * edge-on, *is* the platformer's ground line. There is one surface there,
     * not two, which is why the pawn can stand on it through the whole arc.
     *
     * Nothing here is a cube. An earlier draft raised every wall tile into an
     * open-bottom cube, which is right for a prop but wrong for a room: it
     * produced a floor plan one tile tall, so the side view was a thin strip
     * with nowhere to play.
     *
     *   spec.origin        [x, z] of the room's first tile, dungeon tile coords
     *   spec.width/depth   the floor plan, in tiles
     *   spec.height        how far the walls rise, in tiles
     *   spec.top           {floor, wall, corner} — top-down sprite names
     *   spec.side          {wall} — the standing wall's side-view sprite
     *   spec.props         [{c, r, top, side, height}] — crates and the like,
     *                      each an open-bottom cube: its top face wears the
     *                      top-down PNG, its sides the platformer's.
     */
    function bridgeStage(spec) {
        const ox = spec.origin[0];
        const oz = spec.origin[1];
        const width = spec.width;
        const depth = spec.depth;
        const height = spec.height;
        const planes = [];
        const instances = [];
        // Zero unless the caller overrides it: a wall brick's authored lean is
        // meaningful — it is what pushes the masonry to the outer face — so it
        // must not be quietly centred away.
        const brickCentre = (spec.wallBrick && spec.wallBrick.anchor) || [0, 0];

        function flat(sprite, x, z, y, yaw) {
            planes.push({
                sprite: sprite, reading: 'top',
                position: [x, y, z],
                // Lying in the XZ plane. The studio's base decal rotation, which
                // is what sends image-top to -Z and image-left to -X.
                rotation: [-90, 0, yaw || 0],
                size: [1, 1],
            });
        }

        function upright(sprite, x, y, z, yaw) {
            planes.push({
                sprite: sprite, reading: 'side',
                position: [x, y, z],
                rotation: [0, yaw || 0, 0],
                size: [1, 1],
            });
        }

        /**
         * A column of solid tile, as the studio's open-bottom tile cube: a cap
         * wearing the top-down PNG, four walls wearing the side-view one, and
         * no bottom. This is the unit everything in the room is made of — wall
         * tiles and crates alike differ only in height and in which faces they
         * need.
         *
         * The cap sits at the column's full height, not on the floor. That is
         * what makes it a solid rather than a picture of one: from directly
         * above the cap covers its tile exactly as the dungeon draws it, and
         * as the camera swings the column is revealed to have been standing
         * there all along.
         *
         * `faces` names which walls to build. Neighbouring columns share a
         * face, and two coincident planes z-fight, so a shared face has to be
         * left off rather than drawn twice.
         */
        /**
         * A wall band standing on the edge of a tile.
         *
         * A wall is thin. `floor_wall.png` is a floor tile with a stroke along
         * one edge, and the studio anchors its wall planes to that stroke —
         * `WALL_FACE = -1.191` out of a half-width of 1.25 — not to the middle
         * of the tile. So the tile keeps its full floor plate and the wall is a
         * slab on its edge, a fraction of a tile thick.
         *
         * Thin is not the same as flat, though. The slab gets an outer face, an
         * inner face and a cap: three planes with air between them, so it reads
         * as masonry with a top you could stand on rather than as a sheet of
         * paper stood on its end.
         */
        function wallBand(sideSprite, capSprite, x, z, edge) {
            if (!sideSprite) return;
            const t = spec.wallThickness || 0.12;
            let outerX = x, outerZ = z, innerX = x, innerZ = z;
            let outerYaw, innerYaw, capSize;
            if (edge === 'back') {
                outerZ = z - 0.5; innerZ = outerZ + t;
                outerYaw = 180; innerYaw = 0; capSize = [1, t];
            } else if (edge === 'front') {
                outerZ = z + 0.5; innerZ = outerZ - t;
                outerYaw = 0; innerYaw = 180; capSize = [1, t];
            } else if (edge === 'left') {
                outerX = x - 0.5; innerX = outerX + t;
                outerYaw = -90; innerYaw = 90; capSize = [t, 1];
            } else {
                outerX = x + 0.5; innerX = outerX - t;
                outerYaw = 90; innerYaw = -90; capSize = [t, 1];
            }
            for (let level = 0; level < height; level++) {
                const y = level + 0.5;
                upright(sideSprite, outerX, y, outerZ, outerYaw);
                upright(sideSprite, innerX, y, innerZ, innerYaw);
            }
            planes.push({
                sprite: capSprite || sideSprite, reading: 'top',
                position: [(outerX + innerX) / 2, height, (outerZ + innerZ) / 2],
                rotation: [-90, 0, 0],
                size: capSize,
            });
        }

        function cubeColumn(topSprite, sideSprite, x, z, h, capYaw, faces) {
            flat(topSprite, x, z, h, capYaw || 0);
            if (!sideSprite) return;
            for (let level = 0; level < h; level++) {
                const y = level + 0.5;
                if (faces.front) upright(sideSprite, x, y, z + 0.5, 0);
                if (faces.back) upright(sideSprite, x, y, z - 0.5, 180);
                if (faces.left) upright(sideSprite, x - 0.5, y, z, -90);
                if (faces.right) upright(sideSprite, x + 0.5, y, z, 90);
            }
        }

        // ---- the room: a floor, and a ring of solid wall ------------------
        const lastC = width - 1;
        const lastR = depth - 1;
        const sideWall = spec.side && spec.side.wall;

        function onRing(c, r) {
            return c === 0 || r === 0 || c === lastC || r === lastR;
        }
        // The front run is deliberately left as a flat cap on the floor rather
        // than raised. Standing it up would put a wall between the side camera
        // and the room; leaving exactly one side open to see in is the studio's
        // own `openingDraft` idea, and the stage-set trick of the missing
        // fourth wall. Its cap is still laid with the rest of the ring, so from
        // above the dungeon's room is closed on all four sides.
        function standing(c, r) {
            return sideWall && onRing(c, r) && r !== lastR;
        }

        for (let c = 0; c < width; c++) {
            for (let r = 0; r < depth; r++) {
                if (!onRing(c, r)) {
                    flat(spec.top.floor, ox + c, oz + r, 0, 0);
                    continue;
                }
                const onCorner = (c === 0 || c === lastC) && (r === 0 || r === lastR);
                const sprite = onCorner ? spec.top.corner : spec.top.wall;
                // The ring's art faces into the room, the way the dungeon inks
                // a wall run.
                let yaw = 0;
                if (onCorner) yaw = c === 0 ? (r === 0 ? 0 : 90) : (r === 0 ? -90 : 180);
                else yaw = r === 0 ? 0 : (r === lastR ? 180 : (c === 0 ? 90 : -90));

                // Every ring tile keeps its full floor plate, standing or not —
                // that plate *is* the dungeon's reading of the room.
                flat(sprite, ox + c, oz + r, 0.01, yaw);
                if (!standing(c, r)) continue;

                // The walls are courses of an authored brick. The brick carries
                // its own faces and its own top, so it is the asset — not this
                // module — that decides how a wall reads from either angle.
                // That is the whole reason for authoring one, and it is why a
                // wall is a brick thick rather than a band on the tile edge.
                if (spec.wallBrick) {
                    // The brick faces *out* of the room, not in.
                    //
                    // A wall brick is authored leaning forward of its own
                    // origin — Floor wall base puts its floor plate at z = 1.6
                    // and its cube at 0 — and that lean is the point: the plate
                    // belongs to the room and the masonry belongs outside it.
                    // Turning the brick outward carries its body to the outer
                    // face of the ring and leaves the tile's own plate showing,
                    // which is what makes the room still read as a dungeon room
                    // from above. Turned inward, the brick sits on the plate
                    // and buries it.
                    //
                    // So the lean is honoured rather than measured away. An
                    // explicit `anchor` still overrides it.
                    const brickYaw = c === 0 ? -90 : (c === lastC ? 90 : 180);
                    const turn = brickYaw * Math.PI / 180;
                    const sin = Math.sin(turn);
                    const cos = Math.cos(turn);
                    const dx = brickCentre[0] * cos + brickCentre[1] * sin;
                    const dz = -brickCentre[0] * sin + brickCentre[1] * cos;
                    for (let level = 0; level < height; level++) {
                        instances.push(bridgeInstance(
                            spec.wallBrick.recipe, spec.wallBrick.refs,
                            [ox + c - dx, level, oz + r - dz], brickYaw));
                    }
                    continue;
                }

                // Fallback when no brick has been authored yet: a thin band on
                // each edge that faces out of the room. A corner gets two.
                if (r === 0) wallBand(sideWall, spec.side && spec.side.capping, ox + c, oz + r, 'back');
                if (c === 0) wallBand(sideWall, spec.side && spec.side.capping, ox + c, oz + r, 'left');
                if (c === lastC) wallBand(sideWall, spec.side && spec.side.capping, ox + c, oz + r, 'right');
            }
        }

        // ---- props: crates and the like ----------------------------------
        // Each is the studio's open-bottom tile cube. Seen from above only the
        // top face reads, and it is the dungeon's own top-down PNG, so the room
        // is furnished exactly as the dungeon would draw it. Seen from the side
        // the four walls read, and the crate is a platform to jump on.
        (spec.props || []).forEach(function (prop) {
            cubeColumn(prop.top, prop.side, ox + prop.c, oz + prop.r,
                prop.height || 1, prop.yaw || 0,
                { front: true, back: true, left: true, right: true });
        });

        // The ground course: what the floor *is*, read from the side.
        //
        // A plane has no thickness, so the floor collapses to a mathematical
        // line at exactly 90 degrees and the room ends up standing on nothing.
        // This course hangs below the floor plane along the room's near edge,
        // so the two meet along one line: from above it is edge-on and
        // invisible, from the front its top edge is the floor. One surface,
        // two readings — the trick the whole room is built on, applied to the
        // thing the pawn stands on.
        const frontZ = oz + depth - 0.5;
        if (spec.side && spec.side.ground) {
            for (let c = 0; c < width; c++) {
                upright(spec.side.ground, ox + c, -0.5, frontZ);
            }
        }

        return {
            frontZ: frontZ,
            backZ: oz - 0.5,
            planes: planes,
            instances: instances,
            bounds: { x: ox, z: oz, width: width, depth: depth, height: height },
        };
    }

    // --------------------------------------------------------------- the layer

    function hasWebGL() {
        if (!global.THREE || !global.document) return false;
        try {
            const probe = global.document.createElement('canvas');
            return !!(probe.getContext('webgl') || probe.getContext('experimental-webgl'));
        } catch (e) {
            return false;
        }
    }

    /**
     * The live 3D layer. It owns one renderer, one scene and one camera, and
     * nothing else: no animation loop, no input, no game state. The host game
     * already runs a requestAnimationFrame loop and calls `render` from it, so
     * there is exactly one clock driving the page and one place that can stop.
     *
     * `textureFor(sprite)` is supplied by the host and must return an image or
     * canvas already inked in the current theme. That is how the 3D room comes
     * out in the same pencil as the 2D one — it is literally the same bitmap
     * the 2D renderer blits, so the seam has no colour shift to hide.
     */
    function ScribbleBridge(options) {
        const opts = options || {};
        this.pitch = opts.pitch || PITCH;
        this.textureFor = opts.textureFor;
        this.canvas = opts.canvas;
        this.view = { w: 800, h: 600 };
        this.framing = null;
        this.pose = null;
        this.progress = 0;
        this.disposed = false;

        this.renderer = new global.THREE.WebGLRenderer({
            canvas: this.canvas,
            alpha: true,          // the 2D canvas keeps drawing the paper behind
            antialias: true,
            premultipliedAlpha: false,
        });
        this.renderer.setClearAlpha(0);

        this.scene = new global.THREE.Scene();
        this.roomRoot = new global.THREE.Group();
        this.roomRoot.name = 'scribble-bridge-room';
        this.scene.add(this.roomRoot);
        this.effectRoot = new global.THREE.Group();
        this.effectRoot.name = 'scribble-bridge-effects';
        this.scene.add(this.effectRoot);

        this.camera = new global.THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, ORBIT_RADIUS * 4);
        this.scene.add(this.camera);
        this.perspectiveCamera = new global.THREE.PerspectiveCamera(54, 1, 0.05, 5000);
        this.scene.add(this.perspectiveCamera);
        this.activeCamera = this.camera;

        this.textures = [];
        this.materials = [];
        this.geometries = [];
        this.magicBolt = null;
        this.doorBurst = null;
        this.wallBurst = null;
        this.labelRaycaster = new global.THREE.Raycaster();
    }

    ScribbleBridge.prototype.resize = function (view, dpr) {
        if (this.disposed) return;
        this.view = { w: view.w, h: view.h };
        this.renderer.setPixelRatio(Math.min(dpr || 1, 2));
        this.renderer.setSize(view.w, view.h, false);
    };

    /**
     * Builds the room. Every plane is a transparent PNG with nearest-neighbour
     * filtering, matching the studio: the art is pencil line work and any
     * smoothing reads as a smudge.
     */
    ScribbleBridge.prototype.setRoom = function (blueprint) {
        if (this.disposed) return;
        const THREE = global.THREE;
        const self = this;
        this.clearRoom();

        const cache = Object.create(null);

        /**
         * One material per source *and rect*. The rect is part of the key
         * because that is how a recipe gets many different strips out of one
         * PNG — the studio's battlement cuts five roof pieces from a single
         * arrow.png — and keying on the source alone would collapse them all
         * into whichever crop happened to be built first.
         */
        function materialFor(plane) {
            const key = (plane.source || plane.sprite) + '|' +
                (plane.rect ? plane.rect.join(',') : 'full') +
                (plane.repeat ? '|r' + plane.repeat.join(',') : '') +
                (plane.flipX ? '|fx' : '') + (plane.flipY ? '|fy' : '');
            if (key in cache) return cache[key];
            const image = self.textureFor
                ? self.textureFor(plane.source || plane.sprite, plane.rect) : null;
            if (!image) { cache[key] = null; return null; }
            const texture = new THREE.Texture(image);
            texture.magFilter = THREE.NearestFilter;
            texture.minFilter = THREE.NearestFilter;
            texture.generateMipmaps = false;
            const repeatX = plane.repeat ? plane.repeat[0] : 1;
            const repeatY = plane.repeat ? plane.repeat[1] : 1;
            if (plane.repeat || plane.flipX || plane.flipY) {
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.RepeatWrapping;
                texture.repeat.set(plane.flipX ? -repeatX : repeatX, plane.flipY ? -repeatY : repeatY);
                if (plane.flipX) texture.offset.x = 1;
                if (plane.flipY) texture.offset.y = 1;
            }
            texture.needsUpdate = true;
            const material = new THREE.MeshBasicMaterial({
                map: texture,
                transparent: true,
                alphaTest: 0.025,
                side: THREE.DoubleSide,
                depthWrite: true,
            });
            self.textures.push(texture);
            self.materials.push(material);
            cache[key] = material;
            return material;
        }

        function addPlane(parent, plane) {
            const material = materialFor(plane);
            if (!material) return;
            const geometry = new THREE.PlaneGeometry(plane.size[0], plane.size[1]);
            self.geometries.push(geometry);
            const mesh = new THREE.Mesh(geometry, material);
            mesh.name = plane.name || '';
            mesh.position.set(plane.position[0], plane.position[1], plane.position[2]);
            mesh.rotation.set(
                plane.rotation[0] * Math.PI / 180,
                plane.rotation[1] * Math.PI / 180,
                plane.rotation[2] * Math.PI / 180
            );
            // Which reading this plane belongs to, so the arc can favour one
            // over the other near the endpoints where the loser is edge-on and
            // would otherwise flicker as a one-pixel line.
            mesh.userData.reading = plane.reading;
            mesh.userData.bridgeGroup = plane.group || '';
            parent.add(mesh);
        }

        (blueprint.planes || []).forEach(function (plane) {
            addPlane(self.roomRoot, plane);
        });

        // A recipe instance is nested in its own group so its yaw composes with
        // the panels' own rotations properly. Turning a panel that is already
        // rotated about two axes is not componentwise addition on Euler angles,
        // and a group gets it right without the module doing quaternion maths.
        (blueprint.instances || []).forEach(function (instance) {
            const group = new THREE.Group();
            group.name = instance.name || 'recipe-instance';
            group.userData.bridgeGroup = instance.group || '';
            group.position.set(instance.position[0], instance.position[1], instance.position[2]);
            group.rotation.y = (instance.yaw || 0) * Math.PI / 180;
            instance.planes.forEach(function (plane) { addPlane(group, plane); });
            self.roomRoot.add(group);
        });
    };

    ScribbleBridge.prototype.setFraming = function (framing) {
        this.framing = framing;
        this.pose = null;
    };

    ScribbleBridge.prototype.setProgress = function (progress) {
        this.progress = clamp01(progress);
        this.pose = null;
    };

    ScribbleBridge.prototype.setPose = function (pose) {
        this.pose = pose || null;
    };

    ScribbleBridge.prototype.setGroupVisibility = function (groupName, visible) {
        if (this.disposed) return;
        this.roomRoot.traverse(function (object) {
            if (object.userData && object.userData.bridgeGroup === groupName) {
                object.visible = !!visible;
            }
        });
    };

    // Preview adapters can soften a group reveal without changing shared
    // source materials. A mesh gets its own material only on first use, so a
    // fading wall never changes another group that happens to share its sprite.
    ScribbleBridge.prototype.setGroupOpacity = function (groupName, opacity) {
        if (this.disposed) return;
        const value = clamp01(opacity);
        const bridge = this;
        this.roomRoot.traverse(function (object) {
            if (!object.isMesh || !object.userData || object.userData.bridgeGroup !== groupName || !object.material) return;
            if (!object.userData.bridgeGroupMaterial) {
                object.material = object.material.clone();
                object.userData.bridgeGroupMaterial = object.material;
                bridge.materials.push(object.material);
            }
            object.material.opacity = value;
            object.material.depthWrite = value > .995;
        });
    };

    ScribbleBridge.prototype.setObjectState = function (name, state) {
        if (this.disposed || !name) return;
        const object = this.roomRoot.getObjectByName(name);
        if (!object) return;
        const value = state || {};
        object.visible = value.visible !== false;
        if (value.position) {
            object.position.set(value.position[0], value.position[1], value.position[2]);
        }
    };

    ScribbleBridge.prototype.ensureMagicBolt = function () {
        if (this.magicBolt || this.disposed) return;
        const THREE = global.THREE;
        const root = new THREE.Group();
        root.name = 'scribble-magic-bolt';

        function trackedGeometry(owner, geometry) {
            owner.geometries.push(geometry);
            return geometry;
        }
        function trackedMaterial(owner, material) {
            owner.materials.push(material);
            return material;
        }

        const coreMaterial = trackedMaterial(this, new THREE.MeshBasicMaterial({color: 0xe8ae18}));
        const core = new THREE.Mesh(
            trackedGeometry(this, new THREE.OctahedronGeometry(0.16, 0)), coreMaterial);
        root.add(core);

        const glowMaterial = trackedMaterial(this, new THREE.MeshBasicMaterial({
            color: 0x65d5df, transparent: true, opacity: 0.13,
            blending: THREE.AdditiveBlending, depthWrite: false,
        }));
        const glow = new THREE.Mesh(
            trackedGeometry(this, new THREE.SphereGeometry(0.29, 12, 8)), glowMaterial);
        root.add(glow);

        const ringMaterial = trackedMaterial(this, new THREE.MeshBasicMaterial({
            color: 0x1594a6, transparent: true, opacity: 0.92,
            blending: THREE.AdditiveBlending, depthWrite: false,
        }));
        const ringGeometry = trackedGeometry(this, new THREE.TorusGeometry(0.24, 0.025, 6, 20));
        const ringA = new THREE.Mesh(ringGeometry, ringMaterial);
        const ringB = new THREE.Mesh(ringGeometry, ringMaterial);
        ringB.scale.setScalar(0.72);
        ringB.position.z = 0.07;
        root.add(ringA, ringB);

        const trailMaterial = trackedMaterial(this, new THREE.MeshBasicMaterial({
            color: 0x43bfcd, transparent: true, opacity: 0.78,
            blending: THREE.AdditiveBlending, depthWrite: false,
        }));
        const trailGeometry = trackedGeometry(this, new THREE.OctahedronGeometry(0.075, 0));
        const trail = [];
        for (let i = 0; i < 5; i++) {
            const shard = new THREE.Mesh(trailGeometry, trailMaterial);
            shard.position.set((i % 2 ? 1 : -1) * 0.045, 0, 0.30 + i * 0.18);
            shard.scale.setScalar(1 - i * 0.12);
            trail.push(shard);
            root.add(shard);
        }

        const impactMaterial = trackedMaterial(this, new THREE.MeshBasicMaterial({
            color: 0xd89a00, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
        }));
        const impactRing = new THREE.Mesh(
            trackedGeometry(this, new THREE.TorusGeometry(0.34, 0.035, 6, 24)), impactMaterial);
        impactRing.position.z = -0.04;
        root.add(impactRing);

        const shatterMaterial = trackedMaterial(this, new THREE.MeshBasicMaterial({
            color: 0xe8ae18, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
        }));
        const shatterGeometry = trackedGeometry(this, new THREE.OctahedronGeometry(0.065, 0));
        const impactShards = [];
        for (let i = 0; i < 9; i++) {
            const shard = new THREE.Mesh(shatterGeometry, shatterMaterial);
            shard.userData.angle = i / 9 * Math.PI * 2 + (i % 2) * 0.18;
            shard.visible = false;
            impactShards.push(shard);
            root.add(shard);
        }

        root.visible = false;
        this.effectRoot.add(root);
        this.magicBolt = {
            root: root, core: core, coreMaterial: coreMaterial,
            glow: glow, glowMaterial: glowMaterial,
            ringA: ringA, ringB: ringB, ringMaterial: ringMaterial,
            trail: trail, trailMaterial: trailMaterial,
            impactRing: impactRing, impactMaterial: impactMaterial,
            impactShards: impactShards, shatterMaterial: shatterMaterial,
        };
    };

    ScribbleBridge.prototype.setMagicBolt = function (state) {
        if (this.disposed) return;
        this.ensureMagicBolt();
        const bolt = this.magicBolt;
        if (!bolt) return;
        const value = state || {};
        bolt.root.visible = value.visible !== false;
        if (!bolt.root.visible) return;

        const position = value.position || [0, 0, 0];
        const direction = value.direction || [0, 0, -1];
        bolt.root.position.set(position[0], position[1], position[2]);
        const from = new global.THREE.Vector3(0, 0, -1);
        const to = new global.THREE.Vector3(direction[0], direction[1], direction[2]);
        if (to.lengthSq() < 0.000001) to.set(0, 0, -1);
        to.normalize();
        bolt.root.quaternion.setFromUnitVectors(from, to);

        const spin = value.spin || 0;
        bolt.ringA.rotation.z = spin;
        bolt.ringB.rotation.z = -spin * 1.35;
        const impact = clamp01(value.impact || 0);
        bolt.core.scale.setScalar(Math.max(0.001, 1 - impact));
        bolt.glow.scale.setScalar(1 + impact * 1.8);
        bolt.glowMaterial.opacity = 0.13 * (1 - impact);
        bolt.ringMaterial.opacity = 0.92 * (1 - impact);
        bolt.trailMaterial.opacity = 0.78 * (1 - impact);
        bolt.impactRing.visible = impact > 0;
        bolt.impactRing.scale.setScalar(0.6 + impact * 3.2);
        bolt.impactMaterial.opacity = (1 - impact) * 0.9;
        bolt.shatterMaterial.opacity = Math.sin(impact * Math.PI) * 0.95;
        bolt.impactShards.forEach(function (shard, index) {
            const angle = shard.userData.angle;
            const distance = impact * (0.45 + (index % 3) * 0.2);
            shard.visible = impact > 0 && impact < 1;
            shard.position.set(Math.cos(angle) * distance,
                Math.sin(angle) * distance, -0.04 - impact * 0.18);
            shard.rotation.set(impact * (index + 1), impact * (index + 2), angle);
            shard.scale.setScalar(1.25 - impact * 0.45);
        });
    };

    ScribbleBridge.prototype.ensureDoorBurst = function () {
        if (this.doorBurst || this.disposed) return;
        const THREE = global.THREE;
        const root = new THREE.Group();
        root.name = 'scribble-door-burst';

        const paperMaterial = new THREE.MeshBasicMaterial({
            color: 0xf7f5ee, transparent: true, opacity: 1,
        });
        const goldMaterial = new THREE.MeshBasicMaterial({
            color: 0xe8ae18, transparent: true, opacity: 1,
        });
        const edgeMaterial = new THREE.LineBasicMaterial({
            color: 0x23334f, transparent: true, opacity: 1,
        });
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0x43bfcd, transparent: true, opacity: 0.9,
            blending: THREE.AdditiveBlending, depthWrite: false,
        });
        this.materials.push(paperMaterial, goldMaterial, edgeMaterial, ringMaterial);

        const fragments = [];
        for (let i = 0; i < 12; i++) {
            const col = i % 4;
            const row = Math.floor(i / 4);
            const width = 0.26 + (i % 3) * 0.035;
            const depth = 0.25 + ((i + 1) % 3) * 0.025;
            const geometry = new THREE.BoxGeometry(width, 0.07, depth);
            const edgesGeometry = new THREE.EdgesGeometry(geometry);
            this.geometries.push(geometry, edgesGeometry);
            const fragment = new THREE.Group();
            fragment.add(new THREE.Mesh(geometry, i % 4 === 0 ? goldMaterial : paperMaterial));
            fragment.add(new THREE.LineSegments(edgesGeometry, edgeMaterial));
            const origin = [(col - 1.5) * 0.31, 0, (row - 1) * 0.31];
            const angle = i / 12 * Math.PI * 2 + 0.22;
            fragments.push({
                root: fragment,
                origin: origin,
                velocity: [Math.cos(angle) * (1.1 + (i % 3) * 0.18),
                    0.75 + (i % 4) * 0.14,
                    Math.sin(angle) * (1.1 + ((i + 1) % 3) * 0.18)],
                spin: [1.3 + (i % 3) * 0.45, 1.8 + (i % 4) * 0.35, 1.1 + (i % 5) * 0.3],
            });
            root.add(fragment);
        }

        const ringGeometry = new THREE.TorusGeometry(0.42, 0.035, 6, 28);
        this.geometries.push(ringGeometry);
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.08;
        root.add(ring);

        root.visible = false;
        this.effectRoot.add(root);
        this.doorBurst = {
            root: root,
            fragments: fragments,
            paperMaterial: paperMaterial,
            goldMaterial: goldMaterial,
            edgeMaterial: edgeMaterial,
            ring: ring,
            ringMaterial: ringMaterial,
        };
    };

    ScribbleBridge.prototype.setDoorBurst = function (state) {
        if (this.disposed) return;
        this.ensureDoorBurst();
        const burst = this.doorBurst;
        if (!burst) return;
        const value = state || {};
        burst.root.visible = !!value.visible;
        if (!burst.root.visible) return;

        const position = value.position || [0, 0, 0];
        const amount = clamp01(value.amount || 0);
        const opacity = clamp01(value.opacity == null ? 1 : value.opacity);
        burst.root.position.set(position[0], position[1] + 0.02, position[2]);
        burst.paperMaterial.opacity = opacity;
        burst.goldMaterial.opacity = opacity;
        burst.edgeMaterial.opacity = opacity;
        burst.fragments.forEach(function (fragment) {
            const rise = fragment.velocity[1] * amount - 0.42 * amount * amount;
            fragment.root.position.set(
                fragment.origin[0] + fragment.velocity[0] * amount,
                fragment.origin[1] + rise,
                fragment.origin[2] + fragment.velocity[2] * amount);
            fragment.root.rotation.set(
                fragment.spin[0] * amount,
                fragment.spin[1] * amount,
                fragment.spin[2] * amount);
        });
        burst.ring.scale.setScalar(0.45 + amount * 3.2);
        burst.ringMaterial.opacity = opacity * (1 - amount * 0.55) * 0.9;
    };

    ScribbleBridge.prototype.ensureWallBurst = function () {
        if (this.wallBurst || this.disposed) return;
        const THREE = global.THREE;
        const root = new THREE.Group();
        root.name = 'scribble-wall-burst';

        const brickMaterial = new THREE.MeshBasicMaterial({
            color: 0xf7f5ee, transparent: true, opacity: 1,
        });
        const goldMaterial = new THREE.MeshBasicMaterial({
            color: 0xe8ae18, transparent: true, opacity: 1,
        });
        const edgeMaterial = new THREE.LineBasicMaterial({
            color: 0x23334f, transparent: true, opacity: 1,
        });
        const cyanMaterial = new THREE.MeshBasicMaterial({
            color: 0x43bfcd, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
        });
        const flareMaterial = new THREE.MeshBasicMaterial({
            color: 0xf6c933, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false,
        });
        this.materials.push(brickMaterial, goldMaterial, edgeMaterial, cyanMaterial, flareMaterial);

        const fragments = [];
        for (let i = 0; i < 20; i++) {
            const col = i % 5;
            const row = Math.floor(i / 5);
            const width = 0.22 + (i % 4) * 0.055;
            const height = 0.18 + ((i + 2) % 3) * 0.055;
            const depth = 0.12 + (i % 3) * 0.045;
            const geometry = new THREE.BoxGeometry(width, height, depth);
            const edgesGeometry = new THREE.EdgesGeometry(geometry);
            this.geometries.push(geometry, edgesGeometry);
            const fragment = new THREE.Group();
            fragment.add(new THREE.Mesh(geometry, i % 6 === 0 ? goldMaterial : brickMaterial));
            fragment.add(new THREE.LineSegments(edgesGeometry, edgeMaterial));
            const origin = [(col - 2) * 0.28, (row - 1.5) * 0.25, 0];
            const angle = Math.atan2(origin[1], origin[0]) + (i % 2 ? 0.16 : -0.12);
            fragments.push({
                root: fragment,
                origin: origin,
                velocity: [Math.cos(angle) * (1.3 + (i % 4) * 0.28),
                    Math.sin(angle) * (1.2 + ((i + 1) % 4) * 0.25) + 0.7,
                    0.8 + (i % 5) * 0.22],
                spin: [1.8 + (i % 3) * 0.7, 2.1 + (i % 5) * 0.5, 1.4 + (i % 4) * 0.65],
            });
            root.add(fragment);
        }

        const ringGeometry = new THREE.TorusGeometry(0.38, 0.04, 6, 32);
        const ringA = new THREE.Mesh(ringGeometry, cyanMaterial);
        const ringB = new THREE.Mesh(ringGeometry, cyanMaterial);
        ringB.scale.setScalar(0.65);
        ringB.position.z = 0.035;
        this.geometries.push(ringGeometry);
        root.add(ringA, ringB);

        const flareGeometry = new THREE.SphereGeometry(0.34, 12, 8);
        this.geometries.push(flareGeometry);
        const flare = new THREE.Mesh(flareGeometry, flareMaterial);
        flare.position.z = 0.08;
        root.add(flare);

        root.visible = false;
        this.effectRoot.add(root);
        this.wallBurst = {
            root: root,
            fragments: fragments,
            brickMaterial: brickMaterial,
            goldMaterial: goldMaterial,
            edgeMaterial: edgeMaterial,
            cyanMaterial: cyanMaterial,
            flare: flare,
            flareMaterial: flareMaterial,
            ringA: ringA,
            ringB: ringB,
        };
    };

    ScribbleBridge.prototype.setWallBurst = function (state) {
        if (this.disposed) return;
        this.ensureWallBurst();
        const burst = this.wallBurst;
        if (!burst) return;
        const value = state || {};
        burst.root.visible = !!value.visible;
        if (!burst.root.visible) return;

        const position = value.position || [0, 0, 0];
        const direction = value.direction || [0, 0, -1];
        const amount = clamp01(value.amount || 0);
        const opacity = clamp01(value.opacity == null ? 1 : value.opacity);
        burst.root.position.set(position[0], position[1], position[2]);
        const from = new global.THREE.Vector3(0, 0, -1);
        const to = new global.THREE.Vector3(direction[0], direction[1], direction[2]);
        if (to.lengthSq() < 0.000001) to.set(0, 0, -1);
        burst.root.quaternion.setFromUnitVectors(from, to.normalize());
        burst.brickMaterial.opacity = opacity;
        burst.goldMaterial.opacity = opacity;
        burst.edgeMaterial.opacity = opacity;
        burst.fragments.forEach(function (fragment) {
            fragment.root.position.set(
                fragment.origin[0] + fragment.velocity[0] * amount,
                fragment.origin[1] + fragment.velocity[1] * amount - 0.72 * amount * amount,
                fragment.origin[2] + fragment.velocity[2] * amount);
            fragment.root.rotation.set(fragment.spin[0] * amount,
                fragment.spin[1] * amount, fragment.spin[2] * amount);
        });
        burst.ringA.scale.setScalar(0.55 + amount * 4.8);
        burst.ringB.scale.setScalar(0.35 + amount * 3.5);
        burst.ringA.rotation.z = amount * 1.6;
        burst.ringB.rotation.z = -amount * 2.1;
        burst.cyanMaterial.opacity = opacity * (1 - amount * 0.45) * 0.95;
        burst.flare.scale.setScalar(0.7 + amount * 4.5);
        burst.flareMaterial.opacity = opacity * (1 - amount) * 0.72;
    };

    /**
     * Projects a 3D point to a screen position in CSS pixels, using the same
     * convention as the games' own `worldToScreen`. Overlay buttons and labels
     * are placed through this, so they track the arc without knowing about it.
     */
    ScribbleBridge.prototype.project = function (point) {
        const THREE = global.THREE;
        const v = new THREE.Vector3(point[0], point[1], point[2]).project(this.activeCamera || this.camera);
        return {
            x: (v.x + 1) / 2 * this.view.w,
            y: (1 - v.y) / 2 * this.view.h,
            visible: v.z >= -1 && v.z <= 1,
        };
    };

    ScribbleBridge.prototype.isPointVisible = function (point, clearance) {
        if (this.disposed || !this.activeCamera) return false;
        const THREE = global.THREE;
        const target = new THREE.Vector3(point[0], point[1], point[2]);
        const origin = this.activeCamera.position;
        const direction = target.clone().sub(origin);
        const distance = direction.length();
        if (!distance) return true;
        direction.multiplyScalar(1 / distance);
        this.labelRaycaster.set(origin, direction);
        this.labelRaycaster.near = 0.05;
        this.labelRaycaster.far = Math.max(0.05, distance - (clearance == null ? 0.3 : clearance));
        const hits = this.labelRaycaster.intersectObject(this.roomRoot, true);
        return !hits.some(function (hit) {
            let object = hit.object;
            while (object) {
                if (!object.visible) return false;
                object = object.parent;
            }
            return true;
        });
    };

    ScribbleBridge.prototype.render = function () {
        if (this.disposed || (!this.framing && !this.pose)) return;
        const pose = this.pose || bridgePose(this.framing, this.progress);
        let camera = this.camera;
        if (pose.perspective) {
            camera = this.perspectiveCamera;
            camera.aspect = this.view.w / Math.max(1, this.view.h);
            camera.fov = pose.fov || 54;
        } else {
            const frustum = bridgeFrustum(this.view, pose.unit / this.pitch, this.pitch);
            camera.left = frustum.left;
            camera.right = frustum.right;
            camera.top = frustum.top;
            camera.bottom = frustum.bottom;
        }
        camera.position.set(pose.position[0], pose.position[1], pose.position[2]);
        camera.up.set(pose.up[0], pose.up[1], pose.up[2]);
        camera.lookAt(pose.target[0], pose.target[1], pose.target[2]);
        camera.updateProjectionMatrix();
        this.activeCamera = camera;

        this.renderer.render(this.scene, camera);
    };

    ScribbleBridge.prototype.clearRoom = function () {
        while (this.roomRoot.children.length) this.roomRoot.remove(this.roomRoot.children[0]);
        while (this.effectRoot.children.length) this.effectRoot.remove(this.effectRoot.children[0]);
        this.geometries.forEach(function (g) { g.dispose(); });
        this.materials.forEach(function (m) { m.dispose(); });
        this.textures.forEach(function (t) { t.dispose(); });
        this.geometries = [];
        this.materials = [];
        this.textures = [];
        this.magicBolt = null;
        this.doorBurst = null;
        this.wallBurst = null;
    };

    /**
     * Gives the GPU back. The host component calls this from beforeDestroy;
     * the WebGL context is released explicitly because a Vue route change can
     * mount several of these over a session and browsers cap live contexts.
     */
    ScribbleBridge.prototype.dispose = function () {
        if (this.disposed) return;
        this.disposed = true;
        this.clearRoom();
        try {
            this.renderer.dispose();
            const ctx = this.renderer.getContext && this.renderer.getContext();
            const lose = ctx && ctx.getExtension && ctx.getExtension('WEBGL_lose_context');
            if (lose) lose.loseContext();
        } catch (e) { /* the context may already be gone */ }
        this.renderer = null;
        this.scene = null;
        this.camera = null;
        this.perspectiveCamera = null;
        this.activeCamera = null;
        this.labelRaycaster = null;
    };

    function createScribbleBridge(options) {
        if (!hasWebGL()) return null;
        return new ScribbleBridge(options);
    }

    global.SCRIBBLE_BRIDGE_CONFIG = {
        pitch: PITCH,
        orbitRadius: ORBIT_RADIUS,
    };
    global.scribbleBridgeFrustum = bridgeFrustum;
    global.scribbleBridgePose = bridgePose;
    global.scribbleBridgeFraming = bridgeFraming;
    global.scribbleBridgeTopTarget = topTarget;
    global.scribbleBridgeSideTarget = sideTarget;
    global.scribbleBridgeStage = bridgeStage;
    global.scribbleMagicDoorTransitionState = magicDoorTransitionState;
    global.scribbleMagicDoorTransitionStage = magicDoorTransitionStage;
    global.scribbleBridgeRecipePlanes = bridgeRecipePlanes;
    global.scribbleBridgeRecipeCentre = bridgeRecipeCentre;
    global.scribbleBridgeInstance = bridgeInstance;
    global.SCRIBBLE_BRIDGE_STUDIO_TILE = STUDIO_TILE;
    global.scribbleBridgeHasWebGL = hasWebGL;
    global.createScribbleBridge = createScribbleBridge;
})(typeof globalThis !== 'undefined' ? globalThis : window);
