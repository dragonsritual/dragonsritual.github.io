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
