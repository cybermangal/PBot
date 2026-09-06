const { normalizeMonthlyDashboard } = require("./misc-dashboard");

function getMonthlyDayPrice(monthly, day) {
  const raw = monthly.buyPriceSoapByDay?.[String(day.dayId)];
  const price = Number(raw);
  return monthly.active && day.expired && !day.completed && !day.isToday
    && raw !== null && raw !== undefined && raw !== ""
    && Number.isSafeInteger(price) && price > 0 ? price : null;
}

async function purchaseMonthlyDay(client, options = {}) {
  const { dayId, year, month, priceSoap } = options;
  if (![dayId, year, month, priceSoap].every(Number.isSafeInteger)
    || dayId < 1 || dayId > 31 || priceSoap <= 0) {
    throw new Error("Некорректные параметры покупки дня.");
  }
  const response = await client.get("/api/monthly/state");
  if (!response.ok || response.data?.success === false) {
    throw new Error("Не удалось проверить состояние делюг.");
  }
  const monthly = normalizeMonthlyDashboard(response);
  const day = monthly.days.find((item) => Number(item.dayId) === dayId);
  if (Number(monthly.year) !== year || Number(monthly.month) !== month
    || !day || getMonthlyDayPrice(monthly, day) === null) {
    throw new Error("Этот день уже выполнен или недоступен для покупки. Обновите делюги.");
  }
  if (getMonthlyDayPrice(monthly, day) !== priceSoap) {
    throw new Error("Цена изменилась. Обновите делюги и повторите покупку.");
  }
  if (options.dryRun === true) return { ok: true, dryRun: true, dayId, priceSoap };
  const bought = await client.post("/api/monthly/buy-day", { json: { DayId: dayId } });
  if (!bought.ok || bought.data?.success !== true) {
    throw new Error(bought.data?.message || bought.data?.error || "Не удалось купить день за мыло.");
  }
  return { ok: true, dayId, priceSoap };
}

module.exports = { getMonthlyDayPrice, purchaseMonthlyDay };
