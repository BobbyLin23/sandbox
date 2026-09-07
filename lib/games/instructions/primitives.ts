import type { SystemModelMessage } from "ai"

export const primitivesInstructions: SystemModelMessage[] = [
  {
    role: "system",
    content: `# Runtime primitives

The game directory comes pre-seeded with a small three.js game-engine toolkit.
Because the preview serves only index.html, these files are a SOURCE LIBRARY:
use \`read_file\` on them and copy (or adapt) the code you need into your
self-contained index.html script. Never import them with relative paths —
they will 404 in the preview.

## The importmap

The primitives import three.js from the bare specifier \`"three"\`. Any
index.html that uses three.js (inlined primitives or your own 3D code) must
include this importmap in \`<head>\`:

\`\`\`html
<script type="importmap">
  {
    "imports": {
      "three": "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js"
    }
  }
</script>
\`\`\`

When you inline primitive code, either keep the bare \`"three"\` imports (the
importmap above resolves them) or swap them for \`import * as THREE from
"three"\` once and reference THREE below. Only ONE import of three per script.

## What each file provides

- \`engine/index.js\` — \`createEngine({ container, background, fov, shadows,
  camera })\` sets up the WebGLRenderer, Scene, PerspectiveCamera, lights
  (ambient + directional sun), resize handling, and the render loop. Returns
  \`{ renderer, scene, camera, ambient, sun, start, stop, onFrame, pick,
  dispose }\`. \`onFrame((delta, elapsed) => {})\` registers a per-frame hook
  and returns a canceller; \`pick(clientX, clientY, objects?)\` raycasts from
  pointer coordinates.
- \`controls/index.js\` — \`createKeyboard()\` (\`isDown\`, \`wasPressed\`,
  \`endFrame\`), \`createPointer(target)\` (\`x\`, \`y\`, \`isDown\`,
  \`clicked\`, \`wheel\`, \`endFrame\`), and \`createInput()\` combining both.
- \`animations/index.js\` — \`ease\` (linear/quad/cubic/back/elastic/bounce),
  \`createTweens()\` (\`add({ from, to, duration, ease, onUpdate, onComplete,
  loop, yoyo })\` + \`update(dt)\`), and motion helpers that take the engine
  first: \`spin(engine, obj, { x, y, z })\`, \`bob\`, \`orbit\`, \`pulse\`,
  \`follow\`. All return a cancel function.
- \`models/index.js\` — \`palette\` (brand orange \`#EA580C\` and friends),
  \`createBox\`, \`createSphere\`, \`createCylinder\`, \`createCone\`,
  \`createTorus\`, \`createGround\`, \`createGrid\`, \`createStarfield\`,
  \`createLabel(text)\` (canvas-texture sprite for in-world text).
- \`sound/index.js\` — \`createSound()\` gives \`beep\`, \`tone\`, \`chord\`,
  \`melody\`, \`noise\`, \`explode\`, \`collect\`, \`setVolume\`,
  \`toggleMute\`. Synthesized with WebAudio — no audio files needed. The
  AudioContext is created lazily on first use, so sounds respect browser
  autoplay policies.
- \`hub/index.js\` — \`createHub()\` builds a DOM HUD overlay: \`setScore\`,
  \`addScore\`, \`hideScore\`, \`message(text, seconds)\`, \`showBanner({
  title, subtitle, button, onClick })\`, \`hideBanner\`.
- \`index.js\` — barrel re-exporting everything above; read it for a quick
  overview of the public API.

The default placeholder index.html already demonstrates the full inline
pattern: importmap, engine setup, a rotating white cube on the brand-orange
background, a starfield, pointer click feedback with a WebAudio chord.

## Choosing an approach

- 2D or DOM-heavy games (puzzles, cards, text): skip three.js entirely and
  write a self-contained index.html with canvas or DOM.
- 3D games: read the relevant primitive files, inline the parts you need
  (engine setup, input, tweens, sound, hub), then write your game logic on
  top. Trim what you do not use to keep the page fast.
- Reimplementing small pieces yourself is fine — the primitives are a
  starting point, not a framework. Keep everything in index.html.`,
  },
]
