import Database from "@tauri-apps/plugin-sql";
import type { Period, PeriodBlock } from "./iec.62552.3.ss2.util";
import type { CycleData } from "./iec.62552.3.util";

let db: Database;

export class SS1Config {
  id: number | undefined;
  name: string | undefined;
  config: string | undefined;
  createdAt: Date | undefined;
}

export class LimsResult {
  id: number | undefined;
  fileName: string | undefined;
  data: string | undefined;
  createdAt: Date | undefined;
}

export class ChartSettingConfig {
  cycleDate: CycleData[] = [];
  periodBlocks: PeriodBlock[] = [];
  ss1PeriodBlocks: PeriodBlock[] =[];
}

export class LimsConfig {
  id: number | undefined;
  fileName: string | undefined;
  createdAt: Date | undefined;
}

export class StorageResult {
  id: number | undefined;
  fileName: string | undefined;
  data: string  | undefined;
  createdAt: Date | undefined;
}
export class StorageConfig {
  id: number | undefined;
  fileName: string | undefined;
  createdAt: Date | undefined;
}
export class StorageSettingConfig {
  cycleData: CycleData[]= [];
  periodS: Period = {start: 0, end: 0};
  periodE: Period = {start: 0, end: 0};
}

async function DB(): Promise<Database> {
  if (!db) {
    db = await Database.load("sqlite:lims.db");
  }
  return db;
}

export async function loadAll(): Promise<Array<SS1Config>> {
  const database = await DB();
  const configs = database.select<SS1Config[]>("select * from lims_config_ss1 order by id desc");
  return configs;
}

export async function loadById(id: number): Promise<SS1Config> {
  const database = await DB();
  console.log(id);
  const config = await database.select<SS1Config[]>(
    "select * from lims_config_ss1 where id = $1",
    [id]
  );
  return config[0];
}

export async function save(config: SS1Config) {
  const database = await DB();
  // exist by config.name
  const exist = await database.select<SS1Config[]>(
    "select * from lims_config_ss1 where name = $1",
    [config.name]
  );
  if (exist.length > 0) {
    const result = database.execute(
      "UPDATE lims_config_ss1 SET config = $1 WHERE name = $2",
      [config.config, config.name]
    );
    return;
  } else {
    const result = database.execute(
      "INSERT INTO lims_config_ss1 (name, config) VALUES ($1, $2)",
      [config.name, config.config]
    );
  }
}

export async function loadChartConfigs(): Promise<LimsConfig[]> {
  const database = await DB();
  const configs = await database.select<LimsConfig[]>(
    "select id, fileName, createdAt from lims_result order by id desc"
  );
  console.log(configs);
  return configs;
}

export async function loadByFileName(
  fileName: string
): Promise<ChartSettingConfig | null> {
  const database = await DB();
  const chartDataSettingConfig = await database.select<LimsResult[]>(
    "select * from lims_result where fileName = $1",
    [fileName]
  );
  if (chartDataSettingConfig.length == 0) {
    return null;
  }
  const setting = chartDataSettingConfig[0];
  if (setting && setting.data) {
    return JSON.parse(setting.data) as ChartSettingConfig;
  }
  return null;
}

export async function saveLimsResult(
  fileName: string,
  data: ChartSettingConfig
) {
  console.log(fileName, data);
  const db = await DB();
  const config = await loadByFileName(fileName);
  console.log(config);
  if (config != null) {
    // update
    db.execute("UPDATE lims_result SET data = $1 WHERE fileName = $2", [
      JSON.stringify(data),
      fileName,
    ]);
    console.log("UPDATE DATA");
  } else {
    db.execute("INSERT INTO lims_result (fileName, data) VALUES ($1, $2)", [
      fileName,
      JSON.stringify(data),
    ]);
    console.log("INSERT DATA");
  }
}

export async function loadStorageChartConfigs(): Promise<StorageConfig[]> {
  const database = await DB();
  const configs = await database.select<StorageConfig[]>(
    "select id, fileName, createdAt from lims_storage_temperature order by id desc"
  );
  console.log(configs);
  return configs;
}

export async function loadStorageByFileName(
  fileName: string
): Promise<StorageSettingConfig | null> {
  const database = await DB();
  const chartDataSettingConfig = await database.select<StorageResult[]>(
    "select * from lims_storage_temperature where fileName = $1",
    [fileName]
  );
  if (chartDataSettingConfig.length == 0) {
    return null;
  }
  const setting = chartDataSettingConfig[0];
  if (setting && setting.data) {
    return JSON.parse(setting.data) as StorageSettingConfig;
  }
  return null;
}

export async function saveLimsStorageResult(
  fileName: string,
  data: StorageSettingConfig
) {
  console.log(fileName, data);
  const db = await DB();
  const config = await loadByFileName(fileName);
  console.log(config);
  if (config != null) {
    // update
    db.execute("UPDATE lims_storage_temperature SET data = $1 WHERE fileName = $2", [
      JSON.stringify(data),
      fileName,
    ]);
    console.log("UPDATE DATA");
  } else {
    db.execute("INSERT INTO lims_storage_temperature (fileName, data) VALUES ($1, $2)", [
      fileName,
      JSON.stringify(data),
    ]);
    console.log("INSERT DATA");
  }
}
