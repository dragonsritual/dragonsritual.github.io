$ErrorActionPreference="Stop"
if(-not(Test-Path ".git") -or -not(Test-Path "src\pages\index.astro")){throw "Run from dragonsritual.github.io root."}

New-Item -ItemType Directory -Force "src\data","src\components"|Out-Null

@'
export const archiveEntries = [
  { title:"Dragon Radio", category:"RADIO", type:"Live audio", href:"/radio/", keywords:["radio","music","audio","broadcast"], description:"Dragon Radio" },
  { title:"Fiction Feature", category:"FICTION", type:"Story", href:"/read/fiction-feature/", keywords:["fiction","fantasy","horror","sci-fi","writer","story"], description:"Featured fiction" },
  { title:"Writer", category:"FICTION", type:"Creator", href:"/writer/fiction-feature/", keywords:["writer","author","fiction","fantasy","horror","sci-fi"], description:"Writer profile" }
];
export const archiveCategoryOrder=["FICTION","RADIO","DRAGON TV","GAMES","ART","COMICS","PHOTOGRAPHY"];
'@ | Set-Content "src\data\siteArchive.js" -Encoding UTF8

@'
---
import { archiveEntries, archiveCategoryOrder } from "../data/siteArchive.js";
const payload = JSON.stringify({entries:archiveEntries,order:archiveCategoryOrder});
---
<div class="archive-search" id="archive-search" aria-hidden="true">
  <button class="archive-search__backdrop" type="button" data-search-close aria-label="Close search"></button>
  <section class="archive-search__panel" role="dialog" aria-modal="true" aria-label="Search DragonsRitual">
    <div class="archive-search__head"><div><span>DRAGONSRITUAL</span><strong>Search</strong></div><button type="button" data-search-close>ESC</button></div>
    <label class="archive-search__input-wrap"><span>SEARCH</span><input id="archive-search-input" type="search" placeholder="Title, creator, medium, subject..." autocomplete="off"></label>
    <div class="archive-search__status" id="archive-search-status">Browse the archive.</div>
    <div class="archive-search__results" id="archive-search-results"></div>
  </section>
  <script type="application/json" id="archive-search-data" set:html={payload}></script>
</div>

<script>
const root=document.querySelector('#archive-search');
const input=document.querySelector('#archive-search-input');
const results=document.querySelector('#archive-search-results');
const status=document.querySelector('#archive-search-status');
let data={entries:[],order:[]}; try{data=JSON.parse(document.querySelector('#archive-search-data')?.textContent||'{}')}catch{}
const norm=v=>(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const esc=v=>(v||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
function render(q=''){
 const filtered=data.entries.filter(e=>!q||norm([e.title,e.category,e.type,e.description,...(e.keywords||[])].join(' ')).includes(norm(q)));
 const cats=[...(data.order||[]),...filtered.map(e=>e.category)].filter((v,i,a)=>a.indexOf(v)===i);
 const groups=cats.map(c=>({c,items:filtered.filter(e=>e.category===c)})).filter(g=>g.items.length);
 status.textContent=q?`${filtered.length} result${filtered.length===1?'':'s'}`:'Browse the archive.';
 results.innerHTML=groups.length?groups.map(g=>`<section class="archive-search__group"><h2>${esc(g.c)}</h2><div>${g.items.map(e=>`<a class="archive-search__item" href="${esc(e.href)}"><strong>${esc(e.title)}</strong><span>${esc(e.type)}</span></a>`).join('')}</div></section>`).join(''):`<div class="archive-search__empty"><strong>No results.</strong><span>Try another title, medium, creator, or subject.</span></div>`;
}
function openSearch(){root.classList.add('is-open');root.setAttribute('aria-hidden','false');document.documentElement.classList.add('search-open');render('');setTimeout(()=>input?.focus(),0)}
function closeSearch(){root.classList.remove('is-open');root.setAttribute('aria-hidden','true');document.documentElement.classList.remove('search-open');if(input)input.value=''}
document.addEventListener('click',e=>{if(e.target.closest('[data-search-open]')){e.preventDefault();openSearch()} if(e.target.closest('[data-search-close]')){e.preventDefault();closeSearch()}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&root.classList.contains('is-open'))closeSearch(); else if(e.key==='/'&&!root.classList.contains('is-open')&&!['INPUT','TEXTAREA'].includes(document.activeElement?.tagName||'')){e.preventDefault();openSearch()}});
input?.addEventListener('input',()=>render(input.value.trim()));
</script>
'@ | Set-Content "src\components\ArchiveSearch.astro" -Encoding UTF8

$header=Get-Content "src\components\LaunchHeader.astro" -Raw
if($header -notmatch 'data-search-open'){
  $header=$header -replace '<a class="launch-tune" href="/radio/">','<button class="launch-search" type="button" data-search-open aria-label="Search archive">SEARCH</button><a class="launch-tune" href="/radio/">'
  Set-Content "src\components\LaunchHeader.astro" $header -Encoding UTF8
}

$layout=Get-Content "src\layouts\SiteLayout.astro" -Raw
if($layout -notmatch 'ArchiveSearch'){
  $layout=$layout -replace '(?s)^---\s*',"---`r`nimport ArchiveSearch from `"../components/ArchiveSearch.astro`";`r`n"
  $layout=$layout.Replace('</body>',"  <ArchiveSearch />`r`n</body>")
  Set-Content "src\layouts\SiteLayout.astro" $layout -Encoding UTF8
}

@'

/* ARCHIVE SEARCH PASS 07 */
.launch-search{border:0;background:transparent;color:#9299a5;font:900 7px system-ui,sans-serif;letter-spacing:.14em;cursor:pointer;margin-right:12px}
.search-open{overflow:hidden}.archive-search{position:fixed;inset:0;z-index:9999;display:none}.archive-search.is-open{display:block}.archive-search__backdrop{position:absolute;inset:0;border:0;width:100%;height:100%;background:rgba(2,3,5,.84);backdrop-filter:blur(8px)}.archive-search__panel{position:relative;width:min(1180px,calc(100% - 40px));max-height:calc(100vh - 70px);margin:34px auto;overflow:auto;border:1px solid rgba(227,187,69,.28);background:#090a0d;box-shadow:0 40px 120px rgba(0,0,0,.65)}.archive-search__head{position:sticky;top:0;z-index:2;display:flex;justify-content:space-between;align-items:center;padding:18px 22px;border-bottom:1px solid #242731;background:rgba(9,10,13,.96)}.archive-search__head>div{display:flex;align-items:baseline;gap:12px}.archive-search__head span{color:var(--launch-gold);font:900 7px system-ui,sans-serif;letter-spacing:.18em}.archive-search__head strong{font:500 28px Georgia,serif}.archive-search__head button{border:1px solid #2d3038;background:#0e0f13;color:#8c939e;padding:8px 10px}.archive-search__input-wrap{display:grid;grid-template-columns:90px 1fr;align-items:center;min-height:92px;padding:0 24px;border-bottom:1px solid #242731}.archive-search__input-wrap>span{color:#707783;font:900 7px system-ui,sans-serif;letter-spacing:.17em}.archive-search__input-wrap input{width:100%;border:0;outline:0;background:transparent;color:var(--launch-cream);font:500 clamp(25px,4vw,46px) Georgia,serif}.archive-search__status{padding:16px 24px 0;color:#6e7580;font:700 8px system-ui,sans-serif;letter-spacing:.12em}.archive-search__results{padding:22px 24px 30px;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:0}.archive-search__group{padding:0 20px 10px;border-left:1px solid #252832}.archive-search__group:first-child{border-left:0;padding-left:0}.archive-search__group h2{margin:0 0 17px;color:var(--launch-gold);font:900 8px system-ui,sans-serif;letter-spacing:.18em}.archive-search__item{padding:11px 0 12px;display:grid;gap:4px;border-top:1px solid #1e2129;color:inherit;text-decoration:none}.archive-search__item strong{font:600 17px Georgia,serif}.archive-search__item span{color:#6f7682;font:700 7px system-ui,sans-serif;letter-spacing:.11em;text-transform:uppercase}.archive-search__empty{grid-column:1/-1;min-height:180px;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:7px;color:#757c88}
@media(max-width:760px){.launch-search{width:34px;height:34px;border:1px solid #292d35;border-radius:50%;font-size:0;margin-right:8px;position:relative}.launch-search:before{content:"";position:absolute;width:10px;height:10px;border:1px solid #a1a7b1;border-radius:50%;left:9px;top:8px}.launch-search:after{content:"";position:absolute;width:7px;height:1px;background:#a1a7b1;transform:rotate(45deg);left:19px;top:20px}.archive-search__panel{width:100%;height:100%;max-height:none;margin:0;border:0}.archive-search__input-wrap{grid-template-columns:1fr;min-height:108px;align-content:center;gap:8px;padding:16px}.archive-search__input-wrap input{font-size:30px}.archive-search__results{padding:20px 16px 34px;grid-template-columns:1fr}.archive-search__group,.archive-search__group:first-child{padding:20px 0 12px;border-left:0;border-top:1px solid #252832}.archive-search__group:first-child{border-top:0}}
'@ | Add-Content "src\styles\launch.css" -Encoding UTF8

Write-Host "PASS 07 INSTALLED." -ForegroundColor Green
Write-Host "Run: npm run build" -ForegroundColor Cyan
Write-Host "Then: npm run dev" -ForegroundColor Cyan
