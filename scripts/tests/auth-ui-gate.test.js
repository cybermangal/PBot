const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../../ui/app.js"), "utf8");
const requestSource = source.slice(source.indexOf("async function apiRequest("), source.indexOf("async function handleOpenInstance("));

test("an auth-required response opens login and blocks further game tab requests", async () => {
  const state = { authGateActive: false, apiRequestInflight: new Map() };
  const gates = [];
  let calls = 0;
  const context = {
    state,
    window: { setTimeout, clearTimeout },
    AbortController,
    fetch: async () => {
      calls += 1;
      return {
        ok: false,
        status: 401,
        json: async () => ({ ok: false, code: "AUTH_REQUIRED", error: "Session expired" }),
      };
    },
    showAuthGate(payload) {
      gates.push(payload);
      state.authGateActive = true;
    },
  };
  vm.runInNewContext(`${requestSource}\nthis.apiRequest = apiRequest;`, context);

  await assert.rejects(context.apiRequest("GET", "/api/bosses/dashboard"), /Session expired/);
  assert.equal(gates.length, 1);
  assert.equal(gates[0].reason, "game-auth-rejected");
  await assert.rejects(context.apiRequest("GET", "/api/prison/dashboard"), /Войди снова/);
  assert.equal(calls, 1);
});
