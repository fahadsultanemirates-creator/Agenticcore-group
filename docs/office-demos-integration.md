# Office demo integration

Source: `grok/office-demos-preview` at commit `3ac519f038e85e27d19933e3ab0a51fe0b8e9d9d`, from `previews/office-demos/demo1` and `demo2`. Only reviewed HTML and seven shared WebP images are imported; no build/recording scripts or old branch versions of the website are merged.

The two public scenes are `dist/office-demos/managed.html` and `owned.html`. They share `player.js` and a small assets directory. The homepage loads one scene at a time in a lazy iframe; desktop and mobile use the same responsive source. MP4 recordings are not deployed. Existing printable examples remain in a collapsed section below.

Changes from the preview:

- Start at the first visible client message instead of a long empty typing opening.
- Paint at up to 24 fps. Cancel animation frames while paused, offscreen, hidden, or under reduced-motion preferences; pause CSS typing dots as well.
- Add keyboard stage navigation and readable stage labels. Reduced motion shows a complete static summary with motion controls disabled.
- Keep current messages visible once the output panel opens, with smaller mobile window height and adequate touch controls.
- Parent and child exchange only visibility and measured height. Validate the sender, scene identity, type and height bounds. The iframe allows scripts and same-origin assets; it is styling/lifecycle isolation, not an untrusted-code security boundary. Source is reviewed local application code. Child CSP blocks network API connections, forms, objects and further embedded frames. No dashboard/session/API code is imported.
- Resize the parent to the measured scene rather than scrolling a desktop screenshot on a phone.

All conversations and businesses remain illustrative. WhatsApp is described as planned client contact/delivery; Telegram is internal coordination. No account is connected and no actual request is sent by these demos.

Checks include local lifecycle tests and browser layout/control checks at desktop and embedded phone widths of 360, 390 and 430 pixels. Phone-width browser emulation does not replace a check on the owner's physical phone.
