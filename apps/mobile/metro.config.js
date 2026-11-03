const { getDefaultConfig } = require("expo/metro-config");
const path = require("node:path");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);
config.watchFolders = [
  ...(config.watchFolders ?? []),
  path.resolve(__dirname, "../../assets"),
];

module.exports = withNativeWind(config, { input: "./src/global.css" });
