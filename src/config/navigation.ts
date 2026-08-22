export interface SiteNavItem { id:string; label:string; href:string; enabled:boolean; }
export const siteNavigation: SiteNavItem[] = [
 {id:'today',label:'Today',href:'/',enabled:true},
 {id:'stories',label:'Stories',href:'/journal/',enabled:true},
 {id:'gaming',label:'Gaming',href:'/gaming/',enabled:true},
 {id:'creators',label:'Creators',href:'/creators/',enabled:true},
 {id:'tools',label:'Tools',href:'/tools/',enabled:true},
 {id:'media',label:'Media',href:'/media/',enabled:true},
 {id:'community',label:'Community',href:'/community/',enabled:true},
 {id:'archive',label:'Archive',href:'/archive/',enabled:true}
];
