import Database from "better-sqlite3";
import { join } from "path";
import { minVersion } from "@/services/info";
import { isDev } from "ym-electron.js";
import { HistoryInfo } from "@type";
import { formatVersion } from "@/utils/format";
import { appVersion } from "./info";
import { userDataPath } from "./path";

const db = new Database(
  join(userDataPath, isDev() ? `test.sqlite` : `db.sqlite`)
);

const tableName = "history";

// 如果表不存在就创建
db.prepare(
  `
  CREATE TABLE IF NOT EXISTS ${tableName} (
    id TEXT PRIMARY KEY,
    version INTEGER,
    data TEXT
  )
  `
).run();

interface Row {
  id: string;
  version: number;
  data: string;
}

//查询
export const select = (): HistoryInfo[] => {
  const select = db.prepare(`select * from ${tableName} where version >= ?`);

  const res = select.all(formatVersion(minVersion)) as Row[];

  return res.map(item => JSON.parse(item.data));
};

//插入
export const insert = (data: HistoryInfo) => {
  const insert = db.prepare(
    `insert into ${tableName} (id, version, data) values (?, ?, ?)`
  );

  insert.run(data.id, formatVersion(appVersion), JSON.stringify(data));
};

//修改
export const update = (data: HistoryInfo) => {
  const update = db.prepare(`update ${tableName} set data = ? where id = ?`);

  update.run(JSON.stringify(data), data.id);
};

//删除
export const remove = (id: string) => {
  const remove = db.prepare(`delete from ${tableName} where id = ?`);

  remove.run(id);
};

//清空
export const reset = () => {
  const reset = db.prepare(`delete from ${tableName}`);

  reset.run();
};
