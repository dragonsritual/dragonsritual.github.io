$ErrorActionPreference = "Stop"

if (-not (Test-Path ".git") -or -not (Test-Path "src\pages\index.astro")) {
  throw "Run this from the dragonsritual.github.io project root."
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backup = ".migration-backups\today-artifact-$stamp"
New-Item -ItemType Directory -Force -Path $backup | Out-Null

function Backup-File($p) {
  if (Test-Path $p) {
    $dest = Join-Path $backup $p
    New-Item -ItemType Directory -Force -Path (Split-Path $dest -Parent) | Out-Null
    Copy-Item $p $dest -Force
  }
}

Write-Host "DRAGON TODAY ARTIFACT PASS 06" -ForegroundColor Cyan

@(
  "src\pages\index.astro",
  "src\components\WriterFeature.astro",
  "src\data\featuredWriting.js",
  "src\styles\launch.css",
  "src\pages\read\fiction-feature\index.astro",
  "src\pages\writer\fiction-feature\index.astro"
) | ForEach-Object { Backup-File $_ }

# Keep the writer data tiny and editable.
@'
export const featuredWriting = {
  enabled: true,
  eyebrow: "FICTION",
  genre: "FANTASY / HORROR / SCI-FI",
  title: "Fiction Feature",
  author: "Writer Name",
  slug: "fiction-feature",
  excerpt: "A new fiction feature is being prepared.",
  image: "",
  photo: "",
  bio: "Fantasy, horror and science-fiction writer."
};
'@ | Set-Content "src\data\featuredWriting.js" -Encoding UTF8

# Artifact-style feature: work first, writer second.
@'
---
const { feature } = Astro.props;
---
{feature?.enabled && (
  <article class="story-artifact">
    <a class="story-artifact__visual" href={`/read/${feature.slug}/`} aria-label={`Read ${feature.title}`}>
      {feature.image ? (
        <img src={feature.image} alt="" loading="lazy" />
      ) : (
        <div class="story-artifact__placeholder" aria-hidden="true">
          <span>DRAGON</span>
        </div>
      )}
    </a>

    <div class="story-artifact__content">
      <div class="story-artifact__meta">
        <span>{feature.eyebrow}</span>
        <span>{feature.genre}</span>
      </div>

      <h2><a href={`/read/${feature.slug}/`}>{feature.title}</a></h2>
      <a class="story-artifact__author" href={`/writer/${feature.slug}/`}>
        {feature.author}
      </a>

      <p>{feature.excerpt}</p>

      <div class="story-artifact__actions">
        <a href={`/read/${feature.slug}/`}>READ →</a>
        <a href={`/writer/${feature.slug}/`}>WRITER →</a>
      </div>
    </div>
  </article>
)}
'@ | Set-Content "src\components\WriterFeature.astro" -Encoding UTF8

# Replace TODAY homepage with compact broadcast board.
@'
---
import SiteLayout from '../layouts/SiteLayout.astro';
import LaunchHeader from '../components/LaunchHeader.astro';
import WriterFeature from '../components/WriterFeature.astro';
import { featuredWriting } from '../data/featuredWriting.js';
---
<SiteLayout
  title="Today — DragonsRitual"
  description="Dragon Radio, fiction, broadcasts and current releases."
>
  <LaunchHeader />

  <main class="today-shell">
    <section class="today-board">
      <div class="today-broadcast">
        <div class="dragon-stamp" aria-label="Dragon">DRAGON</div>

        <div class="today-broadcast__status">
          <span class="launch-live-dot"></span>
          <span>ON AIR</span>
        </div>

        <h1>Dragon Radio</h1>
        <p class="today-deck">Independent music, podcasts and interviews.</p>

        <div class="today-now">
          <span class="today-now__label">NOW PLAYING</span>
          <strong id="today-track">LIVE SIGNAL</strong>
          <span id="today-artist">Independent music</span>
        </div>

        <a class="primary-action today-tune" href="/radio/">
          <span class="launch-live-dot"></span>
          TUNE IN
        </a>
      </div>

      <WriterFeature feature={featuredWriting} />
    </section>

    <section class="today-section today-feed" id="today">
      <header class="section-head compact-section-head">
        <div>
          <p class="launch-eyebrow">TODAY</p>
          <h2>Current.</h2>
        </div>
      </header>

      <div class="today-feed-grid">
        <a class="today-feed-card" href="/radio/">
          <div>
            <span class="today-feed-card__type">RADIO</span>
            <strong id="feed-track">Dragon Radio</strong>
            <small id="feed-artist">All Signal</small>
          </div>
          <b>LISTEN →</b>
        </a>

        <a class="today-feed-card" href={`/read/${featuredWriting.slug}/`}>
          <div>
            <span class="today-feed-card__type">FICTION</span>
            <strong>{featuredWriting.title}</strong>
            <small>{featuredWriting.author}</small>
          </div>
          <b>READ →</b>
        </a>
      </div>
    </section>
  </main>

  <footer class="launch-footer">
    <strong>DRAGONSRITUAL</strong>
    <span>© 2026</span>
  </footer>

  <script>
    fetch('/radio/library.json?' + Date.now())
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => {
        const track = (data.tracks || []).find((item) => item.src);
        if (!track) return;

        const title = track.title || 'Dragon Radio';
        const artist = track.artist || 'Independent music';

        document.querySelectorAll('#today-track, #feed-track').forEach((el) => {
          el.textContent = title;
        });

        document.querySelectorAll('#today-artist, #feed-artist').forEach((el) => {
          el.textContent = artist;
        });
      })
      .catch(() => {});
  </script>
</SiteLayout>
'@ | Set-Content "src\pages\index.astro" -Encoding UTF8

# Guarantee the nested imports stay fixed.
foreach ($page in @(
  "src\pages\read\fiction-feature\index.astro",
  "src\pages\writer\fiction-feature\index.astro"
)) {
  if (Test-Path $page) {
    $text = Get-Content $page -Raw
    $text = $text.Replace('../../layouts/SiteLayout.astro','../../../layouts/SiteLayout.astro')
    $text = $text.Replace('../../data/featuredWriting.js','../../../data/featuredWriting.js')
    Set-Content $page $text -Encoding UTF8
  }
}

# PASS 06 overrides. Old styles remain harmlessly below the hood.
@'

/* =========================================================
   DRAGON TODAY ARTIFACT — PASS 06
   Compact broadcast board + fiction artifact
   ========================================================= */

.today-board{
  display:grid;
  grid-template-columns:minmax(0,1.08fr) minmax(330px,.92fr);
  min-height:520px;
  border-bottom:1px solid rgba(227,187,69,.24);
}

.today-broadcast{
  position:relative;
  display:flex;
  flex-direction:column;
  justify-content:center;
  padding:clamp(48px,7vw,92px) clamp(28px,6vw,74px) clamp(48px,7vw,82px) 0;
  border-right:1px solid rgba(227,187,69,.22);
}

.dragon-stamp{
  width:max-content;
  margin:0 0 38px;
  padding:8px 13px 7px;
  border:2px solid var(--launch-gold);
  color:var(--launch-gold);
  font:900 clamp(20px,2vw,29px)/1 system-ui,sans-serif;
  letter-spacing:.14em;
  transform:rotate(-1.2deg);
  box-shadow:0 0 0 1px rgba(227,187,69,.12) inset;
}

.today-broadcast__status{
  display:flex;
  align-items:center;
  gap:9px;
  margin-bottom:14px;
  color:#8e95a1;
  font:900 8px/1 system-ui,sans-serif;
  letter-spacing:.17em;
}

.today-broadcast h1{
  margin:0;
  font:500 clamp(48px,6vw,82px)/.92 Georgia,serif;
  letter-spacing:-.045em;
}

.today-deck{
  max-width:560px;
  margin:18px 0 0;
  color:#9ca3af;
  font:400 clamp(15px,1.3vw,18px)/1.65 Georgia,serif;
}

.today-now{
  margin-top:34px;
  display:grid;
  gap:5px;
}
.today-now__label{
  color:var(--launch-gold);
  font:900 7px/1 system-ui,sans-serif;
  letter-spacing:.18em;
}
.today-now strong{
  font:500 23px/1.15 Georgia,serif;
}
.today-now>span:last-child{
  color:#838b98;
  font:400 11px/1.4 system-ui,sans-serif;
}

.today-tune{
  width:max-content;
  margin-top:24px;
  min-width:150px;
  justify-content:center;
}

/* Fiction artifact occupies the old LIVE SIGNAL real estate */
.story-artifact{
  min-width:0;
  display:grid;
  grid-template-rows:minmax(230px,1.05fr) auto;
  background:
    radial-gradient(circle at 70% 20%,rgba(88,43,32,.24),transparent 36%),
    linear-gradient(155deg,#151014,#090a0e 72%);
  overflow:hidden;
}

.story-artifact__visual{
  position:relative;
  display:block;
  min-height:230px;
  overflow:hidden;
  border-bottom:1px solid rgba(227,187,69,.22);
  text-decoration:none;
  color:inherit;
}
.story-artifact__visual img{
  width:100%;
  height:100%;
  position:absolute;
  inset:0;
  object-fit:cover;
  filter:saturate(.86) contrast(1.03);
}
.story-artifact__visual::after{
  content:"";
  position:absolute;
  inset:0;
  background:linear-gradient(180deg,transparent 50%,rgba(4,5,8,.68));
  pointer-events:none;
}

.story-artifact__placeholder{
  position:absolute;
  inset:0;
  display:grid;
  place-items:center;
  background:
    radial-gradient(circle at 50% 42%,rgba(113,43,33,.35),transparent 22%),
    repeating-linear-gradient(135deg,rgba(255,255,255,.015) 0 1px,transparent 1px 9px),
    #0c0b0f;
}
.story-artifact__placeholder span{
  padding:9px 11px 8px;
  border:1px solid rgba(227,187,69,.55);
  color:rgba(227,187,69,.85);
  font:900 12px/1 system-ui,sans-serif;
  letter-spacing:.17em;
}

.story-artifact__content{
  padding:24px 26px 28px;
}
.story-artifact__meta{
  display:flex;
  justify-content:space-between;
  gap:15px;
  color:#777e89;
  font:900 6px/1.2 system-ui,sans-serif;
  letter-spacing:.16em;
}
.story-artifact__meta span:first-child{color:var(--launch-gold)}

.story-artifact h2{
  margin:14px 0 5px;
  font:500 clamp(28px,3vw,42px)/.96 Georgia,serif;
  letter-spacing:-.03em;
}
.story-artifact h2 a,
.story-artifact__author,
.story-artifact__actions a{
  color:inherit;
  text-decoration:none;
}
.story-artifact__author{
  color:#a2a8b3;
  font:800 8px/1 system-ui,sans-serif;
  letter-spacing:.12em;
  text-transform:uppercase;
}
.story-artifact p{
  margin:17px 0 0;
  color:#8f96a3;
  font:400 12px/1.65 Georgia,serif;
}
.story-artifact__actions{
  display:flex;
  gap:22px;
  margin-top:20px;
  color:var(--launch-gold);
  font:900 7px/1 system-ui,sans-serif;
  letter-spacing:.14em;
}

/* Current feed: deliberately small */
.today-feed{
  padding-top:48px;
}
.compact-section-head{
  margin-bottom:18px;
}
.compact-section-head h2{
  font-size:clamp(32px,3.4vw,46px);
}
.today-feed-grid{
  display:grid;
  grid-template-columns:repeat(2,minmax(0,1fr));
  gap:10px;
}
.today-feed-card{
  min-height:106px;
  padding:18px 20px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:24px;
  border:1px solid var(--launch-line);
  background:#0b0c10;
  color:inherit;
  text-decoration:none;
}
.today-feed-card>div{
  min-width:0;
  display:flex;
  flex-direction:column;
  gap:5px;
}
.today-feed-card__type{
  color:var(--launch-gold);
  font:900 6px/1 system-ui,sans-serif;
  letter-spacing:.17em;
}
.today-feed-card strong{
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
  font:500 20px/1.1 Georgia,serif;
}
.today-feed-card small{
  color:#7f8794;
  font:500 9px/1.4 system-ui,sans-serif;
}
.today-feed-card b{
  flex:0 0 auto;
  color:#8c939e;
  font:900 7px/1 system-ui,sans-serif;
  letter-spacing:.13em;
}

/* Supersede PASS 05's bottom widget */
.writer-feature{display:none!important}

@media(max-width:760px){
  .today-board{
    grid-template-columns:1fr;
    min-height:0;
  }

  .today-broadcast{
    padding:42px 0 36px;
    border-right:0;
    border-bottom:1px solid rgba(227,187,69,.22);
  }

  .dragon-stamp{
    margin-bottom:28px;
    font-size:20px;
  }

  .today-broadcast h1{
    font-size:clamp(48px,14vw,66px);
  }

  .today-deck{
    margin-top:13px;
    font-size:15px;
  }

  .today-now{
    margin-top:25px;
  }

  .today-tune{
    width:100%;
    min-height:52px;
    margin-top:22px;
  }

  .story-artifact{
    grid-template-rows:220px auto;
    border-left:0;
  }

  .story-artifact__visual{
    min-height:220px;
  }

  .story-artifact__content{
    padding:22px 18px 24px;
  }

  .story-artifact h2{
    font-size:31px;
  }

  .story-artifact p{
    font-size:13px;
  }

  .today-feed{
    padding-top:42px;
  }

  .today-feed-grid{
    grid-template-columns:1fr;
  }

  .today-feed-card{
    min-height:92px;
    padding:16px;
  }
}
'@ | Add-Content "src\styles\launch.css" -Encoding UTF8

Write-Host ""
Write-Host "PASS 06 INSTALLED." -ForegroundColor Green
Write-Host "TODAY: broadcast left / fiction artifact right." -ForegroundColor Green
Write-Host "DRAGON is now the stamp, not an explanation." -ForegroundColor Yellow
Write-Host ""
Write-Host "Run: npm run build" -ForegroundColor Cyan
Write-Host "Then: npm run dev" -ForegroundColor Cyan
