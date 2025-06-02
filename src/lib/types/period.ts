import type { ExcelData } from "$lib/util/excel.utils";

export interface CycleData {
  index: number;
  count: number;
  dateTime: Date;
  max: number;
}

export class Period {
  start: number = 0;
  end: number = 0;
  constructor(props: { start: number; end: number }) {
    this.start = props.start;
    this.end = props.end;
  }
}

export class PeriodDF {
  periodD: Period;
  periodF: Period;
  constructor(props: { periodD: Period; periodF: Period }) {
    this.periodD = props.periodD;
    this.periodF = props.periodF;
  }
}

export class PeriodXY {
  periodX: Period;
  periodY: Period;
  constructor(props: { periodX: Period; periodY: Period }) {
    this.periodX = props.periodX;
    this.periodY = props.periodY;
  }
}

export class Defrost {
  heaterOn: number = 0;
  RecoveryIndex: number = 0;
  nominalIndex: number = 0;
}

export class SS1Input {
  rawData: ExcelData;
  cycleData: CycleData[];
  numberOfTCC: number;
  periodD: Period;
  periodF: Period;
  defrosts: Defrost[] = [];
  constructor(props: {
    rawData: ExcelData;
    cycleData: CycleData[];
    numberOfTCC: number;
    periodDF: PeriodDF;
    defrosts: Defrost[];
  }) {
    this.rawData = props.rawData;
    this.cycleData = props.cycleData;
    this.numberOfTCC = props.numberOfTCC;
    this.periodD = props.periodDF.periodD;
    this.periodF = props.periodDF.periodF;
    this.defrosts = props.defrosts;
  }
}

export class SS2Input {
  rawData: ExcelData;
  cycleData: CycleData[] = [];
  periodX: Period;
  periodY: Period;
  periodD: Period;
  periodF: Period;
  defrosts: Defrost[];

  constructor(props: {
    rawData: ExcelData;
    cycleData: CycleData[];
    periodXY: PeriodXY;
    periodDF: PeriodDF;
    defrosts: Defrost[];
  }) {
    this.rawData = props.rawData;
    this.cycleData = props.cycleData;
    this.periodX = props.periodXY.periodX;
    this.periodY = props.periodXY.periodY;
    this.periodD = props.periodDF.periodD;
    this.periodF = props.periodDF.periodF;
    this.defrosts = props.defrosts;
  }
}

export class PeriodBlock {
  public periodD: Period = { start: 0, end: 0 };
  public periodF: Period = { start: 0, end: 0 };
  public periodX: Period = { start: 0, end: 0 };
  public periodY: Period = { start: 0, end: 0 };
  public heaterOn: number = 0;
  public defrostRecoveryIndex: number = 0;
  public nominalDefrostRecoveryIndex: number = 0;
  public checked: boolean = false;
  public lastPeriod: boolean = true;
}

function convertToPeriodBlock(
  defrosts: Defrost[],
  xy: PeriodXY,
  df: PeriodDF
) {}
