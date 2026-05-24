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
/** FamilyCard 左右 padding 10 + 10 */
const FAMILY_CARD_HORIZONTAL_INSET = 20;
/** 列表方图至少占格子内容宽度的比例 */
const FAMILY_IMAGE_WIDTH_RATIO = 0.85;
const FAMILY_IMAGE_WIDTH_MIN_RATIO = 0.75;
/** 旧版称呼页预设项数量，用作列数估算基准 */
export const FAMILY_LAYOUT_REFERENCE_COUNT = 14;

function familyCardSizeForImage(imageSize: number): FamilyCardSize {
  if (imageSize >= 110) return 'large';
  if (imageSize >= 80) return 'tablet';
  return 'phone';
}

function familyImageSizeForCell(cellW: number, cardSize: FamilyCardSize): number {
  const contentW = Math.max(0, cellW - FAMILY_CARD_HORIZONTAL_INSET);
  const target = Math.floor(contentW * FAMILY_IMAGE_WIDTH_RATIO);
  const minimum = Math.floor(contentW * FAMILY_IMAGE_WIDTH_MIN_RATIO);
  return Math.max(minimum, target);
}

/** 关系谱页：沿用旧版网格算法，按满屏项数估算卡片大小 */
export function getFamilyGridLayout(
  screenWidth: number,
  screenHeight: number,
  itemCount: number,
  gridWidth?: number,
  _gridHeight?: number
): FamilyGridLayout & { imageSize?: number } {
  const layoutItemCount = FAMILY_LAYOUT_REFERENCE_COUNT;
  const gapPresets = [
    { minWidth: 900, gap: 40, rowGap: 48 },
    { minWidth: 480, gap: 30, rowGap: 38 },
    { minWidth: 0, gap: 22, rowGap: 28 },
  ];
  const preset = gapPresets.find((p) => screenWidth >= p.minWidth) ?? gapPresets[gapPresets.length - 1];
  const { gap, rowGap } = preset;

  const width =
    gridWidth && gridWidth > 0
      ? gridWidth
      : screenWidth - (screenWidth >= 680 ? 64 : 40);
  /** 固定参考高度，避免编辑提示条出现/消失时列数估算抖动 */
  const layoutHeight = Math.min(Math.max(screenHeight * 0.5, 380), 580);

  if (width <= 0) {
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
    const rows = Math.ceil(layoutItemCount / cols);
    const cellW = (width - gap * (cols - 1)) / cols;
    const cellH = (layoutHeight - rowGap * (rows - 1)) / rows;

    for (const size of ['phone', 'tablet', 'large'] as const) {
      const nameH = FAMILY_NAME_HEIGHT[size];
      const pad = FAMILY_CARD_PADDING[size];
      const widthBasedImage = familyImageSizeForCell(cellW, size);
      const heightBasedImage = Math.floor(cellH - nameH - pad);
      const squareImage = Math.max(
        Math.floor((cellW - FAMILY_CARD_HORIZONTAL_INSET) * FAMILY_IMAGE_WIDTH_MIN_RATIO),
        Math.min(widthBasedImage, heightBasedImage)
      );
      if (squareImage < 52) continue;

      if (squareImage > best.imageSize) {
        best = {
          numColumns: cols,
          numRows: Math.ceil(itemCount / cols),
          cardSize: familyCardSizeForImage(squareImage),
          gap,
          rowGap,
          imageSize: squareImage,
        };
      }
    }
  }

  if (best.imageSize <= 0) {
    const cellW = (width - gap * (best.numColumns - 1)) / best.numColumns;
    best.imageSize = Math.max(52, familyImageSizeForCell(cellW, best.cardSize));
  } else {
    const cellW = (width - gap * (best.numColumns - 1)) / best.numColumns;
    best.imageSize = familyImageSizeForCell(cellW, best.cardSize);
  }

  return best;
}
