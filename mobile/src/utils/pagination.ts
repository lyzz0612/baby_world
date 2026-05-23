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
  rowGap: number;
};

const FAMILY_NAME_HEIGHT = { phone: 34, tablet: 38, large: 44 } as const;
const FAMILY_CARD_PADDING = { phone: 16, tablet: 18, large: 20 } as const;

function familyCardSizeForImage(imageSize: number): FamilyCardSize {
  if (imageSize >= 110) return 'large';
  if (imageSize >= 80) return 'tablet';
  return 'phone';
}

/** 称呼页：单页展示全部项，正方形大图 + 大间距防误触 */
export function getFamilyGridLayout(
  screenWidth: number,
  _screenHeight: number,
  itemCount: number,
  gridWidth?: number,
  gridHeight?: number
): FamilyGridLayout & { imageSize?: number } {
  const gapPresets = [
    { minWidth: 900, gap: 40, rowGap: 48 },
    { minWidth: 480, gap: 30, rowGap: 38 },
    { minWidth: 0, gap: 22, rowGap: 28 },
  ];
  const preset = gapPresets.find((p) => screenWidth >= p.minWidth) ?? gapPresets[gapPresets.length - 1];
  const { gap, rowGap } = preset;

  if (!gridWidth || !gridHeight || gridWidth <= 0 || gridHeight <= 0) {
    const fallbackCols = screenWidth >= 900 ? 4 : screenWidth >= 480 ? 3 : 2;
    return {
      numColumns: fallbackCols,
      numRows: Math.ceil(itemCount / fallbackCols),
      cardSize: screenWidth >= 900 ? 'large' : screenWidth >= 480 ? 'tablet' : 'phone',
      gap,
      rowGap,
    };
  }

  let best = {
    numColumns: 2,
    numRows: Math.ceil(itemCount / 2),
    cardSize: 'phone' as FamilyCardSize,
    gap,
    rowGap,
    imageSize: 0,
  };

  const maxColumns = screenWidth >= 900 ? 5 : screenWidth >= 480 ? 4 : 2;

  for (let cols = 2; cols <= maxColumns; cols++) {
    const rows = Math.ceil(itemCount / cols);
    const cellW = (gridWidth - gap * (cols - 1)) / cols;
    const cellH = (gridHeight - rowGap * (rows - 1)) / rows;

    for (const size of ['phone', 'tablet', 'large'] as const) {
      const nameH = FAMILY_NAME_HEIGHT[size];
      const pad = FAMILY_CARD_PADDING[size];
      const maxImage = Math.min(cellW - pad, cellH - nameH - pad);
      if (maxImage < 52) continue;

      const squareImage = Math.floor(maxImage);
      if (squareImage > best.imageSize) {
        best = {
          numColumns: cols,
          numRows: rows,
          cardSize: familyCardSizeForImage(squareImage),
          gap,
          rowGap,
          imageSize: squareImage,
        };
      }
    }
  }

  return best;
}
