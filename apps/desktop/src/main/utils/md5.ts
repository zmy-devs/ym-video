import { readFile } from "fs/promises";
import { createHash } from "crypto";

export const getMd5 = async (path: string) => {
  try {
    const buffer = await readFile(path);

    const hash = createHash("md5");

    hash.update(buffer);

    return hash.digest("hex");
  } catch {
    return "";
  }
};
