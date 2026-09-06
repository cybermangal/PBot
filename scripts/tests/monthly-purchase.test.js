const test = require("node:test");
const assert = require("node:assert/strict");
const { purchaseMonthlyDay } = require("../lib/monthly-purchase");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function fixture() {
  const data = {
    active: true,
    global: { year: 2026, month: 9, days: [{ dayId: 1 }] },
    user: { activeDayId: 6, days: { 1: { expired: true, completed: false } } },
    buyPriceSoapByDay: { 1: 10 },
  };
  const calls = [];
  const client = {
    get: async () => ({ ok: true, data }),
    post: async (...args) => { calls.push(args); return { ok: true, data: { success: true } }; },
  };
  return { data, calls, client, options: { dayId: 1, year: 2026, month: 9, priceSoap: 10 } };
}

test("buys one missed day with the game's DayId contract", async () => {
  const { client, calls, options } = fixture();
  assert.deepEqual(await purchaseMonthlyDay(client, options), { ok: true, dayId: 1, priceSoap: 10 });
  assert.deepEqual(calls, [["/api/monthly/buy-day", { json: { DayId: 1 } }]]);
});

for (const [name, mutate] of Object.entries({
  completed: (d) => { d.user.days[1].completed = true; },
  future: (d) => { d.user.days[1].expired = false; },
  today: (d) => { d.user.activeDayId = 1; },
  inactive: (d) => { d.active = false; },
  monthChanged: (d) => { d.global.month = 10; },
  priceChanged: (d) => { d.buyPriceSoapByDay[1] = 20; },
  missingPrice: (d) => { delete d.buyPriceSoapByDay[1]; },
})) {
  test(`rejects ${name} without spending soap`, async () => {
    const { data, client, calls, options } = fixture();
    mutate(data);
    await assert.rejects(purchaseMonthlyDay(client, options));
    assert.equal(calls.length, 0);
  });
}

test("dry run validates the purchase without sending POST", async () => {
  const { client, calls, options } = fixture();
  assert.equal((await purchaseMonthlyDay(client, { ...options, dryRun: true })).dryRun, true);
  assert.equal(calls.length, 0);
});

test("reports application failures and does not retry purchases", async () => {
  const { client, options } = fixture();
  let attempts = 0;
  client.post = async () => { attempts++; return { ok: true, data: { success: false, message: "Недостаточно мыла" } }; };
  await assert.rejects(purchaseMonthlyDay(client, options), /Недостаточно мыла/);
  assert.equal(attempts, 1);
});

test("calendar offers priced purchases only for missed days and locks buttons while buying", () => {
  const source = fs.readFileSync(path.join(__dirname, "../../ui/app.js"), "utf8");
  const render = source.slice(source.indexOf("function renderMiscMonthly("), source.indexOf("function renderMiscStashes("));
  const elements = new Map();
  const context = {
    $: (id) => {
      if (id === "#monthly-policy-controls") return null;
      if (!elements.has(id)) elements.set(id, {});
      return elements.get(id);
    },
    renderStatGrid() {}, formatNumber: String, escapeHtml: String,
    monthlyActionTitle: () => "Задание", monthlyPurchasePending: false,
  };
  vm.createContext(context);
  vm.runInContext(render, context);
  const monthly = {
    active: true, buyPriceSoapByDay: { 1: 10, 2: 20, 3: 30 },
    days: [{ dayId: 1, expired: true }, { dayId: 2, completed: true, expired: true }, { dayId: 3 }],
  };
  context.renderMiscMonthly(monthly);
  const html = () => elements.get("#misc-monthly-calendar").innerHTML;
  assert.match(html(), /data-monthly-buy="1"/);
  assert.match(html(), /Купить за 10 мыла/);
  assert.doesNotMatch(html(), /data-monthly-buy="[23]"/);
  context.monthlyPurchasePending = true;
  context.renderMiscMonthly(monthly);
  assert.match(html(), /data-monthly-buy="1" disabled/);
});
