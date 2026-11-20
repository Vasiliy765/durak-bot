export const BATTLESHIP_FLEET_LENGTHS = [4, 3, 3, 2, 2, 2, 1, 1, 1, 1] as const;

export interface ShipPlacement {
  x: number;
  y: number;
  length: number;
  orientation: "horizontal" | "vertical";
}

export interface BoardCell {
  x: number;
  y: number;
}

export function previewBattleshipCells(
  x: number,
  y: number,
  length: number,
  vertical: boolean
): BoardCell[] {
  return Array.from({ length }, (_, index) => ({
    x: x + (vertical ? 0 : index),
    y: y + (vertical ? index : 0),
  }));
}

/** Next not-yet-placed slot; handles repeated lengths and arbitrary manual order. */
export function nextFleetShipIndex(
  fleet: readonly number[],
  placements: readonly Pick<ShipPlacement, "length">[]
) {
  return fleet.findIndex((length, index) => {
    const used = placements.filter(placement => placement.length === length).length;
    const slotsThroughIndex = fleet
      .slice(0, index + 1)
      .filter(value => value === length).length;
    return used < slotsThroughIndex;
  }) < 0
    ? fleet.length
    : fleet.findIndex((length, index) => {
        const used = placements.filter(placement => placement.length === length).length;
        const slotsThroughIndex = fleet
          .slice(0, index + 1)
          .filter(value => value === length).length;
        return used < slotsThroughIndex;
      });
}

/** Battleship setup rule: every ship must fit and ships may not touch, even diagonally. */
export function isFleetPlacementValid(
  placements: readonly ShipPlacement[],
  x: number,
  y: number,
  length: number,
  vertical: boolean,
  boardSize = 10
) {
  if (!Number.isInteger(length) || length < 1 || length > boardSize) return false;
  const candidate = previewBattleshipCells(x, y, length, vertical);
  if (candidate.some(cell => cell.x < 0 || cell.x >= boardSize || cell.y < 0 || cell.y >= boardSize))
    return false;

  return candidate.every(cell =>
    placements.every(existing =>
      previewBattleshipCells(
        existing.x,
        existing.y,
        existing.length,
        existing.orientation === "vertical"
      ).every(other => Math.abs(other.x - cell.x) > 1 || Math.abs(other.y - cell.y) > 1)
    )
  );
}
