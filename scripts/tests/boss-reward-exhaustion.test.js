const test = require("node:test");
const assert = require("node:assert/strict");
const { __test } = require("../lib/ui-service");

test("exhausted missing reward stops recreating settlement for the same fight", () => {
  const started = { item: { bossId: 25, queueItemId: "old" },
    snapshot: { sessionId: "old-session", hasSession: true } };
  const task = { sessionId: "old-session", item: started.item };
  const summary = { stateReliable: true, hasSession: false, hasReward: false, rewardReady: false };
  const response = { ok: true, status: 200, data: { success: false, message: "Награда ещё не готова" } };
  assert.ok(__test.getBossAutomationSessionLossRewardContext(started, summary));
  for (const override of [{ stateReliable: false }, { hasSession: true }, { rewardReady: true }]) {
    assert.equal(__test.markBossAutomationRewardSettlementExhausted(started, task,
      { summary: { ...summary, ...override } }, response), false);
  }
  assert.equal(__test.markBossAutomationRewardSettlementExhausted(started,
    { sessionId: "other", item: { queueItemId: "other" } }, { summary }, response), false);
  assert.equal(__test.markBossAutomationRewardSettlementExhausted(started, task,
    { summary }, { ok: false, status: 503 }), false);
  assert.equal(__test.markBossAutomationRewardSettlementExhausted(started, task, { summary }, response), true);
  assert.equal(__test.getBossAutomationSessionLossRewardContext(started, summary), null);
  assert.equal(started.rewardSettledAt, undefined);
});
