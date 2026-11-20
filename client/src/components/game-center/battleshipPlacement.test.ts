import { describe, expect, it } from "vitest";
import {
  BATTLESHIP_FLEET_LENGTHS,
  isFleetPlacementValid,
  nextFleetShipIndex,
  type ShipPlacement,
} from "./battleshipPlacement";

describe("Battleship manual fleet setup", () => {
  it("uses the classic 1×4, 2×3, 3×2, 4×1 fleet", () => {
    expect([...BATTLESHIP_FLEET_LENGTHS]).toEqual([4, 3, 3, 2, 2, 2, 1, 1, 1, 1]);
  });

  it("selects the next unused ship slot in order, including repeated lengths", () => {
    expect(nextFleetShipIndex(BATTLESHIP_FLEET_LENGTHS, [])).toBe(0);
    expect(nextFleetShipIndex(BATTLESHIP_FLEET_LENGTHS, [{ length: 4 }])).toBe(1);
    expect(nextFleetShipIndex(BATTLESHIP_FLEET_LENGTHS, [{ length: 4 }, { length: 3 }])).toBe(2);
    expect(nextFleetShipIndex(BATTLESHIP_FLEET_LENGTHS, [4, 3, 3, 2, 2, 2, 1, 1, 1, 1].map(length => ({ length })))).toBe(10);
  });

  it("allows ships that fit and rejects horizontal or vertical overflow", () => {
    expect(isFleetPlacementValid([], 6, 0, 4, false)).toBe(true);
    expect(isFleetPlacementValid([], 7, 0, 4, false)).toBe(false);
    expect(isFleetPlacementValid([], 0, 6, 4, true)).toBe(true);
    expect(isFleetPlacementValid([], 0, 7, 4, true)).toBe(false);
  });

  it("rejects overlap and touching even at a diagonal, but permits a one-cell gap", () => {
    const existing: ShipPlacement[] = [{ x: 1, y: 1, length: 2, orientation: "horizontal" }];
    expect(isFleetPlacementValid(existing, 2, 1, 1, false)).toBe(false);
    expect(isFleetPlacementValid(existing, 3, 2, 1, false)).toBe(false);
    expect(isFleetPlacementValid(existing, 4, 1, 1, false)).toBe(true);
  });
});
