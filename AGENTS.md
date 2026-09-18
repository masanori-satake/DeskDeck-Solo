# AGENTS.md

## Overview
**DeskDeck-Solo** is a Chromebook tablet-optimized Chrome Extension designed to replicate an oversized virtual hardware controller deck in Chrome's Side Panel UI.

## "Solo" Series Guidelines
1. **Zero Dependencies & Pure Vanilla Web Stack**:
   - Do NOT introduce build tools (Webpack, Vite, Rollup, Babel, Parcel).
   - Do NOT add external frameworks or CSS UI libraries (React, Vue, Tailwind, Bootstrap, jQuery).
   - Use Pure Vanilla JavaScript (ES Modules), native HTML5, and standard CSS3 only.
2. **Directory Layout**:
   - Extension app lives under `projects/app/`.
   - Showcase website lives under `projects/web/`.
3. **Manifest V3**:
   - `projects/app/manifest.json` is the extension entry point.
   - Standard permissions: `sidePanel`, `storage`, `tabs`, `audio`, `power`.
4. **i18n Localization**:
   - Use `chrome.i18n.getMessage` for localized strings.
   - Locale definitions in `projects/app/_locales/ja/messages.json` and `en/messages.json`.
5. **Touch & Tablet UX**:
   - Minimum touch target size 48px/64px.
   - Use `touch-action: none` / Pointer Events (`pointerdown`, `pointermove`, `pointerup`, `pointercancel`) for drag and rotary knob controls.
