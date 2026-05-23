export type AnimalCardSize = 'phone' | 'tablet' | 'large';

export type FamilyCardSize = AnimalCardSize;

export type AnimalGridLayout = {
  numColumns: number;
  numRows: number;
  itemsPerPage: number;
  cardSize: AnimalCardSize;
};

/** 手机竖屏基准：2 列 × 4 行 */
export const PHONE_ITEMS_PER_PAGE = 8;

export function getAnimalGridLayout(width: number, height: number): AnimalGridLayout {
  const shortSide = Math.min(width, height);

  let numColumns: number;
  let cardSize: AnimalCardSize;

  if (width >= 1200) {
    numColumns = 6;
    cardSize = 'large';
  } else if (width >= 900) {
    numColumns = 5;
    cardSize = 'large';
  } else if (width >= 680) {
    numColumns = 4;
    cardSize = 'tablet';
  } else if (width >= 480) {
    numColumns = 3;
    cardSize = 'tablet';
  } else {
    numColumns = 2;
    cardSize = 'phone';
  }

  let numRows: number;
  if (shortSide >= 900 && height >= 780) {
    numRows = 4;
  } else if (shortSide >= 600 && height >= 620) {
    numRows = 4;
  } else if (shortSide >= 600) {
    numRows = 3;
  } else {
    numRows = 4;
  }

  return {
    numColumns,
    numRows,
    itemsPerPage: numColumns * numRows,
    cardSize,
  };
}

export function getPageNavMetrics(cardSize: AnimalCardSize): {
  buttonSize: number;
  iconSize: number;
  railWidth: number;
} {
  switch (cardSize) {
    case 'large':
      return { buttonSize: 100, iconSize: 46, railWidth: 112 };
    case 'tablet':
      return { buttonSize: 84, iconSize: 38, railWidth: 96 };
    default:
      return { buttonSize: 68, iconSize: 32, railWidth: 76 };
  }
}

export function chunk<T>(array: T[], size: number): T[][] {
  const pages: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    pages.push(array.slice(i, i + size));
  }
  return pages.length ? pages : [[]];
}

export type FamilyGridLayout = {
  numColumns: number;
  numRows: number;
  cardSize: FamilyCardSize;
  gap: number;
};

/** 称呼页：单页展示全部项，加大间距，减少误触 */
export function getFamilyGridLayout(
  width: number,
  _height: number,
  itemCount: number
): FamilyGridLayout {
  const presets: Array<Omit<FamilyGridLayout, 'numRows'> & { minWidth: number }> = [
    { minWidth: 1100, numColumns: 7, cardSize: 'large', gap: 24 },
    { minWidth: 900, numColumns: 6, cardSize: 'large', gap: 22 },
    { minWidth: 680, numColumns: 5, cardSize: 'tablet', gap: 20 },
    { minWidth: 480, numColumns: 4, cardSize: 'tablet', gap: 16 },
    { minWidth: 0, numColumns: 2, cardSize: 'phone', gap: 14 },
  ];

  const preset = presets.find((p) => width >= p.minWidth) ?? presets[presets.length - 1];
  const numRows = Math.ceil(itemCount / preset.numColumns);

  return {
    numColumns: preset.numColumns,
    numRows,
    cardSize: preset.cardSize,
    gap: preset.gap,
  };
}
