# Pedro Pathing Visualizer

This 3D Robotics Duluth fork adds selectable coordinate frames and tile units to the upstream Pedro Pathing Visualizer.

**[Open the Hosted Visualizer](https://3droboticsduluth.github.io/Visualizer/)**

Based on upstream v2.5 (`e61fdf8`, October 27, 2026), including its new project model, collision detection, BioBuzz fields, and automated regression suite. Fork projects use schema 2.1.0 to retain coordinate preferences; existing `.pp` / 1.5.0 files migrate on load.

## Hosting

GitHub Actions tests, type-checks, builds, and publishes `main` to GitHub Pages.
Pull requests run verification without deploying. Repository Settings → Pages
must use **GitHub Actions** as its source. No hosting credentials are required.
Assets and the offline cache are scoped to the application path so this also
works locally or on a custom domain. Built assets use content hashes and each deployment versions its application-scoped offline cache;
close older open tabs and reopen the site if an installed copy has not updated.

## Plan in FTC Coordinates

Open **Settings → Coordinates and Units**. Select Pedro, FTC, or FTC Inverted, then Inches or Tiles. The field image remains fixed:

| Frame        | Origin      | Positive X | Positive Y | Zero Heading |
| ------------ | ----------- | ---------- | ---------- | ------------ |
| Pedro        | Bottom-left | Right      | Up         | Right        |
| FTC          | Center      | Down       | Right      | Down         |
| FTC Inverted | Center      | Up         | Left       | Up           |

Headings are counterclockwise-positive degrees. Choose the frame appropriate to your field orientation; the visualizer does not infer alliance or season orientation.

**Inches per Tile defaults to 23.5 and is editable.** The STEP assembly linked by [FIRST’s field-resources page](https://ftc-resources.firstinspires.org/ftc/field) models an interior tile repeat spacing of approximately 23.502 inches. FIRST’s nominal 24-inch description is not an exact assembled seam pitch. Measure your assembled field and adjust the calibration if needed; previously saved values are preserved.

The calibration controls the physical scale of the field image, grid, snapping, and tile coordinates together. In a centered FTC frame, `(2, 2)` at 23.5 inches per tile is 47 inches along each axis and lands on the matching visible seam intersection. Grid presets subdivide a tile, so switching between inches and tiles changes labels rather than the physical grid or image scale. Images must contain the full six-by-six tile layout, including custom images.

The inherited 141.5-inch field boundary stays fixed for project compatibility, centered at 70.75 inches. The six-tile image is centered inside it and clipped when larger; when smaller, a narrow margin surrounds the image. This is a compatibility model, not an exact reconstruction of every physical perimeter. Calibrating the background does not transform existing paths, field points, or obstacle geometry; verify saved obstacle outlines against the calibrated image before relying on collision overlays.

Point editors, heading editors, robot position, grid/snapping, ruler, and path length follow the selected frame or units as applicable. Robot dimensions and motion-parameter settings remain in inches. Switching frame, units, or tile size changes the displayed numbers, never the existing physical path. Saved `.pp.json` projects retain these preferences alongside canonical Pedro-inch geometry.

## Export Safely

The points-array export uses the selected coordinates and distance units. Java and Kotlin robot-code exports intentionally remain in **Pedro coordinates and inches**, so changing display settings does not silently alter generated robot motion. Do not treat a tiles/FTC points array as Pedro-inch coordinates without conversion.

The centered frames use half this visualizer's 141.5-inch field, not the 72-inch offset used by some Pedro FTC-coordinate conversions. If using those SDK conversion helpers directly, reconcile the field-center convention rather than copying displayed coordinates without checking it. Test start pose, axes, heading, and a short path on the physical robot before autonomous use.

## Develop and Verify

Use a current Node.js release compatible with Vite (validated with Node 24) and pnpm (the pinned version is recorded in `package.json`).

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm check
pnpm lint
pnpm build
pnpm test:e2e
pnpm dev
```

Regression tests cover all frame/unit round trips, custom tile sizes, heading conversion, point editing, centered snapping, export, and project persistence. A useful manual check is an FTC path from `(0, 0)` to `(1, 0)` in tiles: it should extend downward by 23.5 inches with the default tile size. Switching to Pedro/inches should show `(70.75, 70.75)` to `(70.75, 47.25)` without moving that path.

Upstream: [Pedro-Pathing/Visualizer](https://github.com/Pedro-Pathing/Visualizer). Existing upstream licensing is retained.
