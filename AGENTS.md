# 1day1app Agent Instructions

## Daily App Preflight

Before creating, editing, testing, committing, or publishing a daily app, confirm the canonical repository:

```sh
git -C /Users/matsumurahironori/1day1app rev-parse --show-toplevel
git -C /Users/matsumurahironori/1day1app remote get-url origin
```

Proceed only when the path is `/Users/matsumurahironori/1day1app` and the remote is `git@github.com:matsumulion-byte/1day1app.git`.

Create daily apps under:

```text
/Users/matsumurahironori/1day1app/public/apps/YYYY-MM-DD/
```

Do not implement daily apps under `/Users/matsumurahironori/Documents/1day1app`.

## Mobile Interaction Baseline

Every touch-oriented daily app must prevent accidental browser gestures before it is shown or shipped.

Required baseline:

- For directional movement controls, use a real D-pad layout by default: up above, left/down/right on the row below. Do not ship a flat horizontal row of arrow buttons for movement.
- Make touch controls large, fixed-size, and positioned so every required button is visible in the initial mobile viewport.
- Set a mobile viewport that disables unintended user scaling where appropriate.
- Set `touch-action` explicitly for the page, controls, and interactive canvas/game area.
- Prevent double-tap zoom on repeated taps.
- Prevent long-press selection, callout/context menus, dragging, and tap highlight on game controls.
- Prevent the game canvas from scrolling or zooming during play.
- Test at a mobile viewport before reporting completion, including holding a control and double-tapping a control.

For plain HTML apps, include the equivalent of:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
```

```css
body {
  touch-action: manipulation;
  overscroll-behavior: none;
  -webkit-text-size-adjust: 100%;
  -webkit-user-select: none;
  user-select: none;
}

button {
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

canvas,
.game,
.play-area {
  touch-action: none;
}
```

```js
document.addEventListener("dblclick", (event) => event.preventDefault(), { passive: false });
document.addEventListener("gesturestart", (event) => event.preventDefault(), { passive: false });
```

If a daily app uses cache-busted runtime files such as `game-vN.js`, keep the required `script.js` and the referenced runtime file synchronized.

## Completion Checks

Before saying a daily app is done, run:

```sh
npm run check:app -- YYYY-MM-DD
npm run build
```

Also verify the app in a browser at mobile size. For games, confirm the core interaction is playable and does not trigger page zoom, text selection, or scroll.

Stage only the intended app files. Do not stage unrelated files such as `.vscode/`.

## Correction Handling

When the user points out a repeated mistake or says the same correction has already been made before, do not only apologize.

Required response:

- Identify the actual recurring failure pattern, not only the latest surface example.
- Record a concrete recurrence-prevention rule in the appropriate durable instruction file before claiming the issue is fixed.
- Use the canonical repository instructions in this file for daily app work; do not record prevention rules in `/Users/matsumurahironori/Documents/1day1app` as a substitute.
- State exactly where the prevention rule was recorded.
- If the correction is about daily app idea quality, include the specific prohibited pattern and the replacement standard.

For daily app date ideas, the prohibited pattern is shallow date-digit matching such as `7/6 -> 76 seconds`. Use real anniversaries, seasonal context, user-relevant situations, or genuinely useful daily workflows instead. If the date hook is weak, say so and propose a non-date-dependent idea.
