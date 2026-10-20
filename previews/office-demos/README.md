# AgenticCore Group office demos (preview only)

Two isolated animation previews. They are not linked from the live site.

- `demo1/index.html`: "Your idea. Your digital office." Maya coordinates while Sage, Nova and Iris produce sample outputs.
- `demo2/index.html`: "An office built for your company." Maya and Atlas set up a planned workflow for an example business.

## How to open
Open each `index.html` directly in a browser, or serve the folder locally, for example with `python3 -m http.server` and then http://localhost:8000/demo1/.
Each page is self-contained: the HTML, CSS and JavaScript are inline, with no libraries. Images live in `assets/`, and the only outside request is Google Fonts (DM Sans, Manrope).
Both pages have Play, Pause and Replay controls, support reduced motion and are responsive at 360, 390 and 430px. The "Illustrative workflow" label is always visible.

`src/` contains the build and recording scripts used to produce the previews.
