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
      ${siteRail()}

      <div class="app-main">
        ${siteHeader()}

        <div class="app-page">
          ${renderGamingModule(gaming)}

          <footer class="site-footer">
            <strong>DRAGONSRITUAL</strong>
            <span>Gaming system v0.3</span>
          </footer>
        </div>
      </div>
    </div>
  `;
}
