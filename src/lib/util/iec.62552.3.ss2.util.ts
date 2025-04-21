import { differenceInSeconds } from "date-fns";
import {
  AnaylzeConfig,
  isTwoComaprtment,
  isValidTV,
} from "../store/selectedStore";
import { ExcelData } from "./excel.utils";
import { CycleData, getConstValue, Tdf } from "./iec.62552.3.util";
import getTestPeriodAverage, { ConstantTemperature } from "./iec.util";

function run(
  cycleData: CycleData[],
  timeData: Date[],
  rawData: ExcelData,
  evaluateFrozenIndex: number[],
  evaluateUnfrozenIndex: number[],
  config: AnaylzeConfig
): number {
  let defrostRecoveryCycleIndex = detectDefrostRecovery(
    cycleData,
    rawData.map((row) => row[config.power] as number)
  );

  if (defrostRecoveryCycleIndex.length < 1) {
    alert("No Defrost Recovery");
    return -1;
  }

  if (defrostRecoveryCycleIndex.length < 2) {
    alert("Lower than 2 Defrost Recovery");
    return -1;
  }
  const firstDefrost = defrostRecoveryCycleIndex[0];
  const secondDefrost = defrostRecoveryCycleIndex[1];

  let periodXY = getPeriodXY(
    firstDefrost,
    secondDefrost,
    cycleData,
    timeData,
    rawData,
    evaluateUnfrozenIndex,
    evaluateFrozenIndex,
    config
  );

  let periodDF = getPeriodDF(
    firstDefrost,
    secondDefrost,
    cycleData,
    timeData,
    rawData,
    evaluateUnfrozenIndex,
    evaluateFrozenIndex,
    config
  );

  if (periodXY.length == 0 || periodDF.length == 0) {
    alert("No matched Period!");
    throw new Error("Invalid Period");
  }

  const Edf = calcEdf(
    periodDF[0],
    periodDF[1],
    cycleData,
    rawData,
    timeData,
    config
  );

  const Tdf = calcTdf(
    periodDF[0],
    periodDF[1],
    rawData,
    timeData,
    evaluateUnfrozenIndex,
    evaluateFrozenIndex,
    config
  );

  const energy = calcEnergyConsumption(
    periodXY[0][0],
    periodXY[1][1],
    rawData,
    timeData,
    config
  );

  const PSS2 =
    (energy - Edf) /
    (differenceInSeconds(timeData[periodXY[1][1]], timeData[periodXY[0][0]]) /
      3600);

  const TSS2: Tdf = calcTSS2(
    config,
    rawData,
    timeData,
    periodXY[0][0],
    periodXY[1][1],
    Tdf
  );

  const constV = getConstValue(config.targetAmbient);

  const Tat = constV.Tat;
  const Tam = getTestPeriodAverage(
    rawData,
    periodXY[0][0],
    periodXY[1][1],
    config.ambient
  );
  const c1 = constV.c1;
  const c2 = constV.c2;

  let deno = getDenominator(config, Tat, TSS2, c1, c2);
  let numer = getNumerator(config, TSS2, c1, c2);

  const deltaCop = isTwoComaprtment(config)
    ? constV.deltaCopTwo
    : constV.deltaCopOne;

  return (
    PSS2 *
    (1 + (Tat - Tam) * (numer / deno)) *
    (1 / (1 + (Tat - Tam) * deltaCop))
  );
}

function detectDefrostRecovery(
  cycleData: CycleData[],
  powerData: number[]
): number[] {
  let defrostRecoveryCycleIndex: number[] = [];

  for (let i = 1; i < cycleData.length - 1; i++) {
    let index = i - 1;
    let maxIndex = 0;

    const beforeCycle = cycleData[index];
    const currentCycle = cycleData[i];
    const nextCycle = cycleData[i + 1];

    if (beforeCycle.max == -1) {
      let max = -1;
      for (let j = beforeCycle.index; j < currentCycle.index; j++) {
        if (max < powerData[j]) {
          max = powerData[j];
        }
      }
      beforeCycle.max = max;
    }

    if (currentCycle.max == -1) {
      let max = -1;
      for (let j = currentCycle.index; j < nextCycle.index; j++) {
        if (max < powerData[j]) {
          max = powerData[j];
          maxIndex = j;
        }
      }
      currentCycle.max = max;
    }

    if (beforeCycle.max * 1.5 < currentCycle.max) {
      defrostRecoveryCycleIndex.push(maxIndex);
    }
  }
  return defrostRecoveryCycleIndex;
}

function getNumerator(
  config: AnaylzeConfig,
  tss2: Tdf,
  c1: number,
  c2: number
) {
  let value = 0;
  if (isValidTV(config.freshFood)) {
    value +=
      config.freshFood.volume /
      (c1 * (18 + ConstantTemperature.FRESH_FOOD) + c2);
  }
  if (isValidTV(config.cellar)) {
    value +=
      config.cellar.volume / (c1 * (18 + ConstantTemperature.CELLAR) + c2);
  }
  if (isValidTV(config.pantry)) {
    value +=
      config.pantry.volume / (c1 * (18 + ConstantTemperature.PANTRY) + c2);
  }
  if (isValidTV(config.wineStorage)) {
    value +=
      config.wineStorage.volume /
      (c1 * (18 + ConstantTemperature.WINE_STORAGE) + c2);
  }
  if (isValidTV(config.chill)) {
    value += config.chill.volume / (c1 * (18 + ConstantTemperature.CHILL) + c2);
  }
  if (isValidTV(config.frozenZeroStar)) {
    value +=
      config.frozenZeroStar.volume /
      (c1 * (18 + ConstantTemperature.FROZEN_ZERO_STAR) + c2);
  }
  if (isValidTV(config.frozenOneStar)) {
    value +=
      config.frozenOneStar.volume /
      (c1 * (18 + ConstantTemperature.FROZEN_ONE_STAR) + c2);
  }
  if (isValidTV(config.frozenTwoStar)) {
    value +=
      config.frozenTwoStar.volume /
      (c1 * (18 + ConstantTemperature.FROZEN_TWO_STAR) + c2);
  }
  if (isValidTV(config.frozenThreeStar)) {
    value +=
      config.frozenThreeStar.volume /
      (c1 * (18 + ConstantTemperature.FROZEN_THREE_STAR) + c2);
  }
  if (isValidTV(config.frozenFourStar)) {
    value +=
      config.frozenFourStar.volume /
      (c1 * (18 + ConstantTemperature.FROZEN_THREE_STAR) + c2);
  }
  return value;
}
function getDenominator(
  config: AnaylzeConfig,
  Tam: number,
  tss2: Tdf,
  c1: number,
  c2: number
) {
  let value = 0;
  if (isValidTV(config.freshFood)) {
    value +=
      (config.freshFood.volume * (Tam - tss2.freshFood)) /
      (c1 * (18 + ConstantTemperature.FRESH_FOOD + c2));
  }
  if (isValidTV(config.cellar)) {
    value +=
      (config.cellar.volume * (Tam - tss2.cellar)) /
      (c1 * (18 + ConstantTemperature.CELLAR + c2));
  }
  if (isValidTV(config.pantry)) {
    value +=
      (config.pantry.volume * (Tam - tss2.pantry)) /
      (c1 * (18 + ConstantTemperature.PANTRY + c2));
  }
  if (isValidTV(config.wineStorage)) {
    value +=
      (config.wineStorage.volume * (Tam - tss2.wineStorage)) /
      (c1 * (18 + ConstantTemperature.WINE_STORAGE + c2));
  }
  if (isValidTV(config.chill)) {
    value +=
      (config.chill.volume * (Tam - tss2.chill)) /
      (c1 * (18 + ConstantTemperature.CHILL + c2));
  }
  if (isValidTV(config.frozenZeroStar)) {
    value +=
      (config.frozenZeroStar.volume * (Tam - tss2.frozenZeroStar)) /
      (c1 * (18 + ConstantTemperature.FROZEN_ZERO_STAR + c2));
  }
  if (isValidTV(config.frozenOneStar)) {
    value +=
      (config.frozenOneStar.volume * (Tam - tss2.frozenOneStar)) /
      (c1 * (18 + ConstantTemperature.FROZEN_ONE_STAR + c2));
  }
  if (isValidTV(config.frozenTwoStar)) {
    value +=
      (config.frozenTwoStar.volume * (Tam - tss2.frozenTwoStar)) /
      (c1 * (18 + ConstantTemperature.FROZEN_TWO_STAR + c2));
  }
  if (isValidTV(config.frozenThreeStar)) {
    value +=
      (config.frozenThreeStar.volume * (Tam - tss2.frozenThreeStar)) /
      (c1 * (18 + ConstantTemperature.FROZEN_THREE_STAR + c2));
  }
  if (isValidTV(config.frozenFourStar)) {
    value +=
      (config.frozenFourStar.volume * (Tam - tss2.frozenFourStar)) /
      (c1 * (18 + ConstantTemperature.FROZEN_THREE_STAR + c2));
  }

  return value;
}
function getPeriodXY(
  firstDefrost: number,
  secondDefrost: number,
  cycleData: CycleData[],
  timeData: Date[],
  rawData: ExcelData,
  evaluateUnfrozenIndex: number[],
  evaluateFrozenIndex: number[],
  config: AnaylzeConfig
) {
  let periodX = 0;
  let periodY = 0;

  let numberOfTCC = 4;
  const initialNumberOfTCC = numberOfTCC;

  let periodXBlock: number[] = [];
  let periodYBlock: number[] = [];

  for (let i = initialNumberOfTCC; i < 100; i++) {
    numberOfTCC = i;
    if (validatePeriod(cycleData, timeData, firstDefrost, numberOfTCC)) {
      periodX = firstDefrost - numberOfTCC;
    }

    if (validatePeriod(cycleData, timeData, secondDefrost, numberOfTCC)) {
      periodY = secondDefrost - numberOfTCC;
    }

    if (periodX === 0 && periodY === 0) {
      continue;
    }

    let xBlock = [periodX, firstDefrost - 1];
    let yBlock = [periodY, secondDefrost - 1];
    let xBlockIndex = [
      cycleData[xBlock[0]].index,
      cycleData[xBlock[1] + 1].index,
    ];
    let yBlockIndex = [
      cycleData[yBlock[0]].index,
      cycleData[yBlock[1] + 1].index,
    ];

    if (!validateDuration(xBlockIndex, yBlockIndex, timeData)) {
      continue;
    }

    if (
      !validateSpreadOfTemperature(
        xBlockIndex,
        yBlockIndex,
        rawData,
        cycleData,
        evaluateUnfrozenIndex,
        evaluateFrozenIndex
      )
    ) {
      console.log("Spread Of Temperature is more than 0.5");
      continue;
    }

    if (!validateSpreadOfPower(rawData, xBlockIndex, config, yBlockIndex)) {
      console.log("Spread of Power is invalid");
      continue;
    }

    periodXBlock = xBlockIndex;
    periodYBlock = yBlockIndex;
  }

  return [periodXBlock, periodYBlock];
}
function getPeriodDF(
  firstDefrost: number,
  secondDefrost: number,
  cycleData: CycleData[],
  timeData: Date[],
  rawData: ExcelData,
  evaluateUnfrozenIndex: number[],
  evaluateFrozenIndex: number[],
  config: AnaylzeConfig
): number[][] {
  let nominalIndex = firstDefrost;
  for (let i = firstDefrost; i < timeData.length; i++) {
    if (differenceInSeconds(timeData[i], timeData[firstDefrost]) > 2 * 3600) {
      nominalIndex = i;
      break;
    }
  }
  let periodDBlock: number[] = [];
  let periodFBlock: number[] = [];
  for (let i = 3; i < 10; i++) {
    periodDBlock = findPeriodD(cycleData, timeData, nominalIndex, i);
    if (periodDBlock.length == 0) continue;
    periodFBlock = findPeriodF(cycleData, timeData, nominalIndex, i);
    if (periodFBlock.length == 0) continue;

    if (!validateDuration(periodDBlock, periodFBlock, timeData)) {
      console.log("Duration is invalid");
      return [];
    }

    if (
      !validateSpreadOfTemperature(
        periodDBlock,
        periodFBlock,
        rawData,
        cycleData,
        evaluateUnfrozenIndex,
        evaluateFrozenIndex
      )
    ) {
      console.log("Spread Of Temperature is more than 0.5");
      return [];
    }

    if (!validateSpreadOfPower(rawData, periodDBlock, config, periodFBlock)) {
      console.log("Spread of Power is invalid");
      return [];
    }

    let periodDStart = periodDBlock[0];
    if (differenceInSeconds(timeData[periodDStart], timeData[0]) <= 5 * 3600) {
      console.log("Should be start after 5hr");
      return [];
    }

    // if (
    //   previousDefrostIndex &&
    //   differenceInSeconds(
    //     timeData[periodDStart],
    //     timeData[previousDefrostIndex]
    //   ) <=
    //     5 * 3600
    // ) {
    //   console.log("Should be start after 5hr of previous defrost");
    //   return [];
    // }

    if (secondDefrost && periodFBlock[1] > secondDefrost) {
      console.log("Period F should be end before next defrost");
      return [];
    }
  }
  if (periodDBlock.length == 0 && periodFBlock.length == 0) {
    return [];
  }

  return [periodDBlock, periodFBlock];
}
function calcEnergyConsumption(
  begin: number,
  end: number,
  rawData: ExcelData,
  timeData: Date[],
  config: AnaylzeConfig
): number {
  let energy: number = 0;
  for (let i = begin; i < end; i++) {
    energy +=
      ((rawData[i][config.power] as number) *
        differenceInSeconds(timeData[i + 1], timeData[i])) /
      3600;
  }
  return energy;
}
function calcEdf(
  periodDBlock: number[],
  periodFBlock: number[],
  cycleData: CycleData[],
  rawData: ExcelData,
  timeData: Date[],
  config: AnaylzeConfig
) {
  let EendfMinusEendX = 0;

  for (let i = periodDBlock[0]; i < periodFBlock[1]; i++) {
    EendfMinusEendX +=
      ((rawData[i][config.power] as number) *
        differenceInSeconds(timeData[i + 1], timeData[i])) /
      3600;
  }

  let xPower = getTestPeriodAverage(rawData, periodDBlock[0], periodDBlock[1], [
    config.power,
  ]);
  let yPower = getTestPeriodAverage(rawData, periodFBlock[0], periodFBlock[1], [
    config.power,
  ]);

  let Edf =
    EendfMinusEendX -
    ((yPower + xPower) / 2) *
      (differenceInSeconds(
        timeData[periodFBlock[1]],
        timeData[periodDBlock[0]]
      ) /
        3600);
  return Edf;
}
function calcTdf(
  periodDBlock: number[],
  periodFBlock: number[],
  rawData: ExcelData,
  timeData: Date[],
  evaluateUnfrozenIndex: number[],
  evaluateFrozenIndex: number[],
  config: AnaylzeConfig
) {
  let beginTime = timeData[periodDBlock[0]];
  let endTime = timeData[periodFBlock[1]];

  const duration = differenceInSeconds(endTime, beginTime) / 3600;
  let unfrozonT = getTSS2i(
    rawData,
    periodDBlock,
    periodFBlock,
    evaluateUnfrozenIndex,
    duration
  );

  let frozenT = getTSS2i(
    rawData,
    periodDBlock,
    periodFBlock,
    evaluateFrozenIndex,
    duration
  );

  let rtn: Tdf = {
    freshFood: -1000,
    cellar: -1000,
    pantry: -1000,
    wineStorage: -1000,
    chill: -1000,
    frozenZeroStar: -1000,
    frozenOneStar: -1000,
    frozenTwoStar: -1000,
    frozenThreeStar: -1000,
    frozenFourStar: -1000,
    evaluateFrozen: -1000,
    evaluateUnfrozen: -1000,
  };
  rtn.evaluateFrozen = frozenT;
  rtn.evaluateUnfrozen = unfrozonT;
  if (isValidTV(config.freshFood)) {
    rtn.freshFood = getTSS2i(
      rawData,
      periodDBlock,
      periodFBlock,
      config.freshFood.temp,
      duration
    );
  }
  if (isValidTV(config.cellar)) {
    rtn.cellar = getTSS2i(
      rawData,
      periodDBlock,
      periodFBlock,
      config.cellar.temp,
      duration
    );
  }
  if (isValidTV(config.pantry)) {
    rtn.pantry = getTSS2i(
      rawData,
      periodDBlock,
      periodFBlock,
      config.pantry.temp,
      duration
    );
  }
  if (isValidTV(config.wineStorage)) {
    rtn.wineStorage = getTSS2i(
      rawData,
      periodDBlock,
      periodFBlock,
      config.wineStorage.temp,
      duration
    );
  }
  if (isValidTV(config.chill)) {
    rtn.chill = getTSS2i(
      rawData,
      periodDBlock,
      periodFBlock,
      config.chill.temp,
      duration
    );
  }
  if (isValidTV(config.frozenZeroStar)) {
    rtn.frozenZeroStar = getTSS2i(
      rawData,
      periodDBlock,
      periodFBlock,
      config.frozenZeroStar.temp,
      duration
    );
  }
  if (isValidTV(config.frozenOneStar)) {
    rtn.frozenOneStar = getTSS2i(
      rawData,
      periodDBlock,
      periodFBlock,
      config.frozenOneStar.temp,
      duration
    );
  }
  if (isValidTV(config.frozenTwoStar)) {
    rtn.frozenTwoStar = getTSS2i(
      rawData,
      periodDBlock,
      periodFBlock,
      config.frozenTwoStar.temp,
      duration
    );
  }
  if (isValidTV(config.frozenThreeStar)) {
    rtn.frozenThreeStar = getTSS2i(
      rawData,
      periodDBlock,
      periodFBlock,
      config.frozenThreeStar.temp,
      duration
    );
  }
  if (isValidTV(config.frozenFourStar)) {
    rtn.frozenFourStar = getTSS2i(
      rawData,
      periodDBlock,
      periodFBlock,
      config.frozenFourStar.temp,
      duration
    );
  }

  return rtn;
}
function validatePeriod(
  cycleData: CycleData[],
  timeData: Date[],
  flag: number,
  deltaTCC: number
): boolean {
  if (deltaTCC < 4) {
    return false;
  }
  let xBlock = [flag - deltaTCC, flag];
  let startIndex = cycleData[xBlock[0]].index;
  let endIndex = cycleData[xBlock[1] + 1].index - 1;
  let duration = differenceInSeconds(timeData[endIndex], timeData[startIndex]);
  return duration >= 4 * 3600;
}
function validateDuration(
  xBlcok: number[],
  yBlock: number[],
  timeData: Date[]
) {
  const ratio =
    differenceInSeconds(timeData[xBlcok[1]], timeData[xBlcok[0]]) /
    differenceInSeconds(timeData[yBlock[1]], timeData[yBlock[0]]);
  return ratio >= 0.8 && ratio <= 1.25;
}
function validateSpreadOfTemperature(
  xBlockIndex: number[],
  yBlockIndex: number[],
  rawData: ExcelData,
  cycleData: CycleData[],
  evaluateUnfrozenIndex: number[],
  evaluateFrozenIndex: number[]
) {
  // Spread Of Temperature
  let xBlcokTemp = getTestPeriodAverage(
    rawData,
    cycleData[xBlockIndex[0]].index,
    cycleData[xBlockIndex[1]].index,
    evaluateUnfrozenIndex
  );

  let yBlockTemp = getTestPeriodAverage(
    rawData,
    cycleData[yBlockIndex[0]].index,
    cycleData[yBlockIndex[1]].index,
    evaluateUnfrozenIndex
  );

  let spreadOfUnfrozenTemp = Math.abs(xBlcokTemp - yBlockTemp);
  if (spreadOfUnfrozenTemp >= 0.5) {
    console.log(
      "Unfrozen Spread Of Temperature is more than 0.5",
      spreadOfUnfrozenTemp
    );
    return false;
  }

  xBlcokTemp = getTestPeriodAverage(
    rawData,
    cycleData[xBlockIndex[0]].index,
    cycleData[xBlockIndex[1]].index,
    evaluateFrozenIndex
  );

  yBlockTemp = getTestPeriodAverage(
    rawData,
    cycleData[yBlockIndex[0]].index,
    cycleData[yBlockIndex[1]].index,
    evaluateFrozenIndex
  );

  let spreadOfFrozenTemp = Math.abs(xBlcokTemp - yBlockTemp);

  if (spreadOfFrozenTemp >= 0.5) {
    console.log(
      "Frozen Spread Of Temperature is more than 0.5",
      spreadOfFrozenTemp
    );
    return false;
  }

  return true;
}
function validateSpreadOfPower(
  rawData: ExcelData,
  xBlockIndex: number[],
  config: AnaylzeConfig,
  yBlockIndex: number[]
) {
  let xPower = getTestPeriodAverage(rawData, xBlockIndex[0], xBlockIndex[1], [
    config.power,
  ]);
  let yPower = getTestPeriodAverage(rawData, yBlockIndex[0], yBlockIndex[1], [
    config.power,
  ]);

  let spreadOfPower1 = Math.abs(yPower - xPower) / ((xPower + yPower) / 2);
  let spreadOfPower2 = Math.abs(yPower - xPower);
  if (spreadOfPower1 < 0.02 || spreadOfPower2 < 1) {
    return true;
  } else {
    console.log(
      "Spread Of Power is more than 2% or lower than 1W",
      spreadOfPower1,
      spreadOfPower2
    );
    return false;
  }
}
function findPeriodD(
  cycleData: CycleData[],
  timeData: Date[],
  nominalIndex: number,
  numberOfTCC: number = 3
): number[] {
  let periodDEndCycle = 0;
  for (let i = 0; i < cycleData.length; i++) {
    if (cycleData[i].index > nominalIndex) {
      console.log("Invalid");
    }

    if (
      differenceInSeconds(
        timeData[nominalIndex],
        timeData[cycleData[i].index]
      ) <
      3 * 3600
    ) {
      if (i > 1) {
        periodDEndCycle = i - 1;
      } else {
        console.log("Invalid Period");
      }
      break;
    }
  }
  let periodDStartCycle = periodDEndCycle - numberOfTCC;
  if (periodDStartCycle < 0) {
    return [];
  }
  for (let i = periodDStartCycle; i > 0; i--) {
    if (
      differenceInSeconds(
        timeData[cycleData[periodDEndCycle].index],
        timeData[cycleData[i].index]
      ) >
      3 * 3600
    ) {
      periodDStartCycle = i;
    }
  }

  return [cycleData[periodDStartCycle].index, cycleData[periodDEndCycle].index];
}
function findPeriodF(
  cycleData: CycleData[],
  timeData: Date[],
  nominalIndex: number,
  numberOfTCC: number = 3
) {
  let periodFStartCycle = 0;
  for (let i = 0; i < cycleData.length; i++) {
    if (cycleData[i].index < nominalIndex) continue;
    if (
      differenceInSeconds(
        timeData[cycleData[i].index],
        timeData[nominalIndex]
      ) > 3600
    ) {
      periodFStartCycle = i;
      break;
    }
  }

  let periodFEndCycle = 0;
  for (let i = periodFStartCycle + numberOfTCC; i < cycleData.length; i++) {
    if (i > cycleData.length - 1) {
      return [];
    }
    if (
      differenceInSeconds(
        timeData[cycleData[i].index],
        timeData[cycleData[periodFStartCycle].index]
      )
    ) {
      periodFEndCycle = i;
      break;
    }
  }

  return [cycleData[periodFStartCycle].index, cycleData[periodFEndCycle].index];
}
function getTSS2i(
  rawData: ExcelData,
  periodDBlock: number[],
  periodFBlock: number[],
  index: number[],
  duration: number
) {
  return (
    duration *
    (getTestPeriodAverage(rawData, periodDBlock[0], periodFBlock[1], index) -
      (getTestPeriodAverage(rawData, periodFBlock[0], periodFBlock[1], index) +
        getTestPeriodAverage(
          rawData,
          periodDBlock[0],
          periodDBlock[1],
          index
        )) /
        2)
  );
}

function calcTSS2(
  config: AnaylzeConfig,
  rawData: ExcelData,
  timeData: Date[],
  begin: number,
  end: number,
  tdf: Tdf
): Tdf {
  let rtn: Tdf = {
    freshFood: -1000,
    cellar: -1000,
    pantry: -1000,
    wineStorage: -1000,
    chill: -1000,
    frozenZeroStar: -1000,
    frozenOneStar: -1000,
    frozenTwoStar: -1000,
    frozenThreeStar: -1000,
    frozenFourStar: -1000,
    evaluateFrozen: -1000,
    evaluateUnfrozen: -1000,
  };
  const timeDuration =
    differenceInSeconds(timeData[end], timeData[begin]) / 3600;

  if (isValidTV(config.evaluateUnfrozen)) {
    rtn.evaluateUnfrozen =
      getTestPeriodAverage(rawData, begin, end, config.evaluateUnfrozen.temp) -
      tdf.evaluateUnfrozen / timeDuration;
  }

  if (isValidTV(config.evaluateFrozen)) {
    rtn.evaluateFrozen =
      getTestPeriodAverage(rawData, begin, end, config.evaluateFrozen.temp) -
      tdf.evaluateFrozen / timeDuration;
  }

  if (isValidTV(config.freshFood)) {
    rtn.freshFood =
      getTestPeriodAverage(rawData, begin, end, config.freshFood.temp) -
      tdf.freshFood / timeDuration;
  }

  if (isValidTV(config.cellar)) {
    rtn.cellar =
      getTestPeriodAverage(rawData, begin, end, config.cellar.temp) -
      tdf.cellar / timeDuration;
  }
  if (isValidTV(config.pantry)) {
    rtn.pantry =
      getTestPeriodAverage(rawData, begin, end, config.pantry.temp) -
      tdf.pantry / timeDuration;
  }
  if (isValidTV(config.wineStorage)) {
    rtn.wineStorage =
      getTestPeriodAverage(rawData, begin, end, config.wineStorage.temp) -
      tdf.wineStorage / timeDuration;
  }
  if (isValidTV(config.chill)) {
    rtn.chill =
      getTestPeriodAverage(rawData, begin, end, config.chill.temp) -
      tdf.chill / timeDuration;
  }
  if (isValidTV(config.frozenZeroStar)) {
    rtn.frozenZeroStar =
      getTestPeriodAverage(rawData, begin, end, config.frozenZeroStar.temp) -
      tdf.frozenZeroStar / timeDuration;
  }
  if (isValidTV(config.frozenOneStar)) {
    rtn.frozenOneStar =
      getTestPeriodAverage(rawData, begin, end, config.frozenOneStar.temp) -
      tdf.frozenOneStar / timeDuration;
  }
  if (isValidTV(config.frozenTwoStar)) {
    rtn.frozenTwoStar =
      getTestPeriodAverage(rawData, begin, end, config.frozenTwoStar.temp) -
      tdf.frozenTwoStar / timeDuration;
  }
  if (isValidTV(config.frozenThreeStar)) {
    rtn.frozenThreeStar =
      getTestPeriodAverage(rawData, begin, end, config.frozenThreeStar.temp) -
      tdf.frozenThreeStar / timeDuration;
  }
  if (isValidTV(config.frozenFourStar)) {
    rtn.frozenFourStar =
      getTestPeriodAverage(rawData, begin, end, config.frozenFourStar.temp) -
      tdf.frozenFourStar / timeDuration;
  }

  if (rtn) {
    return rtn;
  }
  throw new Error("Function not implemented.");
}
