import { ExcelData } from './excel.utils';

export default function getTestPeriodAverage(
  rawData: ExcelData, 
  startIndex: number, 
  endIndex: number,
  columns: number[]
) {
  let sums = new Array(columns.length).fill(0);

  for (let i = startIndex; i < endIndex; i++) {
    columns.forEach((col, idx) => {
      sums[idx] += rawData[i][col];
    });
  }

  let totalAvg = sums.reduce(
    (acc, sum) => acc + sum / (endIndex - startIndex),
    0
  );
  return totalAvg / columns.length;
}



export enum ConstantTemperature  {
  PANTRY = 17,
  WINE_STORAGE = 12,
  CELLAR = 12,
  FRESH_FOOD = 4,
  CHILL = 2,
  FROZEN_ZERO_STAR = 0,
  FROZEN_ONE_STAR = -6,
  FROZEN_TWO_STAR = -12,
  FROZEN_THREE_STAR = -18,
  FROZEN_FOUR_STAR = -18,
}