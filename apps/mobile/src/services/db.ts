import { HistoryInfo } from "@/type";
import { openDatabaseSync } from "expo-sqlite";
import { minVersion, appVersion } from "./info";
import { formatVersion } from "@/utils/format";

export const db = openDatabaseSync(__DEV__ ? "test.sqlite" : "db.sqlite");

const dbName = "history";

db.execSync(
  `
  CREATE TABLE IF NOT EXISTS ${dbName} (
    id TEXT PRIMARY KEY,
    version INTEGER,
    data TEXT
  )
  `,
);

interface Row {
  id: string;
  version: number;
  data: string;
}

//查询
export const select = async (): Promise<HistoryInfo[]> => {
  const res: Row[] = await db.getAllAsync(
    `select * from ${dbName} where version >= ?`,
    [formatVersion(minVersion)],
  );

  return res.map(item => JSON.parse(item.data));
};

//插入
export const insert = async (data: HistoryInfo) => {
  await db.runAsync(
    `insert into ${dbName} (id, version,data) values (?, ?, ?)`,
    [data.id, formatVersion(appVersion), JSON.stringify(data)],
  );
};

//修改
export const update = async (data: HistoryInfo) => {
  await db.runAsync(`update ${dbName} set data = ? where id = ?`, [
    JSON.stringify(data),
    data.id,
  ]);
};

//删除
export const remove = async (id: string) => {
  await db.runAsync(`delete from ${dbName} where id = ?`, [id]);
};

//清空
export const clear = async () => {
  await db.runAsync(`delete from ${dbName}`);
};
