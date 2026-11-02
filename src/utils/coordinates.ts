import type { BasePoint } from "../types";

export type CoordinateSystem = "pedro" | "ftc" | "ftc-inverted";
export type DistanceUnit = "inches" | "tiles";
export const DEFAULT_TILE_SIZE = 23.5;
export const FIELD_INCHES = 141.5;

export interface CoordinateSettings {
  coordinateSystem?: CoordinateSystem;
  distanceUnit?: DistanceUnit;
  tileSize?: number;
}

export function inchesPerUnit(settings: CoordinateSettings): number {
  if (settings.distanceUnit !== "tiles") return 1;
  const size = settings.tileSize;
  return typeof size === "number" && Number.isFinite(size) && size > 0
    ? size
    : DEFAULT_TILE_SIZE;
}

export function unitLabel(settings: CoordinateSettings): string {
  return settings.distanceUnit === "tiles" ? "tiles" : "in";
}

// These describe FTC axes relative to the fixed Pedro field image:
// FTC +X points down, +Y right; FTC Inverted +X up, +Y left.
// All frames use counterclockwise-positive headings. Storage remains Pedro/inches.
export function toDisplay(
  point: BasePoint,
  settings: CoordinateSettings,
): BasePoint {
  const scale = inchesPerUnit(settings);
  const x = point.x - FIELD_INCHES / 2;
  const y = point.y - FIELD_INCHES / 2;
  if (settings.coordinateSystem === "ftc")
    return { x: -y / scale, y: x / scale };
  if (settings.coordinateSystem === "ftc-inverted")
    return { x: y / scale, y: -x / scale };
  return { x: point.x / scale, y: point.y / scale };
}

export function fromDisplay(
  point: BasePoint,
  settings: CoordinateSettings,
): BasePoint {
  const scale = inchesPerUnit(settings);
  const x = point.x * scale;
  const y = point.y * scale;
  if (settings.coordinateSystem === "ftc")
    return { x: y + FIELD_INCHES / 2, y: -x + FIELD_INCHES / 2 };
  if (settings.coordinateSystem === "ftc-inverted")
    return { x: -y + FIELD_INCHES / 2, y: x + FIELD_INCHES / 2 };
  return { x, y };
}

function headingOffset(settings: CoordinateSettings): number {
  return settings.coordinateSystem === "ftc"
    ? 90
    : settings.coordinateSystem === "ftc-inverted"
      ? -90
      : 0;
}

export function displayHeading(
  degrees: number,
  settings: CoordinateSettings,
): number {
  return degrees + headingOffset(settings);
}

export function storedHeading(
  degrees: number,
  settings: CoordinateSettings,
): number {
  return degrees - headingOffset(settings);
}

export function editCoordinate(
  point: BasePoint,
  axis: "x" | "y",
  value: number,
  settings: CoordinateSettings,
): BasePoint {
  if (!Number.isFinite(value)) return point;
  return {
    ...point,
    ...fromDisplay({ ...toDisplay(point, settings), [axis]: value }, settings),
  };
}

export function gridOrigin(settings: CoordinateSettings): number {
  return settings.coordinateSystem === "ftc" ||
    settings.coordinateSystem === "ftc-inverted"
    ? FIELD_INCHES / 2
    : 0;
}

// Existing grid presets (1, 3, 6, 12 inches) become fractions of a tile.
export function gridSpacing(
  size: number,
  settings: CoordinateSettings,
): number {
  return settings.distanceUnit === "tiles"
    ? (size / 24) * inchesPerUnit(settings)
    : size;
}

export function formatPoint(
  point: BasePoint,
  settings: CoordinateSettings,
): string {
  const value = toDisplay(point, settings);
  return `${Number(value.x.toFixed(3))}, ${Number(value.y.toFixed(3))}`;
}

/** Validate display preferences at file and browser-storage boundaries. */
export function normalizeCoordinateSettings(
  value: unknown,
): Required<CoordinateSettings> {
  const input =
    value && typeof value === "object" ? (value as CoordinateSettings) : {};
  return {
    coordinateSystem:
      input.coordinateSystem === "ftc" ||
      input.coordinateSystem === "ftc-inverted"
        ? input.coordinateSystem
        : "pedro",
    distanceUnit: input.distanceUnit === "tiles" ? "tiles" : "inches",
    tileSize:
      typeof input.tileSize === "number" &&
      Number.isFinite(input.tileSize) &&
      input.tileSize > 0
        ? input.tileSize
        : DEFAULT_TILE_SIZE,
  };
}
