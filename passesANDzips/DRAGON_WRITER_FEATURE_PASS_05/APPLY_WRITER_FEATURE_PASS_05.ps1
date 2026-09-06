$ErrorActionPreference="Stop"
if(-not(Test-Path ".git") -or -not(Test-Path "src\pages\index.astro")){throw "Run from dragonsritual.github.io root."}
$stamp=Get-Date -Format "yyyyMMdd-HHmmss"
$backup=".migration-backups\writer-feature-$stamp"
New-Item -ItemType Directory -Force $backup|Out-Null
Copy-Item "src\pages\index.astro" $backup -Force
New-Item -ItemType Directory -Force "src\data","src\components","src\pages\read\fiction-feature","src\pages\writer\fiction-feature"|Out-Null
@'
export const featuredWriting = {
 enabled: true,
 eyebrow: "FICTION",
 genre: "FANTASY / HORROR / SCI-FI",
 title: "Fiction Feature",
 author: "Writer Name",
 slug: "fiction-feature",
 excerpt: "A new fiction feature is being prepared.",
 photo: "",
 bio: "Fantasy, horror and science-fiction writer."
};
'@ | Set-Content "src\data\featuredWriting.js" -Encoding UTF8
@'
---
const { feature }=Astro.props;
---
{feature.enabled && <section class="writer-feature">
 <div class="writer-feature__top"><span>{feature.eyebrow}</span><span>{feature.genre}</span></div>
 <div class="writer-feature__body">
  <a class="writer-feature__portrait" href={`/writer/${feature.slug}/`}>{feature.photo ? <img src={feature.photo} alt="" /> : <span>{feature.author.slice(0,1)}</span>}</a>
  <div>
   <h2><a href={`/read/${feature.slug}/`}>{feature.title}</a></h2>
   <a class="writer-feature__author" href={`/writer/${feature.slug}/`}>{feature.author}</a>
   <p>{feature.excerpt}</p>
   <div class="writer-feature__actions"><a href={`/read/${feature.slug}/`}>READ STORY →</a><a href={`/writer/${feature.slug}/`}>WRITER →</a></div>
  </div>
 </div>
</section>}
'@ | Set-Content "src\components\WriterFeature.astro" -Encoding UTF8
$index=Get-Content "src\pages\index.astro" -Raw
if($index -notmatch 'WriterFeature'){
 $index=$index -replace '(?s)^---\s*',"---`r`nimport WriterFeature from `"../components/WriterFeature.astro`";`r`nimport { featuredWriting } from `"../data/featuredWriting.js`";`r`n"
 $index=$index.Replace('</SiteLayout>',"  <WriterFeature feature={featuredWriting} />`r`n</SiteLayout>")
 Set-Content "src\pages\index.astro" $index -Encoding UTF8
}
@'
---
import SiteLayout from "../../layouts/SiteLayout.astro";
import { featuredWriting as feature } from "../../data/featuredWriting.js";
---
<SiteLayout title={`${feature.title} — DragonsRitual`}>
<main class="reading-page"><a class="reading-page__back" href="/">← TODAY</a><div class="reading-page__meta">{feature.eyebrow} · {feature.genre}</div><h1>{feature.title}</h1><a class="reading-page__author" href={`/writer/${feature.slug}/`}>{feature.author}</a><p class="reading-page__lead">{feature.excerpt}</p><div class="reading-page__story"><p>Full story coming soon.</p></div></main>
</SiteLayout>
'@ | Set-Content "src\pages\read\fiction-feature\index.astro" -Encoding UTF8
@'
---
import SiteLayout from "../../layouts/SiteLayout.astro";
import { featuredWriting as feature } from "../../data/featuredWriting.js";
---
<SiteLayout title={`${feature.author} — DragonsRitual`}>
<main class="writer-page"><a class="reading-page__back" href="/">← TODAY</a><div class="writer-page__identity">{feature.photo ? <img src={feature.photo} alt="" /> : <div class="writer-page__initial">{feature.author.slice(0,1)}</div>}<div><div class="writer-page__label">WRITER</div><h1>{feature.author}</h1><p>{feature.bio}</p></div></div><section class="writer-page__work"><div class="writer-page__label">FICTION</div><a href={`/read/${feature.slug}/`}><strong>{feature.title}</strong><span>{feature.genre}</span></a></section></main>
</SiteLayout>
'@ | Set-Content "src\pages\writer\fiction-feature\index.astro" -Encoding UTF8
@'

/* WRITER FEATURE PASS 05 */
.writer-feature{margin:28px auto 0;max-width:760px;border:1px solid rgba(211,174,91,.34);background:rgba(12,10,10,.72);padding:16px}.writer-feature__top{display:flex;justify-content:space-between;gap:12px;margin-bottom:15px;font-size:.68rem;letter-spacing:.16em;text-transform:uppercase;opacity:.72}.writer-feature__body{display:grid;grid-template-columns:58px minmax(0,1fr);gap:14px}.writer-feature__portrait{width:58px;height:70px;display:grid;place-items:center;border:1px solid rgba(211,174,91,.28);overflow:hidden;color:inherit;text-decoration:none}.writer-feature__portrait img{width:100%;height:100%;object-fit:cover}.writer-feature h2{font-size:clamp(1.15rem,5vw,1.55rem);line-height:1.05;margin:0 0 5px}.writer-feature h2 a,.writer-feature__author,.writer-feature__actions a{color:inherit;text-decoration:none}.writer-feature__author{font-size:.78rem;letter-spacing:.08em;text-transform:uppercase;opacity:.72}.writer-feature p{margin:12px 0 14px;line-height:1.55;opacity:.84;font-size:.92rem}.writer-feature__actions{display:flex;gap:18px;flex-wrap:wrap;font-size:.72rem;letter-spacing:.1em;font-weight:700}.reading-page,.writer-page{width:min(760px,calc(100% - 32px));margin:0 auto;padding:38px 0 80px}.reading-page__back{display:inline-block;margin-bottom:42px;color:inherit;text-decoration:none;font-size:.72rem;letter-spacing:.12em;opacity:.7}.reading-page__meta,.writer-page__label{font-size:.68rem;letter-spacing:.16em;text-transform:uppercase;opacity:.62}.reading-page h1,.writer-page h1{font-size:clamp(2rem,9vw,4rem);line-height:.96;margin:10px 0}.reading-page__author{color:inherit;text-decoration:none;opacity:.72}.reading-page__lead{font-size:1.08rem;line-height:1.7;margin:36px 0;border-left:1px solid rgba(211,174,91,.45);padding-left:18px}.reading-page__story{font-family:Georgia,serif;font-size:1.05rem;line-height:1.85;max-width:650px}.writer-page__identity{display:grid;grid-template-columns:78px 1fr;gap:18px;align-items:center;margin-top:20px}.writer-page__identity img,.writer-page__initial{width:78px;height:94px;object-fit:cover;border:1px solid rgba(211,174,91,.3)}.writer-page__initial{display:grid;place-items:center;font-family:serif;font-size:2rem}.writer-page__identity p{line-height:1.55;opacity:.78;margin:8px 0 0}.writer-page__work{margin-top:48px;border-top:1px solid rgba(211,174,91,.24);padding-top:18px}.writer-page__work a{display:flex;justify-content:space-between;gap:20px;color:inherit;text-decoration:none;padding:14px 0}.writer-page__work span{font-size:.72rem;opacity:.62;text-align:right}
'@ | Add-Content "src\styles\launch.css" -Encoding UTF8
Write-Host "WRITER FEATURE INSTALLED." -ForegroundColor Green
Write-Host "Edit later: src\data\featuredWriting.js" -ForegroundColor Yellow
Write-Host "Now run: npm run build" -ForegroundColor Cyan
