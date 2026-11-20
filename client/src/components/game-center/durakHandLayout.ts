export type DurakHandSlot = {
  index: number;
  left: number;
  angle: number;
  lift: number;
};

export type DurakHandRow = {
  height: number;
  cardWidth: number;
  cards: DurakHandSlot[];
};

/**
 * Lay out the entire Durak hand as card fans. On narrow phones each row is
 * capped at nine cards; larger viewports may show up to twelve. Larger hands
 * use tighter vertical row spacing so all cards remain inside the table view.
 */
export function layoutDurakHand(
  count: number,
  viewportWidth: number,
  maxCardWidth = 82
): DurakHandRow[] {
  if (!Number.isSafeInteger(count) || count <= 0) return [];

  const width = Number.isFinite(viewportWidth) && viewportWidth > 0
    ? Math.max(220, viewportWidth)
    : 340;
  const usableWidth = Math.max(180, width - 16);
  const rowLimit = width < 400 ? 9 : 12;
  const cardsPerRow = Math.max(
    1,
    Math.min(rowLimit, Math.floor((usableWidth - maxCardWidth) / 25) + 1)
  );
  const rowCount = Math.ceil(count / cardsPerRow);
  const balancedRowSize = Math.ceil(count / rowCount);
  const rows: DurakHandRow[] = [];

  for (let start = 0; start < count; start += balancedRowSize) {
    const length = Math.min(balancedRowSize, count - start);
    const cardWidth = Math.min(
      maxCardWidth,
      usableWidth / (1 + 0.38 * Math.max(0, length - 1))
    );
    const maxStep = cardWidth * 0.62;
    const fitStep = length > 1 ? (usableWidth - cardWidth) / (length - 1) : 0;
    const step = length > 1 ? Math.max(0, Math.min(maxStep, fitStep)) : 0;
    const fanWidth = cardWidth + step * Math.max(0, length - 1);
    const leftStart = (width - fanWidth) / 2;
    const middle = (length - 1) / 2;
    const maxAngle = length > 1 ? Math.min(7, 50 / (length - 1)) : 0;

    rows.push({
      height: cardWidth * 1.42 + (count > 18 ? 6 : count > 9 ? 10 : 18),
      cardWidth,
      cards: Array.from({ length }, (_, column) => {
        const normalized = middle ? (column - middle) / middle : 0;
        return {
          index: start + column,
          left: leftStart + column * step,
          angle: normalized * maxAngle,
          lift: Math.abs(normalized) * 3,
        };
      }),
    });
  }

  return rows;
}
