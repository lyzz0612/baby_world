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
  itemsPerPage: number;
  cardSize: FamilyCardSize;
  gap: number;
  rowGap: number;
  imageSize: number;
};

const FAMILY_CARD_HORIZONTAL_INSET = 20;

function familyCardSizeForWidth(width: number): FamilyCardSize {
  if (width >= 900) return 'large';
  if (width >= 480) return 'tablet';
  return 'phone';
}

function familyImageSizeForCell(cellW: number): number {
  const contentW = Math.max(0, cellW - FAMILY_CARD_HORIZONTAL_INSET);
  return Math.floor(contentW * 0.92);
}

/** 关系谱页：固定列数（大平板比认识动物少 1 列）+ 加大间距 */
export function getFamilyGridLayout(screenWidth: number, screenHeight: number): FamilyGridLayout {
  const shortSide = Math.min(screenWidth, screenHeight);

  let numColumns: number;
  let gap: number;
  let rowGap: number;

  if (screenWidth >= 1200) {
    numColumns = 5;
    gap = 52;
    rowGap = 60;
  } else if (screenWidth >= 900) {
    numColumns = 5;
    gap = 44;
    rowGap = 52;
  } else if (screenWidth >= 680) {
    numColumns = 4;
    gap = 30;
    rowGap = 38;
  } else if (screenWidth >= 480) {
    numColumns = 3;
    gap = 30;
    rowGap = 38;
  } else {
    numColumns = 2;
    gap = 22;
    rowGap = 28;
  }

  const cardSize = familyCardSizeForWidth(screenWidth);

  let numRows: number;
  if (shortSide >= 900 && screenHeight >= 780) {
    numRows = 4;
  } else if (shortSide >= 600 && screenHeight >= 620) {
    numRows = 4;
  } else if (shortSide >= 600) {
    numRows = 3;
  } else {
    numRows = 4;
  }

  const contentWidth = screenWidth - (screenWidth >= 680 ? 64 : 40);
  const cellW = (contentWidth - gap * (numColumns - 1)) / numColumns;
  const imageSize = Math.max(52, familyImageSizeForCell(cellW));

  return {
    numColumns,
    numRows,
    itemsPerPage: numColumns * numRows,
    cardSize,
    gap,
    rowGap,
    imageSize,
  };
}
