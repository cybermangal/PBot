const WEAPONS = ["poison", "gunshot", "knife"];
// Fixed baseline from measured, completed auto-combos in the local history.
// The authoritative mode has 26 results across six bosses. The blotnoy sample
// has seven results, all from boss #4, so it only applies to that boss.
const FIXED_COMBO_WEAPON_POOL = Object.freeze({
  modes: {
    avtoritetny: {
      samples: 26, distinctBosses: 6, source: "fixed",
      weapons: {
        poison: { min: 4, max: 7, mean: 5.2 },
        gunshot: { min: 4, max: 8, mean: 6.4 },
        knife: { min: 5, max: 9, mean: 7 },
      },
    },
  },
  bosses: {
    "4:blotnoy": {
      samples: 7, distinctBosses: 1, source: "fixed",
      weapons: {
        poison: { min: 2, max: 2, mean: 2 },
        gunshot: { min: 3, max: 4, mean: 3.3 },
        knife: { min: 2, max: 4, mean: 2.7 },
      },
    },
  },
});

function summarizeComboWeaponPool(events) {
  const seen = new Set();
  const groups = new Map();
  const add = (key, bossId, amounts, at) => {
    let group = groups.get(key);
    if (!group) {
      group = {
        samples: 0, bossIds: new Set(), latestAt: null,
        weapons: Object.fromEntries(WEAPONS.map((weapon) => [weapon, { min: Infinity, max: -Infinity, sum: 0 }])),
      };
      groups.set(key, group);
    }
    group.samples += 1;
    group.bossIds.add(bossId);
    if (typeof at === "string" && (!group.latestAt || at > group.latestAt)) group.latestAt = at;
    for (const weapon of WEAPONS) {
      const amount = amounts[weapon];
      group.weapons[weapon].min = Math.min(group.weapons[weapon].min, amount);
      group.weapons[weapon].max = Math.max(group.weapons[weapon].max, amount);
      group.weapons[weapon].sum += amount;
    }
  };

  for (const event of events) {
    if (event?.type !== "auto_hit_result") continue;
    const item = event.details?.item;
    const result = event.details?.result;
    const economy = result?.comboEconomy;
    const bossId = Number(item?.bossId);
    const mode = String(item?.comboMode || "").trim();
    if (!Number.isSafeInteger(bossId) || bossId <= 0 || !mode
      || result?.dryRun || !economy?.measured || !economy.hasComboReward) continue;
    const key = `${event.at}:${item.queueItemId || ""}:${bossId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const reward = economy.rewards?.weapons || {};
    const amounts = Object.fromEntries(WEAPONS.map((weapon) => [weapon, Math.max(0, Number(reward[weapon]) || 0)]));
    add(`mode:${mode}`, bossId, amounts, event.at);
    add(`boss:${bossId}:${mode}`, bossId, amounts, event.at);
  }

  const output = { modes: {}, bosses: {} };
  for (const [key, group] of groups) {
    const summary = {
      samples: group.samples,
      distinctBosses: group.bossIds.size,
      latestAt: group.latestAt,
      weapons: Object.fromEntries(WEAPONS.map((weapon) => [weapon, {
        min: group.weapons[weapon].min,
        max: group.weapons[weapon].max,
        mean: group.weapons[weapon].sum / group.samples,
      }])),
    };
    if (key.startsWith("mode:")) output.modes[key.slice(5)] = summary;
    else output.bosses[key.slice(5)] = summary;
  }
  return output;
}

async function loadComboWeaponPool() {
  return FIXED_COMBO_WEAPON_POOL;
}

module.exports = { summarizeComboWeaponPool, loadComboWeaponPool, FIXED_COMBO_WEAPON_POOL };
