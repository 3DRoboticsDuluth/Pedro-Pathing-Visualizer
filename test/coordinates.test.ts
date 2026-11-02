import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  getDefaultPaths,
  getDefaultStartPoint,
} from "../src/config/defaults";
import { generatePointsArray } from "../src/lib/codegen/points";
import { snapPoint, type GridSnapOptions } from "../src/view/snap";
const snapPointToGrid = (x: number, y: number, options: GridSnapOptions) =>
  snapPoint({ x, y }, options);
import {
  createDefaultProject,
  parseProject,
  robotConfigOf,
  serializeProject,
} from "../src/io";
import {
  displayHeading,
  storedHeading,
  toDisplay,
  fromDisplay,
  editCoordinate,
  inchesPerUnit,
  gridOrigin,
  gridSpacing,
  type CoordinateSettings,
} from "../src/utils/coordinates";

describe("coordinate frames", () => {
  it("keeps legacy Pedro coordinates in inches", () => {
    expect(toDisplay({ x: 12, y: 35 }, {})).toEqual({ x: 12, y: 35 });
    expect(displayHeading(45, {})).toBe(45);
  });

  it("centers FTC frames and gives them opposite X directions", () => {
    const point = { x: 70.75, y: 46.75 };
    expect(
      toDisplay(point, { coordinateSystem: "ftc", distanceUnit: "tiles" }),
    ).toEqual({ x: 1, y: 0 });
    expect(
      toDisplay(point, {
        coordinateSystem: "ftc-inverted",
        distanceUnit: "tiles",
      }),
    ).toEqual({ x: -1, y: -0 });
    expect(displayHeading(-90, { coordinateSystem: "ftc" })).toBe(0);
    expect(displayHeading(90, { coordinateSystem: "ftc-inverted" })).toBe(0);
  });

  for (const frame of ["pedro", "ftc", "ftc-inverted"] as const) {
    for (const unit of ["inches", "tiles"] as const) {
      it(`round trips points and headings in ${frame}/${unit}`, () => {
        const settings: CoordinateSettings = {
          coordinateSystem: frame,
          distanceUnit: unit,
          tileSize: 23.625,
        };
        for (const point of [
          { x: 0, y: 0 },
          { x: 141.5, y: 141.5 },
          { x: 31.25, y: 77.75 },
        ]) {
          const actual = fromDisplay(toDisplay(point, settings), settings);
          expect(actual.x).toBeCloseTo(point.x, 10);
          expect(actual.y).toBeCloseTo(point.y, 10);
        }
        for (const heading of [-180, 0, 90, 450])
          expect(
            storedHeading(displayHeading(heading, settings), settings),
          ).toBe(heading);
      });
    }
  }

  it("edits the intended FTC axis without changing the other coordinate or lock", () => {
    const result = editCoordinate(
      { x: 70.75, y: 70.75, locked: true },
      "x",
      2,
      { coordinateSystem: "ftc", distanceUnit: "tiles" },
    );
    expect(result).toEqual({ x: 70.75, y: 22.75, locked: true });
    expect(editCoordinate(result, "y", NaN, {})).toBe(result);
  });

  it("changes only the unit representation when tile size changes", () => {
    const point = { x: 48, y: 24 };
    expect(toDisplay(point, { distanceUnit: "tiles" })).toEqual({ x: 2, y: 1 });
    expect(toDisplay(point, { distanceUnit: "tiles", tileSize: 48 })).toEqual({
      x: 1,
      y: 0.5,
    });
    expect(point).toEqual({ x: 48, y: 24 });
    for (const tileSize of [0, -2, NaN, Infinity])
      expect(inchesPerUnit({ distanceUnit: "tiles", tileSize })).toBe(24);
  });

  it("aligns Pedro grid and snapping with the cropped image seams", () => {
    const seams = [22.75, 46.75, 70.75, 94.75, 118.75];
    expect(gridOrigin({})).toBe(-1.25);
    for (const distanceUnit of ["inches", "tiles"] as const) {
      const settings = { coordinateSystem: "pedro" as const, distanceUnit };
      for (const size of [1, 3, 6, 12]) {
        const spacing = gridSpacing(size, settings);
        const origin = gridOrigin(settings);
        for (const seam of seams) {
          expect((seam - origin) / spacing).toBeCloseTo(
            Math.round((seam - origin) / spacing),
          );
          expect(
            snapPoint(
              { x: seam + 0.1, y: seam - 0.1 },
              { snapToGrid: true, showGrid: true, gridSize: spacing, origin },
            ),
          ).toEqual({ x: seam, y: seam });
        }
      }
    }
    // Callers without an explicit frame use Pedro's seam alignment too.
    expect(
      snapPoint(
        { x: 24, y: 48 },
        { snapToGrid: true, showGrid: true, gridSize: 12 },
      ),
    ).toEqual({ x: 22.75, y: 46.75 });
    expect(
      snapPoint(
        { x: -10, y: 155 },
        { snapToGrid: true, showGrid: true, gridSize: 12 },
      ),
    ).toEqual({ x: 0, y: 141.5 });
  });

  it("snaps on the centered tile grid and clamps at field edges", () => {
    const settings: CoordinateSettings = {
      coordinateSystem: "ftc",
      distanceUnit: "tiles",
    };
    const options = {
      snapToGrid: true,
      showGrid: true,
      gridSize: gridSpacing(12, settings),
      origin: gridOrigin(settings),
    };
    expect(options.gridSize).toBe(12);
    expect(snapPointToGrid(72, 83, options)).toEqual({ x: 70.75, y: 82.75 });
    expect(snapPointToGrid(-10, 155, options)).toEqual({ x: 0, y: 141.5 });
    expect(snapPointToGrid(72, 83, { ...options, snapToGrid: false })).toEqual({
      x: 72,
      y: 83,
    });
  });

  it("exports selected coordinate units without changing stored geometry", () => {
    const start = { x: 70.75, y: 46.75, headingDeg: -90 };
    expect(
      generatePointsArray(start, [], {
        coordinateSystem: "ftc",
        distanceUnit: "tiles",
      }),
    ).toBe("[(1.0, 0.0)]");
    expect(generatePointsArray(start, [])).toBe("[(70.750, 46.750)]");
    expect(start.headingDeg).toBe(-90);
  });

  it("saves view settings with canonical geometry for lossless reopening", () => {
    const startPoint = getDefaultStartPoint();
    const lines = getDefaultPaths();
    const settings = {
      ...DEFAULT_SETTINGS,
      coordinateSystem: "ftc" as const,
      distanceUnit: "tiles" as const,
      tileSize: 23.625,
    };
    const doc = {
      ...createDefaultProject(robotConfigOf(settings), settings.fieldMap),
      startPoint,
      lines,
      coordinates: {
        coordinateSystem: settings.coordinateSystem,
        distanceUnit: settings.distanceUnit,
        tileSize: settings.tileSize,
      },
    };
    const loaded = parseProject(serializeProject(doc), doc.robot);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) throw Error(loaded.error);
    expect(loaded.doc.startPoint).toEqual(startPoint);
    expect(loaded.doc.lines).toEqual(lines);
    expect(loaded.doc.coordinates).toEqual(doc.coordinates);
  });
});
