(()=>{
  if(window.__dragonStageManagerInstalled)return;
  window.__dragonStageManagerInstalled=true;

  const ORDER=['today','stories','gaming','creators','tools','media','community','archive'];
  const ROOT={today:'/',stories:'/journal/',gaming:'/gaming/',creators:'/creators/',tools:'/tools/',media:'/media/',community:'/community/',archive:'/archive/'};
  const KEY='dr-stage-state-v1';
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let wheelX=0,wheelTimer=0;

  const pathOf=(value=location.href)=>{try{return new URL(value,location.href).pathname}catch{return location.pathname}};
  const deptFor=(path=location.pathname)=>{
    if(path==='/'||path.startsWith('/today'))return 'today';
    if(path.startsWith('/journal')||path.startsWith('/stories'))return 'stories';
    if(path.startsWith('/gaming')||path.startsWith('/projects'))return 'gaming';
    if(path.startsWith('/creators'))return 'creators';
    if(path.startsWith('/tools'))return 'tools';
    if(path.startsWith('/media')||path.startsWith('/live')||path.startsWith('/radio'))return 'media';
    if(path.startsWith('/community')||path.startsWith('/forum'))return 'community';
    if(path.startsWith('/archive'))return 'archive';
    return null;
  };
  const read=()=>{try{return JSON.parse(sessionStorage.getItem(KEY)||'{}')}catch{return {}}};
  const write=s=>sessionStorage.setItem(KEY,JSON.stringify(s));
  const remember=(dept=deptFor())=>{
    if(!dept)return;
    const s=read();
    s[dept]={url:location.pathname+location.search+location.hash,scrollX:scrollX,scrollY:scrollY,at:Date.now()};
    write(s);
  };
  const targetFor=dept=>read()[dept]?.url||ROOT[dept];
  const setDir=(from,to)=>{
    const a=ORDER.indexOf(from),b=ORDER.indexOf(to);
    if(a<0||b<0||a===b)return;
    const dir=b>a?'forward':'back';
    document.documentElement.dataset.railDirection=dir;
    sessionStorage.setItem('dr-rail-direction',dir);
  };
  const syncRail=()=>{
    const current=deptFor();
    const state=read();
    document.querySelectorAll('[data-dr-rail] a[data-department]').forEach(a=>{
      const dept=a.dataset.department;
      const on=dept===current;
      a.classList.toggle('is-active',on);
      if(on)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
      if(!on && state[dept]?.url)a.href=state[dept].url;
      else if(ROOT[dept])a.href=ROOT[dept];
    });
  };
  const restoreScroll=()=>{
    const dept=deptFor(),s=read()[dept];
    if(!s)return;
    const here=location.pathname+location.search+location.hash;
    if(s.url===here && Number.isFinite(s.scrollY)) requestAnimationFrame(()=>requestAnimationFrame(()=>scrollTo(s.scrollX||0,s.scrollY||0)));
  };

  // Department rail: remember the exact room we are leaving, then travel to the remembered room in the destination department.
  document.addEventListener('click',e=>{
    const a=e.target.closest?.('[data-dr-rail] a[data-department]');
    if(!a||e.defaultPrevented||e.button>0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
    const from=deptFor(),to=a.dataset.department;
    if(!from||!to||from===to)return;
    remember(from); setDir(from,to);
    const destination=targetFor(to);
    if(pathOf(a.href)!==pathOf(destination)||new URL(a.href,location.href).search!==new URL(destination,location.href).search){a.href=destination}
  },true);

  // Remember depth continuously without thrashing storage.
  let saveTimer=0;
  addEventListener('scroll',()=>{clearTimeout(saveTimer);saveTimer=setTimeout(()=>remember(),120)},{passive:true});
  addEventListener('pagehide',()=>remember());

  document.addEventListener('astro:before-swap',e=>{
    remember();
    const dir=sessionStorage.getItem('dr-rail-direction')||'forward';
    try{e.newDocument.documentElement.dataset.railDirection=dir}catch{}
  });
  document.addEventListener('astro:page-load',()=>{syncRail();restoreScroll();syncDock()});

  // Trackpad: one deliberate horizontal gesture moves exactly one department.
  addEventListener('wheel',e=>{
    if(innerWidth<780||Math.abs(e.deltaX)<Math.abs(e.deltaY)*1.35||Math.abs(e.deltaX)<2)return;
    wheelX+=e.deltaX; clearTimeout(wheelTimer);
    wheelTimer=setTimeout(()=>{
      const from=deptFor(),i=ORDER.indexOf(from); if(i<0){wheelX=0;return}
      if(Math.abs(wheelX)>=105){
        const ni=Math.max(0,Math.min(ORDER.length-1,i+(wheelX>0?1:-1)));
        if(ni!==i){remember(from);setDir(from,ORDER[ni]);location.href=targetFor(ORDER[ni])}
      }
      wheelX=0;
    },85);
  },{passive:true});

  const syncDock=()=>{const dock=document.getElementById('dragon-media-dock');if(!dock)return;const active=sessionStorage.getItem('dr-media-active')==='1';dock.hidden=!(active&&deptFor()!=='media')};
  document.addEventListener('click',e=>{
    if(e.target.closest?.('[data-dr-media-start]'))sessionStorage.setItem('dr-media-active','1');
    if(e.target.closest?.('[data-dock-return]')){remember();setDir(deptFor(),'media');location.href=targetFor('media')}
    if(e.target.closest?.('[data-dock-close]')){sessionStorage.removeItem('dr-media-active');syncDock()}
  });

  syncRail(); syncDock();
})();
