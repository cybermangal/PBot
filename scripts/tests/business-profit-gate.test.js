const test = require("node:test");
const assert = require("node:assert/strict");

const { __test } = require("../lib/ui-service");

test("business profit collection is blocked unless Zaruba is active", async () => {
  let zarubaStateCalls = 0;
  let collectCalls = 0;
  const client = {
    zaruba: {
      state: async () => {
        zarubaStateCalls += 1;
        return { ok: true, status: 200, data: { active: null } };
      },
    },
    business: {
      collect: async () => {
        collectCalls += 1;
        return { ok: true, status: 200, data: { collected: true } };
      },
    },
  };

  await assert.rejects(
    () => __test.collectBusinessProfitAfterZarubaCheck(client),
    (error) => {
      assert.equal(error.code, "zaruba_not_started");
      return true;
    },
  );

  assert.equal(zarubaStateCalls, 1);
  assert.equal(collectCalls, 0);
});

test("business profit collection proceeds when Zaruba is active", async () => {
  let collectCalls = 0;
  const client = {
    zaruba: {
      state: async () => ({ ok: true, status: 200, data: { active: { mode: 1, tasks: [] } } }),
    },
    business: {
      collect: async () => {
        collectCalls += 1;
        return { ok: true, status: 200, data: { collected: true } };
      },
    },
  };

  const result = await __test.collectBusinessProfitAfterZarubaCheck(client);

  assert.equal(result.gate.canCollect, true);
  assert.equal(result.response.data.collected, true);
  assert.equal(collectCalls, 1);
});
