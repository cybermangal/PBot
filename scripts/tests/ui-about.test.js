const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");
const appSource = fs.readFileSync(path.join(root, "ui/app.js"), "utf8");
const html = fs.readFileSync(path.join(root, "ui/index.html"), "utf8");
const styles = fs.readFileSync(path.join(root, "ui/styles.css"), "utf8");
const serverSource = fs.readFileSync(path.join(root, "scripts/ui-server.js"), "utf8");
const serviceSource = fs.readFileSync(path.join(root, "scripts/lib/ui-service.js"), "utf8");
const directorySource = fs.readFileSync(path.join(root, "scripts/lib/supporters-directory.js"), "utf8");
const favicon = fs.readFileSync(path.join(root, "ui/assets/pbot-favicon.svg"), "utf8");
const standaloneRoot = path.join(root, "bosses-system-only");
const standaloneAppPath = path.join(standaloneRoot, "ui/app.js");
const standaloneAvailable = fs.existsSync(standaloneAppPath);
const readStandalone = (relativePath) => standaloneAvailable
  ? fs.readFileSync(path.join(standaloneRoot, relativePath), "utf8")
  : "";
const standaloneAppSource = readStandalone("ui/app.js");
const standaloneHtml = readStandalone("ui/index.html");
const standaloneStyles = readStandalone("ui/styles.css");
const standaloneServerSource = readStandalone("scripts/ui-server.js");
const standaloneServiceSource = readStandalone("scripts/lib/ui-service.js");
const standaloneApiClientSource = readStandalone("scripts/lib/api-client.js");
const standaloneDirectorySource = readStandalone("scripts/lib/supporters-directory.js");

test("about tab keeps a compact header and supporter directory", () => {
  assert.match(html, /data-tab="about"[^>]*>[\s\S]*?О боте/);
  assert.match(html, /class="tab-panel" data-panel="about"/);
  assert.match(html, /<h2>Ссылки и поддержка<\/h2>/);
  assert.match(html, /<h2>Подогрели проект<\/h2>/);
  assert.match(html, /id="about-sponsor-filters"/);
  assert.match(html, /id="about-sponsors-list"/);
  assert.match(html, /src="\/app\.js\?v=[^"]+"/);
  assert.match(html, /href="\/styles\.css\?v=[^"]+"/);
  assert.doesNotMatch(html, /Автоматизация без лишней рутины/);
  assert.doesNotMatch(html, /Три простых шага/);
  assert.match(html, /href="https:\/\/boosty\.to\/pbot"/);
  assert.match(html, /href="https:\/\/t\.me\/pbot_tyraga"/);
  assert.match(html, /href="https:\/\/www\.youtube\.com\/@pbot_prison"/);
});

test("about support heading explains how to join the public list", () => {
  for (const source of standaloneAvailable ? [html, standaloneHtml] : [html]) {
    assert.match(source, /class="about-support-help"/);
    assert.match(source, /Как попасть в список/);
    assert.match(source, /Подпишись на Boosty/);
    assert.match(source, /вступи в закрытый Telegram-чат/);
    assert.match(source, /не привязан к Telegram/);
    assert.match(source, /личные сообщения на Boosty/);
  }
  assert.match(styles, /\.about-support-help summary/);
  if (standaloneAvailable) {
    assert.match(standaloneStyles, /\.about-support-help summary/);
  }
});

(standaloneAvailable ? test : test.skip)("bosses-only build exposes the same compact About tab and directory", () => {
  assert.match(standaloneHtml, /class="tab-button tab-button-about" data-tab="about"[^>]*>[\s\S]*?О боте/);
  assert.match(standaloneHtml, /class="tab-panel" data-panel="about"/);
  assert.match(standaloneHtml, /<h2>Подогрели проект<\/h2>/);
  assert.match(standaloneHtml, /id="about-sponsor-filters"/);
  assert.match(standaloneHtml, /id="about-sponsors-list"/);
  assert.match(standaloneHtml, /styles\.css\?v=20260824-about-parity-2/);
  assert.match(standaloneHtml, /app\.js\?v=20260824-about-parity-2/);
  assert.match(standaloneAppSource, /apiRequest\("GET", "\/api\/about\/sponsors"\)/);
  assert.match(standaloneAppSource, /initializeAboutSponsors\(\)/);
  assert.match(standaloneStyles, /\.tab-button-about/);
  assert.match(standaloneServerSource, /pathname === "\/api\/about\/sponsors"/);
  assert.match(standaloneServerSource, /pathname === "\/api\/friends\/status"/);
  assert.match(standaloneServerSource, /pathname === "\/api\/friends\/invite-users"/);
  assert.match(standaloneServiceSource, /async function getSponsorsDirectory/);
  assert.match(standaloneServiceSource, /async function getFriendStatuses/);
  assert.match(standaloneServiceSource, /async function inviteUsers/);
  assert.match(standaloneApiClientSource, /view\(userId\)/);
  assert.match(standaloneApiClientSource, /\/api\/player\/view\/\$\{userId\}/);
  assert.match(standaloneApiClientSource, /\/api\/friendship\/send-request/);
  assert.match(standaloneDirectorySource, /Pbot-supporters\/main\/supporters\.json/);
});

(standaloneAvailable ? test : test.skip)("bosses-only supporter cards retain friendship controls and visual effects", () => {
  assert.match(standaloneAppSource, /aboutSponsorFriendStatuses: new Map\(\)/);
  assert.match(standaloneAppSource, /data-about-sponsor-invite/);
  assert.match(standaloneAppSource, /\/api\/friends\/status\?ids=/);
  assert.match(standaloneAppSource, /\/api\/friends\/invite-users/);
  assert.match(standaloneAppSource, /about-sponsor-authority-border-glow/);
  assert.match(standaloneAppSource, /about-sponsor-authority-glare/);
  assert.match(standaloneAppSource, /requestAnimationFrame/);
  assert.match(standaloneAppSource, /pointermove/);
  assert.match(standaloneStyles, /\.about-sponsor-friend-button/);
  assert.match(standaloneStyles, /\.about-sponsor-card\.is-authority:hover/);
  assert.match(standaloneStyles, /\.about-sponsor-card\.is-blatnoy:hover/);
  assert.match(standaloneStyles, /\.about-sponsor-card\.is-patsan:hover/);
  assert.match(standaloneStyles, /\.about-sponsor-authority-border-glow/);
  assert.match(standaloneStyles, /mask-composite: exclude/);
  assert.match(standaloneStyles, /@media \(prefers-reduced-motion: reduce\)/);
});

test("browser icon remains branded and the about header uses four game support icons", () => {
  assert.match(html, /<link rel="icon" type="image\/svg\+xml" href="\/assets\/pbot-favicon\.svg">/);
  assert.match(html, /class="about-support-icons"/);
  const supportIcons = [
    "podogrev-icon-4x.png",
    "patsanskaya-posylka-4x.png",
    "blatnaya-posylka-4x.png",
    "avtoritetnaya-posylka-4x.png",
  ];
  const supportIconsStart = html.indexOf('class="about-support-icons"');
  const supportIconsEnd = html.indexOf("</div>", supportIconsStart);
  const supportIconsHtml = html.slice(supportIconsStart, supportIconsEnd);
  let previousIndex = -1;
  for (const icon of supportIcons) {
    const index = supportIconsHtml.indexOf(icon);
    assert.ok(index > previousIndex, `${icon} must follow the previous support icon`);
    previousIndex = index;
  }
  assert.doesNotMatch(html, /class="about-logo"/);
  assert.match(favicon, /<g fill="#ffffff">/);
  assert.match(favicon, /<g fill="#090a0b">/);
  assert.doesNotMatch(favicon, /<image\b/);
});

test("about links open without sharing an opener", () => {
  const aboutLinks = html.match(/<a href="https:\/\/(?:boosty\.to\/pbot|t\.me\/pbot_tyraga|www\.youtube\.com\/@pbot_prison)"[^>]*>/g) || [];
  assert.equal(aboutLinks.length, 3);
  for (const link of aboutLinks) {
    assert.match(link, /target="_blank"/);
    assert.match(link, /rel="noopener noreferrer"/);
  }
  assert.doesNotMatch(html, /data-placeholder-url/);
});

test("supporter filters use the requested order and game tier icons", () => {
  const filterOrder = ["Все", "Авторитеты", "Блатные", "Пацаны"];
  let previousIndex = -1;
  for (const label of filterOrder) {
    const index = appSource.indexOf(`label: "${label}"`);
    assert.ok(index > previousIndex, `${label} must follow the previous filter`);
    previousIndex = index;
  }
  assert.match(appSource, /avtoritetnaya-posylka-4x\.png/);
  assert.match(appSource, /blatnaya-posylka-4x\.png/);
  assert.match(appSource, /patsanskaya-posylka-4x\.png/);
  assert.match(appSource, /data-about-sponsor-filter/);
  assert.match(appSource, /about-sponsor-filter-icon/);
  assert.match(appSource, /\["authority", "blatnoy", "patsan"\]/);
  assert.match(styles, /\.about-sponsor-filter-icon\.is-all/);
});

test("supporter cards expose tier styling and real friendship states", () => {
  assert.match(styles, /\.about-sponsor-card\.is-authority/);
  assert.match(styles, /\.about-sponsor-card\.is-blatnoy/);
  assert.match(styles, /\.about-sponsor-card\.is-patsan/);
  assert.match(appSource, /status === "self"/);
  assert.match(appSource, /sponsor\.userId === selfUserId/);
  assert.match(appSource, /status === "friend"/);
  assert.match(appSource, /status === "requested"/);
  assert.match(appSource, /\/api\/friends\/status\?ids=/);
  assert.match(appSource, /\/api\/friends\/invite-users/);
  assert.doesNotMatch(appSource, /\/data\/sponsors\.json/);
  assert.match(appSource, /apiRequest\("GET", "\/api\/about\/sponsors"\)/);
  assert.match(appSource, /PAGE_PREFETCH_ORDER[\s\S]*?"about"/);
  assert.match(appSource, /about: Object\.freeze\([\s\S]*?await handleAboutTabOpen\(\)/);
  assert.match(appSource, /aboutSponsorsLoadPromise/);
  assert.match(appSource, /scheduleAboutSponsorsRetry/);
  assert.match(appSource, /loadAboutSponsors\(\{ force: true \}\)/);
  assert.match(appSource, /"Загружаем ник…"/);
  if (standaloneAvailable) {
    assert.match(standaloneAppSource, /scheduleAboutSponsorsRetry/);
    assert.match(standaloneAppSource, /loadAboutSponsors\(\{ force: true \}\)/);
  }
  assert.match(appSource, /`ID \$\{userId\}`/);
  assert.match(serverSource, /pathname === "\/api\/friends\/status"/);
  assert.match(serviceSource, /async function getFriendStatuses/);
  assert.match(serviceSource, /\? "self"/);
  assert.match(styles, /@media \(hover: hover\) and \(pointer: fine\)/);
  assert.match(styles, /\.about-sponsor-card\.is-authority:hover/);
  assert.match(styles, /\.about-sponsor-card\.is-blatnoy:hover/);
  assert.match(styles, /\.about-sponsor-card\.is-patsan:hover/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(appSource, /about-sponsor-authority-border-glow/);
  assert.match(appSource, /about-sponsor-authority-glare/);
  assert.match(appSource, /requestAnimationFrame/);
  assert.match(appSource, /edgeThreshold/);
  assert.match(styles, /\.about-sponsor-authority-border-glow/);
  assert.match(styles, /\.about-sponsor-authority-glare/);
  assert.match(styles, /mask-composite: exclude/);
});

test("supporter directory uses the public ID-only source and a twelve-hour cache", () => {
  assert.match(serverSource, /pathname === "\/api\/about\/sponsors"/);
  assert.match(serverSource, /getSupportersDirectory: initializeSupportersDirectory/);
  assert.match(serverSource, /await initializeSupportersDirectory\(\{ forceRefresh: true \}\)/);
  assert.match(serverSource, /await getSponsorsDirectory\(\)/);
  assert.doesNotMatch(serviceSource, /ui\/data\/sponsors\.json/);
  assert.match(serviceSource, /async function getSponsorsDirectory/);
  assert.match(serviceSource, /client\.players\.view\(userId\)/);
  assert.match(serviceSource, /SPONSOR_PROFILE_CACHE_TTL_MS/);
  assert.match(serviceSource, /sponsorProfileCache\.delete\(userId\)/);
  assert.match(directorySource, /raw\.githubusercontent\.com\/cybermangal\/Pbot-supporters\/main\/supporters\.json/);
  assert.match(directorySource, /SUPPORTERS_CACHE_TTL_MS = 12 \* 60 \* 60_000/);
  assert.match(directorySource, /supporters-cache\.json/);
  assert.match(directorySource, /sponsors\.push\(\{ userId, tier \}\)/);
  assert.match(styles, /\.about-header-card/);
  assert.match(styles, /\.about-sponsors-list/);
  assert.match(styles, /@media \(max-width: 760px\)[\s\S]*?\.about-resource-links/);
});
