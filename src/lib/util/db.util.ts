import Database from '@tauri-apps/plugin-sql';

let db: Database;

export class SS1Config {
  id: number | undefined;
  name: string | undefined;
  config: string | undefined;
  createdAt: Date | undefined;
}

async function DB(): Promise<Database> {
  if (!db) {
    db = await Database.load("sqlite:lims.db");
  }
  return db;
}

export async function loadAll(): Promise<Array<SS1Config>> {
  const database = await DB();
  const configs = database.select<SS1Config[]>("select * from lims_config_ss1");
  return configs
}

export async function loadById(id: number): Promise<SS1Config> {
  const database = await DB();
  console.log(id);
  const config = await database.select<SS1Config[]>('select * from lims_config_ss1 where id = $1', [id]);
  return config[0];
}

export async function save(config: SS1Config) {
  const database = await DB();
  // exist by config.name
  const exist = await database.select<SS1Config[]>('select * from lims_config_ss1 where name = $1',[config.name]);
  if (exist.length > 0) {
    const result = database.execute("UPDATE lims_config_ss1 SET config = $1 WHERE name = $2", [config.config, config.name]);
    return;
  } else {
    const result = database.execute("INSERT INTO lims_config_ss1 (name, config) VALUES ($1, $2)", [config.name, config.config]);
  }
}
