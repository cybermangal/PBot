const fs = require("node:fs/promises");
const path = require("node:path");
const { getInstancePaths } = require("./ui-instance");

const ROOT_DIR = path.resolve(__dirname, "..", "..");
const { artifactsDir: ARTIFACTS_DIR } = getInstancePaths(ROOT_DIR);

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function writeVersionedJson(prefix, data) {
  await fs.mkdir(ARTIFACTS_DIR, { recursive: true });
  const datedPath = path.join(ARTIFACTS_DIR, `${prefix}-${timestamp()}.json`);
  const latestPath = path.join(ARTIFACTS_DIR, `${prefix}-latest.json`);
  const body = `${JSON.stringify(data, null, 2)}\n`;

  await fs.writeFile(datedPath, body, "utf8");
  await fs.writeFile(latestPath, body, "utf8");

  return {
    datedPath: path.resolve(datedPath),
    latestPath: path.resolve(latestPath),
  };
}

module.exports = {
  ROOT_DIR,
  ARTIFACTS_DIR,
  writeVersionedJson,
};
