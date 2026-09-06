$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=== DragonsRitual v0.2 - Global Site Rail + Context Header ===" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path ".git")) {
    throw "STOPPED: Run this from inside your local dragonsritual.github.io repository."
}

if (-not (Test-Path "src")) {
    throw "STOPPED: src folder not found. Make sure you are in the rebuilt DragonsRitual project."
}

# -------------------------------------------------------------------
# 1) GLOBAL SITE RAIL COMPONENT
# -------------------------------------------------------------------
@'
const navItems = [
  { id: "gaming", label: "Gaming", short: "GM", href: "/" },
  { id: "journal", label: "Journal", short: "JR", href: "#journal" },
  { id: "games", label: "Games", short: "GA", href: "#games" },
  { id: "arcade", label: "Arcade", short: "AR", href: "#arcade" },
  { id: "assets", label: "Assets", short: "AS", href: "#assets" },
  { id: "studio", label: "Studio", short: "ST", href: "#studio" }
];

export function siteRail(activeId = "gaming") {
  return `
    <aside class="site-rail" aria-label="Global site navigation">
      <div class="site-rail__top">
        <a class="site-rail__brand" href="/" aria-label="DragonsRitual home">
          <span class="site-rail__brand-mark">DR</span>
          <span class="site-rail__brand-copy">
            <strong>DRAGONSRITUAL</strong>
            <small>STUDIO NETWORK</small>
          </span>
        </a>

        <div class="site-rail__section-label">NETWORK</div>

        <nav class="site-rail__nav">
          ${navItems.map((item) => `
            <a
              class="site-rail__item ${item.id === activeId ? "is-active" : ""}"
              href="${item.href}"
              data-site-section="${item.id}"
            >
              <span class="site-rail__icon">${item.short}</span>
              <span class="site-rail__item-copy">
                <strong>${item.label}</strong>
                <small>${item.id === "gaming" ? "League & streams" :
                         item.id === "journal" ? "Articles & recaps" :
                         item.id === "games" ? "Studio projects" :
                         item.id === "arcade" ? "Playable releases" :
                         item.id === "assets" ? "Art & resources" :
                         "About DragonsRitual"}</small>
              </span>
            </a>
          `).join("")}
        </nav>
      </div>

      <div class="site-rail__bottom">
        <div class="site-rail__status">
          <span class="site-rail__status-dot"></span>
          <span>Network Online</span>
        </div>
        <small>DR v0.2</small>
      </div>
    </aside>
  `;
}
'@ | Set-Content -Encoding UTF8 "src/components/siteRail.js"

# -------------------------------------------------------------------
# 2) CONTEXTUAL TOP HEADER
# -------------------------------------------------------------------
@'
export function siteHeader() {
  return `
    <header class="context-header">
      <div class="context-header__identity">
        <span class="context-header__eyebrow">CURRENT FUNCTION</span>
        <strong>GAMING</strong>
      </div>

      <nav class="context-header__nav" aria-label="Gaming section navigation">
        <a class="active" href="/">Overview</a>
        <a href="#schedule">Schedule</a>
        <a href="#stats">Stats</a>
        <a href="#journal">Recaps</a>
      </nav>
    </header>
  `;
}
'@ | Set-Content -Encoding UTF8 "src/components/siteHeader.js"

# -------------------------------------------------------------------
# 3) APP SHELL
# -------------------------------------------------------------------
@'
import "../styles/core.css";
import "../styles/gaming.css";
import { siteRail } from "../components/siteRail.js";
import { siteHeader } from "../components/siteHeader.js";
import { getGamingDashboard } from "../services/gamingService.js";
import { renderGamingModule } from "../modules/gaming/gamingModule.js";

export async function startApp(root) {
  const gaming = await getGamingDashboard();

  root.innerHTML = `
    <div class="app-shell">
      ${siteRail("gaming")}

      <div class="app-main">
        ${siteHeader()}

        <div class="app-page">
          ${renderGamingModule(gaming)}

          <footer class="site-footer">
            <strong>DRAGONSRITUAL</strong>
            <span>Gaming system v0.2</span>
          </footer>
        </div>
      </div>
    </div>
  `;
}
'@ | Set-Content -Encoding UTF8 "src/app/startApp.js"

# -------------------------------------------------------------------
# 4) CORE LAYOUT + RAIL STYLES
# -------------------------------------------------------------------
@'
:root {
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: #f4f1e9;
  background: #08090c;
  font-synthesis: none;
  text-rendering: optimizeLegibility;

  --bg: #08090c;
  --panel: #111319;
  --panel-2: #171a21;
  --line: rgba(255,255,255,.12);
  --muted: #9298a5;
  --text: #f4f1e9;
  --accent: #e7bd4f;
  --danger: #d94c4c;

  --rail-width: 210px;
  --context-height: 68px;
}

* { box-sizing: border-box; }

html {
  scroll-behavior: smooth;
  background: var(--bg);
}

body {
  margin: 0;
  min-width: 320px;
  background: var(--bg);
  color: var(--text);
}

a {
  color: inherit;
  text-decoration: none;
}

button,
input,
textarea,
select {
  font: inherit;
}

body::before {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at 55% -20%, rgba(112,79,187,.17), transparent 34%),
    linear-gradient(rgba(255,255,255,.016) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,.016) 1px, transparent 1px);
  background-size: auto, 48px 48px, 48px 48px;
  mask-image: linear-gradient(to bottom, black, transparent 80%);
  z-index: 0;
}

.app-shell {
  min-height: 100vh;
}

.site-rail {
  position: fixed;
  inset: 0 auto 0 0;
  width: var(--rail-width);
  height: 100vh;
  z-index: 50;

  display: flex;
  flex-direction: column;
  justify-content: space-between;

  background:
    linear-gradient(180deg, rgba(18,20,26,.98), rgba(10,11,15,.99));
  border-right: 1px solid var(--line);
  box-shadow: 20px 0 45px rgba(0,0,0,.16);
}

.site-rail__top {
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.site-rail__brand {
  height: 90px;
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 0 17px;
  border-bottom: 1px solid var(--line);
}

.site-rail__brand-mark {
  width: 39px;
  height: 39px;
  flex: 0 0 39px;
  display: grid;
  place-items: center;

  border: 1px solid rgba(231,189,79,.65);
  color: var(--accent);
  font: 800 13px/1 Georgia, serif;
}

.site-rail__brand-copy {
  min-width: 0;
}

.site-rail__brand-copy strong {
  display: block;
  font-size: 11px;
  letter-spacing: .11em;
  white-space: nowrap;
}

.site-rail__brand-copy small {
  display: block;
  margin-top: 4px;
  color: var(--muted);
  font-size: 7px;
  letter-spacing: .18em;
  white-space: nowrap;
}

.site-rail__section-label {
  padding: 20px 18px 8px;
  color: #626875;
  font-size: 8px;
  font-weight: 900;
  letter-spacing: .2em;
}

.site-rail__nav {
  display: grid;
  padding: 0 9px;
  gap: 3px;
}

.site-rail__item {
  position: relative;
  min-height: 57px;
  display: grid;
  grid-template-columns: 34px 1fr;
  align-items: center;
  gap: 10px;
  padding: 8px 9px;

  border: 1px solid transparent;
  color: #adb2bc;

  transition:
    background .15s ease,
    border-color .15s ease,
    color .15s ease;
}

.site-rail__item::before {
  content: "";
  position: absolute;
  left: -10px;
  top: 12px;
  bottom: 12px;
  width: 2px;
  background: transparent;
}

.site-rail__item:hover {
  background: rgba(255,255,255,.03);
  color: var(--text);
}

.site-rail__item.is-active {
  background: rgba(231,189,79,.06);
  border-color: rgba(231,189,79,.18);
  color: var(--text);
}

.site-rail__item.is-active::before {
  background: var(--accent);
}

.site-rail__icon {
  width: 31px;
  height: 31px;
  display: grid;
  place-items: center;

  border: 1px solid var(--line);
  color: #747b88;

  font: 800 8px/1 ui-monospace, monospace;
  letter-spacing: .05em;
}

.site-rail__item.is-active .site-rail__icon {
  border-color: rgba(231,189,79,.5);
  color: var(--accent);
}

.site-rail__item-copy {
  min-width: 0;
}

.site-rail__item-copy strong {
  display: block;
  font-size: 11px;
  line-height: 1.1;
}

.site-rail__item-copy small {
  display: block;
  margin-top: 4px;
  color: #6f7581;
  font-size: 8px;
  line-height: 1.15;
}

.site-rail__bottom {
  min-height: 74px;
  padding: 14px 17px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;

  border-top: 1px solid var(--line);
  color: #626875;
  font-size: 8px;
  letter-spacing: .11em;
  text-transform: uppercase;
}

.site-rail__status {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #8e949f;
}

.site-rail__status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 12px rgba(231,189,79,.45);
}

.app-main {
  min-height: 100vh;
  margin-left: var(--rail-width);
  position: relative;
  z-index: 1;
}

.context-header {
  position: sticky;
  top: 0;
  z-index: 40;

  min-height: var(--context-height);
  padding: 0 34px;

  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;

  border-bottom: 1px solid var(--line);
  background: rgba(8,9,12,.92);
  backdrop-filter: blur(16px);
}

.context-header__identity {
  display: flex;
  align-items: baseline;
  gap: 10px;
  white-space: nowrap;
}

.context-header__eyebrow {
  color: #5f6672;
  font-size: 8px;
  font-weight: 900;
  letter-spacing: .18em;
}

.context-header__identity strong {
  color: var(--text);
  font-size: 12px;
  letter-spacing: .12em;
}

.context-header__nav {
  display: flex;
  align-items: center;
  gap: 26px;

  color: var(--muted);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .09em;
  text-transform: uppercase;
}

.context-header__nav a {
  position: relative;
  padding: 25px 0 23px;
}

.context-header__nav a::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 2px;
  background: transparent;
}

.context-header__nav a:hover,
.context-header__nav a.active {
  color: var(--text);
}

.context-header__nav a.active::after {
  background: var(--accent);
}

.app-page {
  position: relative;
}

.page-shell {
  width: min(1500px, calc(100% - 56px));
  margin: 0 auto;
}

.site-footer {
  width: min(1500px, calc(100% - 56px));
  margin: 70px auto 0;

  min-height: 100px;
  display: flex;
  align-items: center;
  justify-content: space-between;

  border-top: 1px solid var(--line);

  color: var(--muted);
  font-size: 10px;
  letter-spacing: .12em;
  text-transform: uppercase;
}

.site-footer strong {
  color: var(--text);
}

/* ---------------------------------------------------------------
   TABLET: turn the large rail into a compact icon rail
---------------------------------------------------------------- */
@media (max-width: 1080px) {
  :root {
    --rail-width: 72px;
  }

  .site-rail__brand {
    justify-content: center;
    padding: 0;
  }

  .site-rail__brand-copy,
  .site-rail__section-label,
  .site-rail__item-copy,
  .site-rail__bottom small {
    display: none;
  }

  .site-rail__nav {
    padding: 10px 9px;
  }

  .site-rail__item {
    min-height: 52px;
    grid-template-columns: 1fr;
    justify-items: center;
    padding: 8px;
  }

  .site-rail__item::before {
    left: -10px;
  }

  .site-rail__status {
    justify-content: center;
  }

  .context-header {
    padding: 0 24px;
  }
}

/* ---------------------------------------------------------------
   MOBILE: rail becomes horizontal fixed bottom nav
---------------------------------------------------------------- */
@media (max-width: 700px) {
  :root {
    --rail-width: 0px;
  }

  .site-rail {
    inset: auto 0 0 0;
    width: 100%;
    height: 62px;
    border-right: 0;
    border-top: 1px solid var(--line);
    background: rgba(10,11,15,.97);
    backdrop-filter: blur(14px);
  }

  .site-rail__brand,
  .site-rail__section-label,
  .site-rail__bottom {
    display: none;
  }

  .site-rail__top {
    height: 100%;
  }

  .site-rail__nav {
    height: 100%;
    grid-template-columns: repeat(6, 1fr);
    padding: 5px 6px;
    gap: 2px;
  }

  .site-rail__item {
    min-height: 0;
    height: 100%;
    padding: 3px;
    display: grid;
    place-items: center;
    border: 0;
  }

  .site-rail__item::before {
    display: none;
  }

  .site-rail__icon {
    width: 28px;
    height: 28px;
  }

  .app-main {
    margin-left: 0;
    padding-bottom: 62px;
  }

  .context-header {
    min-height: auto;
    padding: 14px;
    display: grid;
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .context-header__identity {
    display: none;
  }

  .context-header__nav {
    width: 100%;
    gap: 0;
    justify-content: space-between;
    overflow-x: auto;
  }

  .context-header__nav a {
    padding: 8px 10px 10px;
    white-space: nowrap;
  }

  .page-shell,
  .site-footer {
    width: min(100% - 28px, 1500px);
  }
}
'@ | Set-Content -Encoding UTF8 "src/styles/core.css"

# -------------------------------------------------------------------
# 5) BUILD TEST
# -------------------------------------------------------------------
npm run build

Write-Host ""
Write-Host "==============================================================" -ForegroundColor Green
Write-Host "v0.2 APPLIED SUCCESSFULLY" -ForegroundColor Green
Write-Host "Global site rail added on the left." -ForegroundColor Green
Write-Host "Gaming page now has its own contextual sticky top navigation." -ForegroundColor Green
Write-Host ""
Write-Host "If your dev server is already running, refresh the browser." -ForegroundColor Cyan
Write-Host "If it is not running, use: npm run dev" -ForegroundColor Cyan
Write-Host "==============================================================" -ForegroundColor Green
