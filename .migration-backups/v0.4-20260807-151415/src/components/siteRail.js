export function siteRail() {
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

        <div class="site-rail__section-label">SITE</div>

        <nav class="site-rail__nav">
          <a class="site-rail__item is-active" href="/">
            <span class="site-rail__icon">GM</span>
            <span class="site-rail__item-copy">
              <strong>Gaming</strong>
              <small>League & streams</small>
            </span>
          </a>
        </nav>
      </div>

      <div class="site-rail__bottom">
        <div class="site-rail__status">
          <span class="site-rail__status-dot"></span>
          <span>Network Online</span>
        </div>
        <small>DR v0.3</small>
      </div>
    </aside>
  `;
}
