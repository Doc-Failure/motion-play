# Local handwriting fonts

Active font: **Motion Scribble revision 02**, an original Motion Play family in
Regular (400) and Bold (700), served locally from `public/fonts` under the CSS
family alias `Motion Hand`. Headings use the real Bold face with synthetic
outlining/weights disabled. Handwritten pen pressure, varied lean/width/baselines,
looped forms and contextual alternates give repeated letters different shapes.

Short Stack Regular and Patrick Hand remain as licensed references, with their
SIL OFL licenses. Neither supplies the active font outlines. Original sources:
https://github.com/google/fonts/tree/main/ofl/shortstack
https://github.com/google/fonts/tree/main/ofl/patrickhand
The supplied ZIP contained raster typography references rather than font files.
All active fonts are local; no runtime font-service requests or tracking.

## Original Motion Scribble family

An original Motion Play family is available at `/font-preview.html`. The editable
specimen covers game titles, player buttons, scores, small instructions and
accented text. Regular (400) and Bold (700) each contain 223 mapped characters,
including ASCII, Latin accents, arrows and simple hand-drawn symbols. Revision 02 is now active throughout the application. Ten contextual alternate
letterforms add variation without changing semantic/editable HTML text.

Files: `public/fonts/MotionScribble-{Regular,Bold}.{ttf,woff2}`. TTFs can be installed
on a computer; WOFF2 files are web fonts. Original centerline drawings and outline
construction live in `scripts/generate-motion-font.py`; no other font outlines
were imported, traced or transformed. MIT license: `public/fonts/MOTION-SCRIBBLE-LICENSE.txt`.

To regenerate using a temporary build environment (no runtime dependency):

```sh
python3 -m venv /tmp/motion-font-build
/tmp/motion-font-build/bin/pip install fonttools==4.60.2 brotli==1.2.1
/tmp/motion-font-build/bin/python scripts/generate-motion-font.py
```

This revision has two real weights, basic kerning and consistent vertical
metrics. It has not received professional type-design review, exhaustive language
coverage, or physical small-screen readability testing.
