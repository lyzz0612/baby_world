export type AnimalCardSize = 'phone' | 'tablet' | 'large';

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

export function chunk<T>(array: T[], size: number): T[][] {
  const pages: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    pages.push(array.slice(i, i + size));
  }
  return pages.length ? pages : [[]];
}
