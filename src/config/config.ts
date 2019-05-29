import fs from "fs";
import { Config } from "config";

const readConfig = (path: string) => {
  try {
    return JSON.parse(fs.readFileSync(path, "utf8"));
  } catch (err) {
    console.error("Error parsing config", err);
  }
};

const isValidConfig = (config: any): config is Config =>
  config && config.downloadPath;

export const initConfig = (path: string): Config => {
  const config = initConfig(path);
  if (!isValidConfig(config)) {
    throw new Error("Error parsing config, format is invalid");
  }
  return config;
};
