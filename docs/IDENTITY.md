# Visual identity

Option Model Lab belongs to Lucas Lebihan's professional project family:
**Quantitative Engineer · Pricing, Risk & Python**.

Keep the existing dark-ink / warm-paper themes, sage and ochre colours, thin rules
and restrained chart grids. Inter Variable is now locally served for interface
text, with IBM Plex Mono for short labels. Packages are pinned in the frontend
lockfile; no font service is contacted by the browser.

The app's favicon matches the portfolio. Every model/mode shares the same footer
link back to the author's portfolio. Numerical chart colours and model behaviour
remain independent of decorative social artwork.

`frontend/public/og.png` is a 1200 × 630 social preview, and
`docs/assets/project-header.png` is a compact 1280 × 360 README cover.
Their editable sources and rebuild script live in the author's webfolio
repository under `brand/` and `scripts/build-brand.mjs`. Copies are committed
here so this project builds independently. Update HTML image dimensions when
replacing social artwork. Font licenses are distributed with the Fontsource
packages.
