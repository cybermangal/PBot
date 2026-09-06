const fs = require("node:fs/promises");
const path = require("node:path");
const https = require("node:https");

const { ARTIFACTS_DIR } = require("./pbot");

const DEFAULT_BUNDLE_URL = "https://oldprison-prod.luckygem.online/bundle.obf.js";
const DEFAULT_BUNDLE_PATH = path.join(ARTIFACTS_DIR, "bundle.obf.js");

function absolutePath(filePath) {
  return path.resolve(filePath);
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    void error;
    return false;
  }
}

function downloadText(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, (response) => {
      const statusCode = response.statusCode || 0;

      if (statusCode >= 300 && statusCode < 400 && response.headers.location) {
        response.resume();
        resolve(downloadText(response.headers.location));
        return;
      }

      if (statusCode < 200 || statusCode >= 300) {
        reject(new Error(`Failed to download bundle: HTTP ${statusCode}`));
        response.resume();
        return;
      }

      const chunks = [];

      response.on("data", (chunk) => {
        chunks.push(chunk);
      });

      response.on("end", () => {
        resolve(Buffer.concat(chunks).toString("utf8"));
      });

      response.on("error", reject);
    });

    request.on("error", reject);
  });
}

async function ensureBundleFile(options = {}) {
  const bundlePath = options.bundlePath || DEFAULT_BUNDLE_PATH;
  const bundleUrl = options.bundleUrl || DEFAULT_BUNDLE_URL;

  if (await fileExists(bundlePath)) {
    return absolutePath(bundlePath);
  }

  await fs.mkdir(path.dirname(bundlePath), { recursive: true });
  const bundleText = await downloadText(bundleUrl);
  await fs.writeFile(bundlePath, bundleText, "utf8");

  return absolutePath(bundlePath);
}

async function loadBundleText(options = {}) {
  const bundlePath = await ensureBundleFile(options);
  return fs.readFile(bundlePath, "utf8");
}

function extractApiRoutes(bundleText, filterPattern) {
  const routes = [];
  const seen = new Set();
  const matches = bundleText.match(/\/api\/[A-Za-z0-9_/?=&{}.:~-]+/g) || [];

  for (const route of matches) {
    if (filterPattern && !filterPattern.test(route)) {
      continue;
    }
    if (seen.has(route)) {
      continue;
    }
    seen.add(route);
    routes.push(route);
  }

  return routes.sort();
}

function extractSnippet(bundleText, needle, options = {}) {
  const before = options.before ?? 600;
  const after = options.after ?? 1600;
  const index = bundleText.indexOf(needle);

  if (index === -1) {
    return null;
  }

  return bundleText.slice(
    Math.max(0, index - before),
    Math.min(bundleText.length, index + after),
  );
}

function extractSnippets(bundleText, needles, options = {}) {
  const snippets = {};

  for (const needle of needles) {
    snippets[needle] = extractSnippet(bundleText, needle, options);
  }

  return snippets;
}

function extractInteractionTypes(bundleText) {
  const types = new Set();
  const regex = /'(UpgradeBiceps|Fight|Harknut|TossDroj)'/g;
  let match = regex.exec(bundleText);

  while (match) {
    types.add(match[1]);
    match = regex.exec(bundleText);
  }

  return [...types].sort();
}

module.exports = {
  DEFAULT_BUNDLE_PATH,
  DEFAULT_BUNDLE_URL,
  ensureBundleFile,
  extractApiRoutes,
  extractInteractionTypes,
  extractSnippet,
  extractSnippets,
  loadBundleText,
};
