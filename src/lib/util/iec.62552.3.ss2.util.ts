import { differenceInSeconds } from "date-fns";
import {
  type AnalyzeConfig,
  isTwoComaprtment,
  isValidTV,
} from "../store/selectedStore";
import { type ExcelData, exportSS2ToExcel } from "./excel.utils";
import getTestPeriodAverage, {
  ConstantTemperature,
  type CycleData,
  getConstValue,
  type Tdf,
} from "./iec.util";

export interface SS2 {
  Edf: number;
  Thdf: Tdf;
  TSS2: Tdf;
  PSS2: number;
  PeriodX: number[];
  PeriodY: number[];
  PeriodD: number[];
  PeriodF: number[];
  DefrostRecoveryIndex: number;
  NominalDefrostRecoveryIndex: number;
}

export function runSS2(
  cycleData: CycleData[],
  timeData: Date[],
  rawData: ExcelData,
  evaluateFrozenIndex: number[],
  evaluateUnfrozenIndex: number[],
  config: AnalyzeConfig
): SS2 | null {
  let powerData = rawData.map((row) => row[config.power] as number);
  let defrostRecoveryCycleIndex = detectDefrostRecovery(cycleData, powerData);

  if (defrostRecoveryCycleIndex.length < 1) {
    alert("No Defrost Recovery");
  }

  if (defrostRecoveryCycleIndex.length < 2) {
    alert("Lower than 2 Defrost Recovery");
  }
  for (let i = 0; i < defrostRecoveryCycleIndex.length - 1; i++) {
    const firstDefrost = defrostRecoveryCycleIndex[i];
    const secondDefrost = defrostRecoveryCycleIndex[i + 1];
    // console.log("First Defrost", firstDefrost);
    // console.log("Second Defrost", secondDefrost);
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

    if (periodXY.length == 0) {
      continue;
    }

    console.log("Period X", periodXY[0]);
    console.log("Period Y", periodXY[1]);

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
      continue;
    }

    let periodXY_numOfTCC = periodXY[2][0];
    let periodDF_numOfTCC = periodDF[2][0];
    let nominalIndex = firstDefrost;
    for (let i = firstDefrost; i < timeData.length; i++) {
      if (differenceInSeconds(timeData[i], timeData[firstDefrost]) > 2 * 3600) {
        nominalIndex = i;
        break;
      }
    }

    const Edf = calcEdf(
      periodDF[0],
      periodDF[1],
      cycleData,
      rawData,
      timeData,
      config
    );

    const Thdf = calcTdf(
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
      Thdf
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

    const PSS =
      PSS2 *
      (1 + (Tat - Tam) * (numer / deno)) *
      (1 / (1 + (Tat - Tam) * deltaCop));

    let rtn: SS2 = {
      Edf: Edf,
      Thdf: Thdf,
      TSS2: TSS2,
      PSS2: PSS,
      PeriodX: periodXY[0],
      PeriodY: periodXY[1],
      PeriodD: periodDF[0],
      PeriodF: periodDF[1],
      DefrostRecoveryIndex: firstDefrost,
      NominalDefrostRecoveryIndex: nominalIndex,
    };

    console.log(rtn);

    const periodX: PeriodResult = calcPeriodResult(
      rawData,
      timeData,
      periodXY[0][0],
      periodXY[0][1],
      config.power,
      evaluateFrozenIndex,
      evaluateUnfrozenIndex
    );

    const periodY: PeriodResult = calcPeriodResult(
      rawData,
      timeData,
      periodXY[1][0],
      periodXY[1][1],
      config.power,
      evaluateFrozenIndex,
      evaluateUnfrozenIndex
    );

    const periodXYExcelResult: PeriodExcelResult = {
      numberOfTCC: periodXY_numOfTCC,
      ratio: periodX.duration / periodY.duration,
      power: resultSpreadOfPower(rawData, periodXY[0], config, periodXY[1]),
      unfrozen: resultSpreadOfTemp(
        periodXY[0],
        periodXY[1],
        rawData,
        evaluateUnfrozenIndex
      ),
      frozen: resultSpreadOfTemp(
        periodXY[0],
        periodXY[1],
        rawData,
        evaluateFrozenIndex
      ),
    };

   

    const periodD: PeriodResult = calcPeriodResult(
      rawData,
      timeData,
      periodDF[0][0],
      periodDF[0][1],
      config.power,
      evaluateFrozenIndex,
      evaluateUnfrozenIndex
    );

    const periodF: PeriodResult = calcPeriodResult(
      rawData,
      timeData,
      periodDF[1][0],
      periodDF[1][1],
      config.power,
      evaluateFrozenIndex,
      evaluateUnfrozenIndex
    );

    const periodDFExcelResult: PeriodExcelResult = {
      numberOfTCC: periodDF_numOfTCC,
      ratio: periodD.duration / periodF.duration,
      power: resultSpreadOfPower(rawData, periodDF[0], config, periodDF[1]),
      unfrozen: resultSpreadOfTemp(
        periodDF[0],
        periodDF[1],
        rawData,
        evaluateUnfrozenIndex
      ),
      frozen: resultSpreadOfTemp(
        periodDF[0],
        periodDF[1],
        rawData,
        evaluateFrozenIndex
      ),
    }

    let result: SS2Result = new SS2Result({
      periodX: periodX,
      periodY: periodY,
      xyResult: periodXYExcelResult,
      periodD: periodD,
      periodF: periodF,
      dfResult: periodDFExcelResult,
      Edf: Edf,
      Thdf: Thdf,
      TSS2: TSS2,
      PSS: PSS,
      PSS2: PSS2,
      config: config,
    });

    exportSS2ToExcel(result);

    return rtn;
  }

  return null;
}

interface SS2ResultProps {
  periodX: PeriodResult;
  periodY: PeriodResult;
  xyResult: PeriodExcelResult
  periodD: PeriodResult;
  periodF: PeriodResult;
  dfResult: PeriodExcelResult;
  Edf: number;
  Thdf: Tdf;
  TSS2: Tdf;
  PSS: number;
  PSS2: number;
  config: AnalyzeConfig;
}

interface PeriodResultProps {
  start: Date;
  end: Date;
  power: number;
  frozenTemp: number;
  unfrozenTemp: number;
}
export class PeriodResult {
  start: Date;
  end: Date;
  duration: number;
  power: number;
  frozenTemp: number;
  unfrozenTemp: number;
  constructor(props: PeriodResultProps) {
    this.start = props.start;
    this.end = props.end;
    this.duration = differenceInSeconds(props.end, props.start) / 3600;
    this.power = props.power;
    this.frozenTemp = props.frozenTemp;
    this.unfrozenTemp = props.unfrozenTemp;
  }
}

export class PeriodExcelResult {
  public numberOfTCC: number = 0;
  public ratio: number = 0;
  public power: string = "";
  public unfrozen: number = 0;
  public frozen: number = 0;
}
export class SS2Result {
  periodX: PeriodResult;
  periodY: PeriodResult;
  xyResult: PeriodExcelResult;
  periodD: PeriodResult;
  periodF: PeriodResult;
  dfResult: PeriodExcelResult;
  Edf: number;
  Thdf: Tdf;
  TSS2: Tdf;
  PSS: number;
  PSS2: number;
  config: AnalyzeConfig;

  constructor(props: SS2ResultProps) {
    (this.periodX = props.periodX),
      (this.periodY = props.periodY),
      (this.periodD = props.periodD),
      (this.periodF = props.periodF),
      (this.Edf = props.Edf);
    this.Thdf = props.Thdf;
    this.TSS2 = props.TSS2;
    this.PSS = props.PSS;
    this.PSS2 = props.PSS2;
    this.config = props.config;
    this.xyResult = props.xyResult;
    this.dfResult = props.dfResult;
  }
}

export function detectDefrostRecovery(
  cycleData: CycleData[],
  powerData: number[]
): number[] {
  cycleData.forEach((cycle) => {
    cycle.max = -1;
  });
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
  console.log(defrostRecoveryCycleIndex);
  return defrostRecoveryCycleIndex;
}
function calcPeriodResult(
  rawData: ExcelData,
  timeData: Date[],
  startIndex: number,
  endIndex: number,
  powerIndex: number,
  evaluateFrozenIndex: number[],
  evaluateUnfrozenIndex: number[]
): PeriodResult {
  return new PeriodResult({
    start: timeData[startIndex],
    end: timeData[endIndex],
    power: getTestPeriodAverage(rawData, startIndex, endIndex, [powerIndex]),
    frozenTemp: getTestPeriodAverage(
      rawData,
      startIndex,
      endIndex,
      evaluateFrozenIndex
    ),
    unfrozenTemp: getTestPeriodAverage(
      rawData,
      startIndex,
      endIndex,
      evaluateUnfrozenIndex
    ),
  });
}

function getNumerator(
  config: AnalyzeConfig,
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
  config: AnalyzeConfig,
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
  config: AnalyzeConfig
) {
  console.log(firstDefrost, secondDefrost);
  let periodX = 0;
  let periodY = 0;

  for (let i = 0; i < cycleData.length; i++) {
    if (cycleData[i].index > firstDefrost) {
      firstDefrost = i - 1;
      break;
    }
  }

  for (let i = 0; i < cycleData.length; i++) {
    if (cycleData[i].index > secondDefrost) {
      secondDefrost = i - 1;
      break;
    }
  }

  let numberOfTCC = 4;
  const initialNumberOfTCC = numberOfTCC;

  let periodXBlock: number[] = [];
  let periodYBlock: number[] = [];
  let xBlockIndex: number[] = [];
  let yBlockIndex: number[] = [];

  for (let i = initialNumberOfTCC; i < 10; i++) {
    numberOfTCC = i;
    if (validatePeriod(cycleData, timeData, firstDefrost, numberOfTCC)) {
      periodX = firstDefrost - numberOfTCC;
    } else {
      continue;
    }

    if (validatePeriod(cycleData, timeData, secondDefrost, numberOfTCC)) {
      periodY = secondDefrost - numberOfTCC;
    } else {
      continue;
    }

    if (periodX === 0 && periodY === 0) {
      console.log("No matched!");
      continue;
    }

    let xBlock = [periodX, firstDefrost - 1];
    let yBlock = [periodY, secondDefrost - 1];

    xBlockIndex = [cycleData[xBlock[0]].index, cycleData[xBlock[1] + 1].index];
    yBlockIndex = [cycleData[yBlock[0]].index, cycleData[yBlock[1] + 1].index];

    if (!validateDuration(xBlockIndex, yBlockIndex, timeData)) {
      console.log("Invalid Duration!");
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
    break;
  }

  if (periodXBlock.length == 0 && periodYBlock.length == 0) {
    return [];
  }

  return [periodXBlock, periodYBlock, [numberOfTCC]];
}

function resultPeriodDF(
  firstDefrost: number,
  secondDefrost: number,
  cycleData: CycleData[],
  timeData: Date[],
  rawData: ExcelData,
  evaluateUnfrozenIndex: number[],
  evaluateFrozenIndex: number[],
  config: AnalyzeConfig
) {}
function getPeriodDF(
  firstDefrost: number,
  secondDefrost: number,
  cycleData: CycleData[],
  timeData: Date[],
  rawData: ExcelData,
  evaluateUnfrozenIndex: number[],
  evaluateFrozenIndex: number[],
  config: AnalyzeConfig
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
  let numberOfTCC = 3;
  for (let i = 3; i < 10; i++) {
    periodDBlock = findPeriodD(cycleData, timeData, nominalIndex, i);
    if (periodDBlock.length == 0) continue;
    periodFBlock = findPeriodF(cycleData, timeData, nominalIndex, i);
    if (periodFBlock.length == 0) continue;

    if (!validateDuration(periodDBlock, periodFBlock, timeData)) {
      console.log("DF, Duration is invalid");
      continue;
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
      console.log("DF, Spread Of Temperature is more than 0.5");
      continue;
    }

    if (!validateSpreadOfPower(rawData, periodDBlock, config, periodFBlock)) {
      console.log("DF, Spread of Power is invalid");
      continue;
    }

    let periodDStart = periodDBlock[0];
    if (differenceInSeconds(timeData[periodDStart], timeData[0]) <= 5 * 3600) {
      console.log("DF, Should be start after 5hr");
      continue;
    }

    if (secondDefrost && periodFBlock[1] > secondDefrost) {
      console.log("Period F should be end before next defrost");
      continue;
    }
    numberOfTCC = i;
    break;
  }
  if (periodDBlock.length == 0 && periodFBlock.length == 0) {
    return [];
  }

  return [periodDBlock, periodFBlock, [numberOfTCC]];
}
function calcEnergyConsumption(
  begin: number,
  end: number,
  rawData: ExcelData,
  timeData: Date[],
  config: AnalyzeConfig
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
  config: AnalyzeConfig
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
  config: AnalyzeConfig
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
  if (flag - deltaTCC <= 0) {
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
  console.log("Duration: ",ratio);
  return ratio >= 0.8 && ratio <= 1.25;
}

function resultSpreadOfTemp(
  xBlockIndex: number[],
  yBlockIndex: number[],
  rawData: ExcelData,
  evaludateIndex: number[]
) {
  // Spread Of Temperature
  let xBlcokTemp = getTestPeriodAverage(
    rawData,
    xBlockIndex[0],
    xBlockIndex[1],
    evaludateIndex
  );

  let yBlockTemp = getTestPeriodAverage(
    rawData,
    yBlockIndex[0],
    yBlockIndex[1],
    evaludateIndex
  );

  let temp = Math.abs(xBlcokTemp - yBlockTemp);
  return temp;
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
    xBlockIndex[0],
    xBlockIndex[1],
    evaluateUnfrozenIndex
  );

  let yBlockTemp = getTestPeriodAverage(
    rawData,
    yBlockIndex[0],
    yBlockIndex[1],
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
    xBlockIndex[0],
    xBlockIndex[1],
    evaluateFrozenIndex
  );

  yBlockTemp = getTestPeriodAverage(
    rawData,
    yBlockIndex[0],
    yBlockIndex[1],
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

function resultSpreadOfPower(
  rawData: ExcelData,
  xBlockIndex: number[],
  config: AnalyzeConfig,
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

  return `${spreadOfPower1 * 100}% and ${spreadOfPower2}W`;
}

function validateSpreadOfPower(
  rawData: ExcelData,
  xBlockIndex: number[],
  config: AnalyzeConfig,
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
      break;
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
  console.log("Cycle: ", periodDEndCycle, periodDStartCycle);
  for (let i = periodDStartCycle; i > 0; i--) {
    if (
      differenceInSeconds(
        timeData[cycleData[periodDEndCycle].index],
        timeData[cycleData[i].index]
      ) >
      3 * 3600
    ) {
      periodDStartCycle = i;
      break;
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
  console.log(periodDBlock, periodFBlock, index, duration);
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
  config: AnalyzeConfig,
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
