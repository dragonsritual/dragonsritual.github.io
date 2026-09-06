
(function(){
'use strict';
const NS=window.NINTH_SPIRE;
function pickWeighted(arr){
 const sum=arr.reduce((a,x)=>a+(x.weight||1),0);let r=Math.random()*sum;
 for(const x of arr){r-=x.weight||1;if(r<=0)return x;}return arr[arr.length-1];
}
function pick(arr){return arr[Math.floor(Math.random()*arr.length)];}
function rarityForFloor(floor,luck=0){
 const rs=NS.DATA.rarities.map(r=>({...r}));
 if(floor>=5){rs.find(x=>x.id==='rare').weight+=4;rs.find(x=>x.id==='epic').weight+=2;}
 if(floor>=8){rs.find(x=>x.id==='legendary').weight+=1;}
 if(luck>0){rs.find(x=>x.id==='common').weight=Math.max(10,58-luck*2);rs.find(x=>x.id==='rare').weight+=luck;}
 return pickWeighted(rs);
}
function validAffixes(list,tier){return list.filter(a=>(a.minTier||1)<=tier);}
function build(floor=1,type=null,luck=0,source='Unknown'){
 const tier=Math.max(1,Math.ceil(floor/2));
 const bases=NS.DATA.bases.filter(b=>(!type||b.type===type)&&b.tier<=Math.min(5,tier+1));
 const base=pick(bases.length?bases:NS.DATA.bases);
 const rarity=rarityForFloor(floor,luck);
 const aff=[];
 const pre=validAffixes(NS.DATA.affixes.prefixes,tier), suf=validAffixes(NS.DATA.affixes.suffixes,tier);
 for(let i=0;i<rarity.affixes;i++){
   const pool=i%2===0?pre:suf; if(pool.length){const a=pick(pool); if(!aff.find(x=>x.id===a.id))aff.push(a);}
 }
 const mods={...(base.base||{})};
 aff.forEach(a=>Object.entries(a.mods||{}).forEach(([k,v])=>mods[k]=(mods[k]||0)+v));
 const prefix=aff.find(a=>NS.DATA.affixes.prefixes.some(x=>x.id===a.id));
 const suffix=aff.find(a=>NS.DATA.affixes.suffixes.some(x=>x.id===a.id));
 const name=[prefix?.name,base.name,suffix?.name].filter(Boolean).join(' ');
 return {
   id:NS.uid(),catalogId:base.id,name,type:base.type,slot:base.type,
   rarity:rarity.id,rarityLabel:rarity.label,bonuses:mods,
   floor,source,foundAt:NS.nowIso(),provenance:[{type:'found',by:NS.profile?.get()?.name||'Unknown',where:source,at:NS.nowIso()}],
   score:rarity.score + Object.values(mods).reduce((a,v)=>a+Math.max(0,Number(v)||0),0)
 };
}
NS.loot={build};
})();
