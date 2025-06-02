import {
  Period,
  PeriodBlock,
  SS2Input,
  type CycleData,
} from "$lib/types/period";
import { differenceInSeconds } from "date-fns";
import { get } from "svelte/store";
import {
  isTwoCompartment,
  isValidTV,
  selectedStore,
  type AnalyzeConfig,
} from "../store/selectedStore";
import { type ExcelData } from "./excel.utils";
import {
  ConstantTemperature,
  detectDefrostRecovery,
  getConstValue,
  getEvaluateFrozenIndex,
  getEvaluateUnfrozenIndex,
  getTestPeriodAverage,
  getTestPeriodAverageClosed,
  type Tdf,
} from "./iec.62552.3.util";
interface SS2ResultProps {
  xDuration: number;
  yDuration: number;
  xTCC: number;
  yTCC: number;
  xyRatio: number;
  xUnfrozenTemp: number;
  yUnfrozenTemp: number;
  xySpreadUnfrozenTemp: number;
  xFrozenTemp: number;
  yFrozenTemp: number;
  xySpreadFrozenTemp: number;
  xPower: number;
  yPower: number;
  xySpreadPowerPercent: number;
  xySpreadPowerWatt: number;
  xyEnergy: number;
  dDuration: number;
  fDuration: number;
  dTCC: number;
  fTCC: number;
  dfRatio: number;
  dNominalDuration: number;
  fNominalDuration: number;
  dUnfrozenTemp: number;
  fUnfrozenTemp: number;
  dfSpreadUnfrozenTemp: number;
  dFrozenTemp: number;
  fFrozenTemp: number;
  dfSpreadFrozenTemp: number;
  dPower: number;
  fPower: number;
  dfSpreadPowerPercent: number;
  dfSpreadPowerWatt: number;
  previousDefrostPeriodDDuration?: number;
  Edf: number;
  Thdf: Tdf;
  PSS2: number;
  TSS2: Tdf;
  Tat: number;
  Tam: number;
  c1: number;
  c2: number;
  deltaCop: number;
  PSS: number;
}
export class SS2Result {
  xDuration: number;
  yDuration: number;
  xTCC: number;
  yTCC: number;
  xyRatio: number;
  xUnfrozenTemp: number;
  yUnfrozenTemp: number;
  xySpreadUnfrozenTemp: number;
  xFrozenTemp: number;
  yFrozenTemp: number;
  xySpreadFrozenTemp: number;
  xPower: number;
  yPower: number;
  xySpreadPowerPercent: number;
  xySpreadPowerWatt: number;
  xyEnergy: number;
  dDuration: number;
  fDuration: number;
  dTCC: number;
  fTCC: number;
  dfRatio: number;
  dNominalDuration: number;
  fNominalDuration: number;
  dUnfrozenTemp: number;
  fUnfrozenTemp: number;
  dfSpreadUnfrozenTemp: number;
  dFrozenTemp: number;
  fFrozenTemp: number;
  dfSpreadFrozenTemp: number;
  dPower: number;
  fPower: number;
  dfSpreadPowerPercent: number;
  dfSpreadPowerWatt: number;
  previousDefrostPeriodDDuration?: number;
  Edf: number;
  Thdf: Tdf;
  PSS2: number;
  TSS2: Tdf;
  Tat: number;
  Tam: number;
  c1: number;
  c2: number;
  deltaCop: number;
  PSS: number;

  constructor(props: SS2ResultProps) {
    this.xDuration = props.xDuration;
    this.yDuration = props.yDuration;
    this.xTCC = props.xTCC;
    this.yTCC = props.yTCC;
    this.xyRatio = props.xyRatio;
    this.xUnfrozenTemp = props.xUnfrozenTemp;
    this.yUnfrozenTemp = props.yUnfrozenTemp;
    this.xySpreadUnfrozenTemp = props.xySpreadUnfrozenTemp;
    this.xFrozenTemp = props.xFrozenTemp;
    this.yFrozenTemp = props.yFrozenTemp;
    this.xySpreadFrozenTemp = props.xySpreadFrozenTemp;
    this.xPower = props.xPower;
    this.yPower = props.yPower;
    this.xySpreadPowerPercent = props.xySpreadPowerPercent;
    this.xySpreadPowerWatt = props.xySpreadPowerWatt;
    this.xyEnergy = props.xyEnergy;
    this.dDuration = props.dDuration;
    this.fDuration = props.fDuration;
    this.dTCC = props.dTCC;
    this.fTCC = props.fTCC;
    this.dfRatio = props.dfRatio;
    this.dNominalDuration = props.dNominalDuration;
    this.fNominalDuration = props.fNominalDuration;
    this.dUnfrozenTemp = props.dUnfrozenTemp;
    this.fUnfrozenTemp = props.fUnfrozenTemp;
    this.dfSpreadUnfrozenTemp = props.dfSpreadUnfrozenTemp;
    this.dFrozenTemp = props.dFrozenTemp;
    this.fFrozenTemp = props.fFrozenTemp;
    this.dfSpreadFrozenTemp = props.dfSpreadFrozenTemp;
    this.dPower = props.dPower;
    this.fPower = props.fPower;
    this.dfSpreadPowerPercent = props.dfSpreadPowerPercent;
    this.dfSpreadPowerWatt = props.dfSpreadPowerWatt;
    this.Edf = props.Edf;
    this.Thdf = props.Thdf;
    this.PSS2 = props.PSS2;
    this.TSS2 = props.TSS2;
    this.Tat = props.Tat;
    this.Tam = props.Tam;
    this.c1 = props.c1;
    this.c2 = props.c2;
    this.deltaCop = props.deltaCop;
    this.PSS = props.PSS;
    this.previousDefrostPeriodDDuration =
      props.previousDefrostPeriodDDuration ?? -1;
  }
}

export function runSS2_manual_migration(input: SS2Input): SS2Result | null {
  const config = get(selectedStore);
  const cycleData = input.cycleData;
  const rawData = input.rawData;

  const timeData = rawData.map((row) => new Date(row[config.xAxis] as string));
  const evaluateFrozenIndex = getEvaluateFrozenIndex(config);
  const evaluateUnfrozenIndex = getEvaluateUnfrozenIndex(config);

  const periodX = input.periodX;
  const periodY = input.periodY;
  const periodD = input.periodD;
  const periodF = input.periodF;

  if (input.defrosts.length < 2) {
    alert("There are only one defrost!!!");
    return null;
  }

  const nominalIndex = input.defrosts[1].nominalIndex;
  const heaterOn = input.defrosts[0].heaterOn;

  const xDuration =
    differenceInSeconds(timeData[periodX.end], timeData[periodX.start]) / 3600;
  const yDuration =
    differenceInSeconds(timeData[periodY.end], timeData[periodY.start]) / 3600;
  const xTCC = cycleData.filter(
    (cycle) => cycle.index >= periodX.start && cycle.index < periodX.end
  ).length;
  const yTCC = cycleData.filter(
    (cycle) => cycle.index >= periodY.start && cycle.index < periodY.end
  ).length;
  const xyRatio = xDuration / yDuration;

  const xUnfrozenTemp = getTestPeriodAverage(
    rawData,
    periodX.start,
    periodX.end,
    evaluateUnfrozenIndex
  );
  const yUnfrozenTemp = getTestPeriodAverage(
    rawData,
    periodY.start,
    periodY.end,
    evaluateUnfrozenIndex
  );
  const xySpreadUnfrozenTemp = Math.abs(xUnfrozenTemp - yUnfrozenTemp);

  const xFrozenTemp = getTestPeriodAverage(
    rawData,
    periodX.start,
    periodX.end,
    evaluateFrozenIndex
  );
  const yFrozenTemp = getTestPeriodAverage(
    rawData,
    periodY.start,
    periodY.end,
    evaluateFrozenIndex
  );
  const xySpreadFrozenTemp = Math.abs(xFrozenTemp - yFrozenTemp);

  const xPower = getTestPeriodAverage(rawData, periodX.start, periodX.end, [
    config.power,
  ]);
  const yPower = getTestPeriodAverage(rawData, periodY.start, periodY.end, [
    config.power,
  ]);

  const xySpreadPowerPercent =
    Math.abs(yPower - xPower) / ((xPower + yPower) / 2);
  const xySpreadPowerWatt = Math.abs(yPower - xPower);

  const dDuration =
    differenceInSeconds(timeData[periodD.end], timeData[periodD.start]) / 3600;
  const fDuration =
    differenceInSeconds(timeData[periodF.end], timeData[periodF.start]) / 3600;
  const dTCC = cycleData.filter(
    (cycle) => cycle.index >= periodD.start && cycle.index < periodD.end
  ).length;
  const fTCC = cycleData.filter(
    (cycle) => cycle.index >= periodF.start && cycle.index < periodF.end
  ).length;
  const dfRatio = dDuration / fDuration;

  const dNominalDuration =
    differenceInSeconds(timeData[nominalIndex], timeData[periodD.end]) / 3600;
  const fNominalDuration =
    differenceInSeconds(timeData[periodF.start], timeData[nominalIndex]) / 3600;

  const dUnfrozenTemp = getTestPeriodAverage(
    rawData,
    periodD.start,
    periodD.end,
    evaluateUnfrozenIndex
  );
  const fUnfrozenTemp = getTestPeriodAverage(
    rawData,
    periodF.start,
    periodF.end,
    evaluateFrozenIndex
  );
  const dfSpreadUnfrozenTemp = Math.abs(dUnfrozenTemp - fUnfrozenTemp);

  const dFrozenTemp = getTestPeriodAverage(
    rawData,
    periodD.start,
    periodD.end,
    evaluateFrozenIndex
  );
  const fFrozenTemp = getTestPeriodAverage(
    rawData,
    periodF.start,
    periodF.end,
    evaluateFrozenIndex
  );
  const dfSpreadFrozenTemp = Math.abs(dFrozenTemp - fFrozenTemp);

  const dPower = getTestPeriodAverage(rawData, periodD.start, periodD.end, [
    config.power,
  ]);
  const fPower = getTestPeriodAverage(rawData, periodF.start, periodF.end, [
    config.power,
  ]);

  const dfSpreadPowerPercent =
    Math.abs(fPower - dPower) / ((fPower + dPower) / 2);
  const dfSpreadPowerWatt = Math.abs(fPower - dPower);

  const Edf = calcEdf(
    [periodD.start, periodD.end],
    [periodF.start, periodF.end],
    cycleData,
    rawData,
    timeData,
    config
  );

  const Thdf = calcThdf(
    [periodD.start, periodD.end],
    [periodF.start, periodF.end],
    rawData,
    timeData,
    evaluateUnfrozenIndex,
    evaluateFrozenIndex,
    config
  );

  const xyEnergy = calcEnergyConsumption(
    periodX.start,
    periodY.end,
    rawData,
    timeData,
    config
  );

  const PSS2 =
    (xyEnergy - Edf) /
    (differenceInSeconds(timeData[periodY.end], timeData[periodX.start]) /
      3600);

  const TSS2 = calcTSS2(
    config,
    rawData,
    timeData,
    periodX.start,
    periodY.end,
    Thdf
  );

  const constV = getConstValue(config.targetAmbient);

  const Tat = constV.Tat;
  const Tam = getTestPeriodAverage(
    rawData,
    periodX.start,
    periodY.end,
    config.ambient
  );
  const c1 = constV.c1;
  const c2 = constV.c2;

  const deno = calcDenominator(config, Tat, TSS2, c1, c2);
  const numer = calcNumerator(config, TSS2, c1, c2);

  const deltaCop = isTwoCompartment(config)
    ? constV.deltaCopTwo
    : constV.deltaCopOne;

  const PSS =
    PSS2 *
    (1 + (Tat - Tam) * (numer / deno)) *
    (1 / (1 + (Tat - Tam) * deltaCop));

  let previousDuration = 0;
  previousDuration =
    differenceInSeconds(timeData[periodD.start], timeData[heaterOn]) / 3600;
  const result = new SS2Result({
    xDuration,
    yDuration,
    xTCC,
    yTCC,
    xyRatio,
    xUnfrozenTemp,
    yUnfrozenTemp,
    xySpreadUnfrozenTemp,
    xFrozenTemp,
    yFrozenTemp,
    xySpreadFrozenTemp,
    xPower,
    yPower,
    xySpreadPowerPercent,
    xySpreadPowerWatt,
    dDuration,
    fDuration,
    dTCC,
    fTCC,
    dfRatio,
    dNominalDuration,
    fNominalDuration,
    dUnfrozenTemp,
    fUnfrozenTemp,
    dfSpreadUnfrozenTemp,
    dFrozenTemp,
    fFrozenTemp,
    dfSpreadFrozenTemp,
    dPower,
    fPower,
    dfSpreadPowerPercent,
    dfSpreadPowerWatt,
    Edf,
    Thdf,
    xyEnergy,
    PSS2,
    TSS2,
    Tat,
    Tam,
    c1,
    c2,
    deltaCop,
    PSS,
    previousDefrostPeriodDDuration: previousDuration,
  });

  return result;
}

export function runSS2_manual(
  rawData: ExcelData,
  cycleData: CycleData[],
  periodBlocks: PeriodBlock[]
): SS2Result | null {
  const block: PeriodBlock | undefined = periodBlocks.find(
    (block) => block.checked
  );
  if (!block) {
    console.log(periodBlocks);
    alert("No checked block");
    return null;
  }

  if (
    block.periodX.start < 0 &&
    block.periodY.start < 0 &&
    block.periodD.start < 0 &&
    block.periodF.start < 0 &&
    block.periodX.end < 0 &&
    block.periodY.end < 0 &&
    block.periodD.end < 0 &&
    block.periodF.end < 0
  ) {
    alert("Not valid");
    return null;
  }

  const config = get(selectedStore);

  const timeData = rawData.map((row) => new Date(row[config.xAxis] as string));
  const evaluateFrozenIndex = getEvaluateFrozenIndex(config);
  const evaluateUnfrozenIndex = getEvaluateUnfrozenIndex(config);

  const periodX = block.periodX;
  const periodY = block.periodY;
  const periodD = block.periodD;
  const periodF = block.periodF;
  const nominalIndex = block.nominalDefrostRecoveryIndex;

  const xDuration =
    differenceInSeconds(timeData[periodX.end + 1], timeData[periodX.start]) /
    3600;
  const yDuration =
    differenceInSeconds(timeData[periodY.end + 1], timeData[periodY.start]) /
    3600;
  const xTCC = cycleData.filter(
    (cycle) => cycle.index >= periodX.start && cycle.index < periodX.end
  ).length;
  const yTCC = cycleData.filter(
    (cycle) => cycle.index >= periodY.start && cycle.index < periodY.end
  ).length;
  const xyRatio = xDuration / yDuration;

  const xUnfrozenTemp = getTestPeriodAverageClosed(
    rawData,
    periodX.start,
    periodX.end,
    evaluateUnfrozenIndex
  );
  const yUnfrozenTemp = getTestPeriodAverageClosed(
    rawData,
    periodY.start,
    periodY.end,
    evaluateUnfrozenIndex
  );
  const xySpreadUnfrozenTemp = Math.abs(xUnfrozenTemp - yUnfrozenTemp);

  const xFrozenTemp = getTestPeriodAverageClosed(
    rawData,
    periodX.start,
    periodX.end,
    evaluateFrozenIndex
  );
  const yFrozenTemp = getTestPeriodAverageClosed(
    rawData,
    periodY.start,
    periodY.end,
    evaluateFrozenIndex
  );
  const xySpreadFrozenTemp = Math.abs(xFrozenTemp - yFrozenTemp);

  const xPower = getTestPeriodAverageClosed(
    rawData,
    periodX.start,
    periodX.end,
    [config.power]
  );
  const yPower = getTestPeriodAverageClosed(
    rawData,
    periodY.start,
    periodY.end,
    [config.power]
  );

  const xySpreadPowerPercent =
    Math.abs(yPower - xPower) / ((xPower + yPower) / 2);
  const xySpreadPowerWatt = Math.abs(yPower - xPower);

  const dDuration =
    differenceInSeconds(timeData[periodD.end], timeData[periodD.start]) / 3600;
  const fDuration =
    differenceInSeconds(timeData[periodF.end], timeData[periodF.start]) / 3600;
  const dTCC = cycleData.filter(
    (cycle) => cycle.index >= periodD.start && cycle.index < periodD.end
  ).length;
  const fTCC = cycleData.filter(
    (cycle) => cycle.index >= periodF.start && cycle.index < periodF.end
  ).length;
  const dfRatio = dDuration / fDuration;

  const dNominalDuration =
    differenceInSeconds(timeData[nominalIndex], timeData[periodD.end]) / 3600;
  const fNominalDuration =
    differenceInSeconds(timeData[periodF.start], timeData[nominalIndex]) / 3600;

  const dUnfrozenTemp = getTestPeriodAverageClosed(
    rawData,
    periodD.start,
    periodD.end,
    evaluateUnfrozenIndex
  );
  const fUnfrozenTemp = getTestPeriodAverageClosed(
    rawData,
    periodF.start,
    periodF.end,
    evaluateUnfrozenIndex
  );
  const dfSpreadUnfrozenTemp = Math.abs(dUnfrozenTemp - fUnfrozenTemp);

  const dFrozenTemp = getTestPeriodAverageClosed(
    rawData,
    periodD.start,
    periodD.end,
    evaluateFrozenIndex
  );
  const fFrozenTemp = getTestPeriodAverageClosed(
    rawData,
    periodF.start,
    periodF.end,
    evaluateFrozenIndex
  );
  const dfSpreadFrozenTemp = Math.abs(dFrozenTemp - fFrozenTemp);

  const dPower = getTestPeriodAverageClosed(
    rawData,
    periodD.start,
    periodD.end,
    [config.power]
  );
  const fPower = getTestPeriodAverageClosed(
    rawData,
    periodF.start,
    periodF.end,
    [config.power]
  );

  const dfSpreadPowerPercent =
    Math.abs(fPower - dPower) / ((fPower + dPower) / 2);
  const dfSpreadPowerWatt = Math.abs(fPower - dPower);

  const Edf = calcEdf(
    [periodD.start, periodD.end],
    [periodF.start, periodF.end],
    cycleData,
    rawData,
    timeData,
    config
  );

  const Thdf = calcThdf(
    [periodD.start, periodD.end],
    [periodF.start, periodF.end],
    rawData,
    timeData,
    evaluateUnfrozenIndex,
    evaluateFrozenIndex,
    config
  );

  const xyEnergy = calcEnergyConsumption(
    periodX.start,
    periodY.end,
    rawData,
    timeData,
    config
  );

  const PSS2 =
    (xyEnergy - Edf) /
    (differenceInSeconds(timeData[periodY.end], timeData[periodX.start]) /
      3600);

  const TSS2 = calcTSS2(
    config,
    rawData,
    timeData,
    periodX.start,
    periodY.end,
    Thdf
  );

  const constV = getConstValue(config.targetAmbient);

  const Tat = constV.Tat;
  const Tam = getTestPeriodAverageClosed(
    rawData,
    periodX.start,
    periodY.end,
    config.ambient
  );
  const c1 = constV.c1;
  const c2 = constV.c2;

  const deno = calcDenominator(config, Tat, TSS2, c1, c2);
  const numer = calcNumerator(config, TSS2, c1, c2);

  const deltaCop = isTwoCompartment(config)
    ? constV.deltaCopTwo
    : constV.deltaCopOne;

  const PSS =
    PSS2 *
    (1 + (Tat - Tam) * (numer / deno)) *
    (1 / (1 + (Tat - Tam) * deltaCop));

  let blockIndex = periodBlocks.findIndex((block) => block.checked);
  let previousDuration = 0;
  if (blockIndex > 0) {
    previousDuration =
      differenceInSeconds(
        timeData[periodBlocks[blockIndex].periodD.start],
        timeData[periodBlocks[blockIndex - 1].heaterOn]
      ) / 3600;
  } else {
    previousDuration =
      differenceInSeconds(
        timeData[periodBlocks[blockIndex].periodD.start],
        timeData[0]
      ) / 3600;
  }
  const result = new SS2Result({
    xDuration,
    yDuration,
    xTCC,
    yTCC,
    xyRatio,
    xUnfrozenTemp,
    yUnfrozenTemp,
    xySpreadUnfrozenTemp,
    xFrozenTemp,
    yFrozenTemp,
    xySpreadFrozenTemp,
    xPower,
    yPower,
    xySpreadPowerPercent,
    xySpreadPowerWatt,
    dDuration,
    fDuration,
    dTCC,
    fTCC,
    dfRatio,
    dNominalDuration,
    fNominalDuration,
    dUnfrozenTemp,
    fUnfrozenTemp,
    dfSpreadUnfrozenTemp,
    dFrozenTemp,
    fFrozenTemp,
    dfSpreadFrozenTemp,
    dPower,
    fPower,
    dfSpreadPowerPercent,
    dfSpreadPowerWatt,
    Edf,
    Thdf,
    xyEnergy,
    PSS2,
    TSS2,
    Tat,
    Tam,
    c1,
    c2,
    deltaCop,
    PSS,
    previousDefrostPeriodDDuration: previousDuration,
  });

  return result;
}

export function getSS1DefrostRecoveryPeriod(
  rawData: ExcelData,
  cycleData: CycleData[],
  config: AnalyzeConfig
): PeriodBlock[] {
  let powerData = rawData.map((row) => row[config.power] as number);
  let timeData = rawData.map((row) => new Date(row[config.xAxis] as string));
  let heaterOnIndexes = detectDefrostRecovery(powerData, cycleData);
  let evaluateUnfrozenIndex = getEvaluateUnfrozenIndex(config);
  let evaluateFrozenIndex = getEvaluateFrozenIndex(config);

  if (heaterOnIndexes.length < 2) {
    return [];
  }

  let result: PeriodBlock[] = [];

  for (let i = 0; i < heaterOnIndexes.length; i++) {
    const firstDefrost = heaterOnIndexes[i];
    // const secondDefrost = heaterOnIndexes[i + 1];

    let periodDF = getPeriodDF(
      firstDefrost,
      -1,
      cycleData,
      timeData,
      rawData,
      evaluateUnfrozenIndex,
      evaluateFrozenIndex,
      config
    );

    if (periodDF.length == 0) {
      continue;
    }

    let nominalIndex = firstDefrost;
    for (let i = firstDefrost; i < timeData.length; i++) {
      if (differenceInSeconds(timeData[i], timeData[firstDefrost]) > 2 * 3600) {
        nominalIndex = i;
        break;
      }
    }

    let periodBlock = new PeriodBlock();
    periodBlock.heaterOn = firstDefrost;

    for (let i = 0; i < cycleData.length; i++) {
      if (cycleData[i].index > firstDefrost) {
        periodBlock.defrostRecoveryIndex = cycleData[i].index;
        break;
      }
    }

    periodBlock.periodX = new Period({
      start: 0,
      end: 0,
    });
    periodBlock.periodY = new Period({
      start: 0,
      end: 0,
    });
    periodBlock.periodD = new Period({
      start: periodDF[0][0],
      end: periodDF[0][1] - 1,
    });
    periodBlock.periodF = new Period({
      start: periodDF[1][0],
      end: periodDF[1][1] - 1,
    });
    periodBlock.nominalDefrostRecoveryIndex = nominalIndex;
    periodBlock.lastPeriod = false;
    result.push(periodBlock);
  }
  result = [new PeriodBlock(), ...result];
  result = result.filter((block) => {
    if (
      block.periodX.start >= 0 &&
      block.periodY.start >= 0 &&
      block.periodD.start >= 0 &&
      block.periodF.start >= 0 &&
      block.periodX.end >= 0 &&
      block.periodY.end >= 0 &&
      block.periodD.end >= 0 &&
      block.periodF.end >= 0
    ) {
      return true;
    }
  });
  result[result.length - 1].lastPeriod = true;
  if (result.length > 2) {
    result[1].checked = true;
  } else {
    result[result.length - 1].checked = true;
  }
  return result;
}

export function getDefrostRecoveryPeriod(
  rawData: ExcelData,
  cycleData: CycleData[],
  config: AnalyzeConfig
) {
  let periodBlocks = getSS1DefrostRecoveryPeriod(rawData, cycleData, config);
  let mainBlock = new PeriodBlock();
  if (periodBlocks.length > 1) {
    mainBlock = periodBlocks[1];
  }
}

export function getAutoDefrostRecoveryPeriod(
  rawData: ExcelData,
  cycleData: CycleData[],
  config: AnalyzeConfig
): PeriodBlock[] {
  let powerData = rawData.map((row) => row[config.power] as number);
  let timeData = rawData.map((row) => new Date(row[config.xAxis] as string));
  let defrostRecoveryCycleIndex = detectDefrostRecovery(powerData, cycleData);
  let evaluateUnfrozenIndex = getEvaluateUnfrozenIndex(config);
  let evaluateFrozenIndex = getEvaluateFrozenIndex(config);

  if (defrostRecoveryCycleIndex.length < 2) {
    return [];
  }

  let result: PeriodBlock[] = [];

  for (let i = 0; i < defrostRecoveryCycleIndex.length - 1; i++) {
    const firstDefrost = defrostRecoveryCycleIndex[i];
    const secondDefrost = defrostRecoveryCycleIndex[i + 1];
    // console.log("First Defrost", firstDefrost);
    // console.log("Second Defrost", secondDefrost);

    let periodDF = getPeriodDF(
      firstDefrost,
      -1,
      cycleData,
      timeData,
      rawData,
      evaluateUnfrozenIndex,
      evaluateFrozenIndex,
      config
    );

    if (periodDF.length == 0) {
      continue;
    }

    let nominalIndex = firstDefrost;
    for (let i = firstDefrost; i < timeData.length; i++) {
      if (differenceInSeconds(timeData[i], timeData[firstDefrost]) > 2 * 3600) {
        nominalIndex = i;
        break;
      }
    }

    let periodBlock = new PeriodBlock();
    periodBlock.heaterOn = firstDefrost;

    for (let i = 0; i < cycleData.length; i++) {
      if (cycleData[i].index > firstDefrost) {
        periodBlock.defrostRecoveryIndex = cycleData[i].index;
        break;
      }
    }

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

    if (periodXY.length !== 0) {
      periodBlock.periodX = new Period({
        start: periodXY[0][0],
        end: periodXY[0][1] - 1,
      });
      periodBlock.periodY = new Period({
        start: periodXY[1][0],
        end: periodXY[1][1] - 1,
      });
    } else {
      periodBlock.periodX = new Period({
        start: 1,
        end: 2,
      });
      periodBlock.periodY = new Period({
        start: 1,
        end: 2,
      });
    }

    periodBlock.periodD = new Period({
      start: periodDF[0][0],
      end: periodDF[0][1] - 1,
    });
    periodBlock.periodF = new Period({
      start: periodDF[1][0],
      end: periodDF[1][1] - 1,
    });
    periodBlock.nominalDefrostRecoveryIndex = nominalIndex;
    periodBlock.lastPeriod = false;
    result.push(periodBlock);
  }

  result = [new PeriodBlock(), ...result];
  result = result.filter((block) => {
    if (
      block.periodX.start >= 0 &&
      block.periodY.start >= 0 &&
      block.periodD.start >= 0 &&
      block.periodF.start >= 0 &&
      block.periodX.end >= 0 &&
      block.periodY.end >= 0 &&
      block.periodD.end >= 0 &&
      block.periodF.end >= 0
    ) {
      return true;
    }
  });
  result[result.length - 1].lastPeriod = true;
  if (result.length > 2) {
    result[1].checked = true;
  } else {
    result[result.length - 1].checked = true;
  }
  return result;
}

function calcNumerator(
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
function calcDenominator(
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
    const shift = 1;
    if (validatePeriod(cycleData, timeData, firstDefrost - 1, numberOfTCC)) {
      periodX = firstDefrost - numberOfTCC - shift;
    } else {
      continue;
    }

    if (validatePeriod(cycleData, timeData, secondDefrost - 1, numberOfTCC)) {
      periodY = secondDefrost - numberOfTCC - shift;
    } else {
      continue;
    }

    if (periodX === 0 && periodY === 0) {
      console.log("No matched!");
      continue;
    }

    let xBlock = [periodX, firstDefrost - 1];
    let yBlock = [periodY, secondDefrost - 1];

    xBlockIndex = [cycleData[xBlock[0]].index, cycleData[xBlock[1]].index];
    yBlockIndex = [cycleData[yBlock[0]].index, cycleData[yBlock[1]].index];

    for (let i = 0; i < 100; i++) {
      if (differenceInSeconds(yBlockIndex[1], xBlockIndex[1]) < 48 * 3600) {
        break;
      }
      if (firstDefrost > yBlockIndex[0]) {
        break;
      }
      yBlockIndex[0] = cycleData[yBlock[0] - i].index;
      yBlockIndex[1] = cycleData[yBlock[1] - i].index;

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
        continue;
      }

      if (!validateSpreadOfPower(rawData, xBlockIndex, config, yBlockIndex)) {
        continue;
      }
      break;
    }

    // if (differenceInSeconds(timeData[yBlockIndex[1]], timeData[xBlockIndex[1]]) > 48 * 3600) {
    //   // handle edge case
    //   for (let i = 0; i < 100; i++) {
    //     yBlock = [yBlock[0] - 1, yBlock[1] - 1];
    //     if (
    //       differenceInSeconds(
    //         cycleData[yBlock[1]].dateTime,
    //         cycleData[xBlock[1]].dateTime
    //       ) <
    //         48 * 3600 &&
    //       validatePeriod(cycleData, timeData, yBlock[1], numberOfTCC)
    //     ) {
    //       yBlockIndex = [
    //         cycleData[yBlock[0]].index,
    //         cycleData[yBlock[1] + 1].index,
    //       ];
    //       yBlock = []
    //       break;
    //     }
    //   }
    // }

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

    if (secondDefrost == -1) {
      break;
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
  let EnergyEndFMinusEnergyEndX: number = 0;
  if (config.integPower) {
    //@ts-ignore
    EnergyEndFMinusEnergyEndX = ((rawData[periodFBlock[1]][
      config.integPower
    ] as number) -
      //@ts-ignore
      rawData[periodDBlock[0]][config.integPower]) as number;
  } else {
    for (let i = periodDBlock[0]; i < periodFBlock[1]; i++) {
      EnergyEndFMinusEnergyEndX +=
        ((rawData[i][config.power] as number) *
          differenceInSeconds(timeData[i + 1], timeData[i])) /
        3600;
    }
  }

  const dPower = getTestPeriodAverage(
    rawData,
    periodDBlock[0],
    periodDBlock[1] + 1,
    [config.power]
  );
  const fPower = getTestPeriodAverage(
    rawData,
    periodFBlock[0],
    periodFBlock[1] + 1,
    [config.power]
  );
  const dfDuration =
    differenceInSeconds(timeData[periodFBlock[1]], timeData[periodDBlock[0]]) /
    3600;
  console.log(EnergyEndFMinusEnergyEndX, fPower, dPower, dfDuration);
  let Edf = EnergyEndFMinusEnergyEndX - ((fPower + dPower) / 2) * dfDuration;
  console.log(Edf);
  return Edf;
}
function calcThdf(
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
  let unfrozenT = calcTSS2i(
    rawData,
    periodDBlock,
    periodFBlock,
    evaluateUnfrozenIndex,
    duration
  );

  let frozenT = calcTSS2i(
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
  rtn.evaluateUnfrozen = unfrozenT;
  if (isValidTV(config.freshFood)) {
    rtn.freshFood = calcTSS2i(
      rawData,
      periodDBlock,
      periodFBlock,
      config.freshFood.temp,
      duration
    );
  }
  if (isValidTV(config.cellar)) {
    rtn.cellar = calcTSS2i(
      rawData,
      periodDBlock,
      periodFBlock,
      config.cellar.temp,
      duration
    );
  }
  if (isValidTV(config.pantry)) {
    rtn.pantry = calcTSS2i(
      rawData,
      periodDBlock,
      periodFBlock,
      config.pantry.temp,
      duration
    );
  }
  if (isValidTV(config.wineStorage)) {
    rtn.wineStorage = calcTSS2i(
      rawData,
      periodDBlock,
      periodFBlock,
      config.wineStorage.temp,
      duration
    );
  }
  if (isValidTV(config.chill)) {
    rtn.chill = calcTSS2i(
      rawData,
      periodDBlock,
      periodFBlock,
      config.chill.temp,
      duration
    );
  }
  if (isValidTV(config.frozenZeroStar)) {
    rtn.frozenZeroStar = calcTSS2i(
      rawData,
      periodDBlock,
      periodFBlock,
      config.frozenZeroStar.temp,
      duration
    );
  }
  if (isValidTV(config.frozenOneStar)) {
    rtn.frozenOneStar = calcTSS2i(
      rawData,
      periodDBlock,
      periodFBlock,
      config.frozenOneStar.temp,
      duration
    );
  }
  if (isValidTV(config.frozenTwoStar)) {
    rtn.frozenTwoStar = calcTSS2i(
      rawData,
      periodDBlock,
      periodFBlock,
      config.frozenTwoStar.temp,
      duration
    );
  }
  if (isValidTV(config.frozenThreeStar)) {
    rtn.frozenThreeStar = calcTSS2i(
      rawData,
      periodDBlock,
      periodFBlock,
      config.frozenThreeStar.temp,
      duration
    );
  }
  if (isValidTV(config.frozenFourStar)) {
    rtn.frozenFourStar = calcTSS2i(
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
  let endIndex = cycleData[xBlock[1]].index;
  let duration = differenceInSeconds(timeData[endIndex], timeData[startIndex]);
  return duration >= 4 * 3600;
}
function validateDuration(
  xBlock: number[],
  yBlock: number[],
  timeData: Date[]
) {
  const ratio =
    differenceInSeconds(timeData[xBlock[1]], timeData[xBlock[0]]) /
    differenceInSeconds(timeData[yBlock[1]], timeData[yBlock[0]]);
  console.log("Duration: ", ratio);
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
  let xBlockTemp = getTestPeriodAverage(
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

  let spreadOfUnfrozenTemp = Math.abs(xBlockTemp - yBlockTemp);
  if (spreadOfUnfrozenTemp >= 0.5) {
    console.log(
      "Unfrozen Spread Of Temperature is more than 0.5",
      spreadOfUnfrozenTemp
    );
    return false;
  }

  xBlockTemp = getTestPeriodAverage(
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

  let spreadOfFrozenTemp = Math.abs(xBlockTemp - yBlockTemp);

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
      periodDEndCycle = i - 1;
      break;
    }

    let length = differenceInSeconds(
      timeData[nominalIndex],
      timeData[cycleData[i].index]
    );
    if (length < 3 * 3600) {
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
  if (numberOfTCC < 3) {
    numberOfTCC = 3;
  }
  let periodFStartCycle = 0;
  for (let i = 0; i < cycleData.length; i++) {
    if (cycleData[i].index < nominalIndex) continue;
    if (
      differenceInSeconds(
        timeData[cycleData[i].index],
        timeData[nominalIndex]
      ) >
      3 * 3600
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
      ) >
      3 * 3600
    ) {
      periodFEndCycle = i;
      break;
    }
  }

  return [cycleData[periodFStartCycle].index, cycleData[periodFEndCycle].index];
}
function calcTSS2i(
  rawData: ExcelData,
  periodDBlock: number[],
  periodFBlock: number[],
  index: number[],
  duration: number
) {
  return (
    duration *
    (getTestPeriodAverageClosed(
      rawData,
      periodDBlock[0],
      periodFBlock[1],
      index
    ) -
      (getTestPeriodAverageClosed(
        rawData,
        periodFBlock[0],
        periodFBlock[1],
        index
      ) +
        getTestPeriodAverageClosed(
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
