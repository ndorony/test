# Game style guide

This guide defines the visual quality bar for learning games. It describes
outcomes, not a required rendering technology. Pair it with
[GAME_TECH_GUIDE.md](GAME_TECH_GUIDE.md).

## Core identity

A game should feel like a small, authored world whose learning interaction has a
reason to exist inside it. The first frame must communicate place, goal, and
primary action without reading instructions. Correct answers change the world;
incorrect answers invite another attempt without punishment or visual shame.

“Professional commercial game” means consistent art direction, controlled
attention, responsive motion, meaningful feedback, and polish between actions.
It does not mean maximal detail, constant effects, realistic physics, or a large
asset budget.

## Composition and attention

- Build each view around one focal action. The question, target, or immediate
  obstacle owns the strongest local contrast and clearest silhouette.
- Reserve quiet visual space behind text and answers. Decorations may frame the
  interaction but must not cross its reading path.
- Use foreground framing to create a scene edge, midground for interaction, and
  background for place. At least two depth cues should remain visible even on a
  narrow screen.
- Compose portrait and landscape intentionally. Do not merely shrink the desktop
  arrangement; reflow controls and crop scenery while preserving the focal point.
- Keep persistent HUD information compact and subordinate. Progress should be
  legible at a glance, not compete with the current question.

## Shape language, silhouettes, and depth

- Choose a small family of shape rules per game: rounded/friendly, angular/
  mechanical, organic/magical, or another coherent mix. Apply it to scenery,
  controls, feedback, and transitions.
- Important actors, targets, and obstacles must be recognizable as flat
  silhouettes at gameplay size. Detail supports the silhouette; it cannot rescue
  an unclear one.
- Separate layers with scale, overlap, value, edge sharpness, and motion speed.
  Avoid outlining everything equally.
- Use soft contact shadows to attach objects, broader shadows for depth, and
  highlights to describe material. One consistent light direction is preferable
  to decorative gradients on every surface.
- Textures should be subtle, repeatable, and tied to material. They must survive
  resizing without noise and never reduce text contrast.

## Color hierarchy and themes

- Derive the palette from the selected global theme. Use primary/secondary for
  world identity, accent for the current action or reward, background for scene
  family, and text/disabled colors for their semantic roles.
- A theme adaptation changes motifs, materials, particles, and lighting as well
  as colors, while preserving identical gameplay and information hierarchy.
- Centralize game-specific theme motifs. A new theme should require one adapter
  entry, not edits throughout templates and behavior.
- Correct and incorrect feedback must remain distinguishable without color:
  combine palette with icon, shape, movement, and text/audio where available.
- Validate contrast in every current `themeOptions` entry. Never assume a fixed
  number of themes or that a palette is light.

## Typography and readability

- Prefer the repository’s existing type stack. Use size, weight, spacing, and
  controlled containers before introducing decorative type.
- Questions need a stable reading surface over animated scenery: a themed world
  object, scrim, plate, sign, speech device, or calm pocket—not a generic white
  modal floating above the game.
- Answers must remain readable in default, hover, focus, selected, correct,
  incorrect, and disabled states. Do not move text when state styling changes.
- Allow wrapping and variable height for long content. Preserve generous line
  height and avoid ellipsis for information needed to answer.
- Set direction from content/locale. Hebrew composition and order should read
  naturally RTL; English naturally LTR; numbers and mixed strings must be tested.

## Interaction design

- Interactive objects must look actionable before hover. Touch has no hover.
- Use semantic controls, generous touch targets, visible focus, and a predictable
  keyboard order. Hover can enrich a control but cannot reveal required meaning.
- Press feedback should begin immediately; learning feedback begins only after
  the engine accepts the attempt. Lock the transaction while its outcome plays.
- Keep controls spatially stable across retries. A child should not accidentally
  select a different answer because options moved under a finger or cursor.
- Make escape/skip/back affordances clear when allowed, but visually subordinate
  to the learning action.

## Motion and transitions

- Motion has one of four jobs: reveal cause and effect, guide attention, convey
  character/material, or bridge a state change. Remove motion with no job.
- Favor anticipation, a decisive action, and a short settle. Use faster responses
  for input, moderate transitions between beats, and slow low-amplitude ambience.
- Preserve continuity: an object should enter from where it came from and leave
  toward where the next beat occurs. Avoid unrelated full-screen fades between
  every state.
- Interruptions are first-class. Navigation, resize, repeated input, and reduced
  motion must leave a coherent frame rather than a half-transitioned scene.
- Reduced motion removes travel, parallax, shake, large scaling, and repeated
  particle movement. Replace them with short fades, immediate state changes, and
  static completion cues; never remove information or delay completion.

## Camera

- Use a camera only when spatial continuity materially improves the fantasy.
  Otherwise transition the composition directly.
- Keep a stable horizon/reference layer and predictable movement axis. Limit
  vertical drift, rotation, zoom, and acceleration—especially on mobile.
- Anticipate the destination slightly so the player sees what the scene is moving
  toward. Settle fully before presenting precise answer controls.
- Camera framing must reserve safe space for the question interface and system
  chrome. Recompute framing on resize rather than stretching coordinates.
- Never attach high-frequency shake to the whole UI. Apply brief, low-amplitude
  reaction to the affected world object, with a reduced-motion alternative.

## Ambient life and particles

- A scene should feel alive while waiting: choose a few low-cost ambient loops
  across depth layers, such as drifting light, a character glance, foliage sway,
  machinery idle, or distant traffic.
- Vary duration, phase, and pause so loops do not pulse in unison. Keep amplitude
  low near reading areas and pause ambience when off-screen.
- Particles emphasize a source and event. Give them a clear origin, direction,
  lifetime, scale range, and cap. Remove them after use.
- Correct feedback may briefly increase brightness, upward motion, restoration,
  or celebration. Incorrect feedback should be shorter and contained: resistance,
  a soft wobble, or a clear retry cue—not destruction or screen-wide alarm.

## Feedback and progression

- Feedback follows causality: answer accepted → target reacts → world changes →
  progress advances → next goal appears. Do not let score text be the only reward.
- Permanent restoration or collection should remain visible when a scene is
  reconstructed. It communicates that learning changed the world.
- Progress indicators should match the fantasy where possible while remaining
  accurate to engine state. Never invent a second progression system.
- The ending should resolve the opening problem, revisit the strongest visual
  changes economically, celebrate, and provide a clear route onward.

## Quality bar and anti-patterns

Before calling a game polished, inspect it paused at the opening, question,
incorrect, correct, transition, and ending frames. Each should have deliberate
composition and no accidental overlap, dead space, or browser-default styling.

Avoid:

- a standard white quiz card laid over unrelated scenery;
- one enormous DOM/SVG scene rendered whether visible or not;
- decoration with equal contrast everywhere;
- animation driven by layout properties when transforms would work;
- continuous camera motion while reading or choosing;
- particles covering answers or replacing clear feedback;
- desktop-only composition scaled down to unreadable mobile UI;
- theme support that is only a background-color swap;
- success that is extravagant while the core interaction remains visually flat.
