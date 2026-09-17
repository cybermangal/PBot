// Integration fixture: real sessions/registry/API client, no live game traffic
// or automation. NODE_OPTIONS also applies this guard to detached children.
const { configureUiInstance } = require("../../lib/ui-instance");
configureUiInstance(process.argv.slice(2));
const originalFetch = global.fetch;
const token = (id) => `test.${Buffer.from(JSON.stringify({ userId: id, exp: 4_000_000_000 })).toString("base64url")}.signature`;
global.fetch = async (input, options = {}) => {
  const url = new URL(input);
  if (url.hostname === "127.0.0.1") return originalFetch(input, options);
  if (url.pathname === "/api/auth/login") {
    const params = new URLSearchParams(JSON.parse(options.body).initData);
    const id = JSON.parse(params.get("user")).id;
    return Response.json({ success: true, data: { accessToken: token(id), player: { userId: id, nickname: `Test ${id}` } } });
  }
  if (url.pathname === "/api/player/init") {
    const id = JSON.parse(Buffer.from(options.headers.Authorization.split(".")[1], "base64url")).userId;
    return Response.json({ success: true, data: { player: { userId: id, nickname: `Test ${id}` } } });
  }
  throw new Error(`Test blocked external request: ${url.pathname}`);
};
const service = require("../../lib/ui-service");
for (const name of Object.keys(service)) {
  if (name.startsWith("initialize")) service[name] = async () => {};
}
service.getSponsorsDirectory = async () => {
  if (process.env.PBOT_TEST_HANG_STARTUP_DIRECTORY === "1") return new Promise(() => {});
  return [];
};
service.getEconomyStatus = async () => {
  const { createApiClient } = require("../../lib/api-client");
  const client = await createApiClient();
  const result = await client.players.init();
  return result.data;
};
require("../../lib/supporters-directory").getSupportersDirectory = async () => {
  if (process.env.PBOT_TEST_HANG_STARTUP_DIRECTORY === "1") return new Promise(() => {});
  return [];
};
