export class HUD{
  constructor(bus,state,waves){
    this.bus=bus;this.state=state;this.waves=waves;
    this.feed=document.getElementById('eventFeed');
    this.bind();
  }
  bind(){
    this.bus.on('notice',e=>this.push(e.type||'realm',e.text));
    this.bus.on('wave:start',e=>this.push('combat',`Incursion ${e.wave} has begun. ${e.count} hostiles are moving on the Hold.`));
    this.bus.on('wave:end',e=>this.push('growth',`Wave ${e.wave} survived. The Realm awards ${e.reward} Gold.`));
    this.bus.on('enemy:killed',()=>{});
  }
  push(type,text){
    const el=document.createElement('div');el.className=`feed-item ${type}`;el.innerHTML=`<b>${type.toUpperCase()}</b><span>${text}</span>`;
    this.feed.prepend(el);while(this.feed.children.length>5)this.feed.lastElementChild.remove();
    setTimeout(()=>{el.style.opacity='0';setTimeout(()=>el.remove(),350)},6500);
  }
  update(player,hall){
    const s=this.state,b=s.bank;
    for(const [id,val] of [['bankWood',b.wood],['bankStone',b.stone],['bankGold',b.gold],['bankEssence',b.essence],['carryWood',player.carry.wood],['carryStone',player.carry.stone],['carryFood',player.carry.food||0],['bankIron',b.iron||0],['bankGems',b.gems||0],['bankProvisions',b.provisions||0]])document.getElementById(id).textContent=Math.floor(val);
    document.getElementById('playerHpFill').style.width=`${Math.max(0,player.health/player.maxHealth*100)}%`;
    document.getElementById('playerHpText').textContent=Math.ceil(player.health);
    document.getElementById('hallHpFill').style.width=`${Math.max(0,hall.health/hall.maxHealth*100)}%`;
    document.getElementById('hallHpText').textContent=`${Math.ceil(Math.max(0,hall.health/hall.maxHealth*100))}%`;
    document.getElementById('phaseLabel').textContent=this.waves.phase==='prep'?'NEXT INCURSION':'INCURSION ACTIVE';
    document.getElementById('waveLabel').textContent=`WAVE ${this.waves.wave}`;
    document.getElementById('timerLabel').textContent=this.waves.phase==='prep'?this.time(this.waves.timer):`${this.waves.enemies.length+this.waves.spawnQueue} REMAIN`;
    document.getElementById('killCount').textContent=this.waves.totalKills;
    document.getElementById('survivalTime').textContent=this.time(s.survival);
    document.getElementById('bestWave').textContent=s.bestWave;
    document.getElementById('powerLevel').textContent=this.roman(s.upgrades.power);
    document.getElementById('vitalityLevel').textContent=this.roman(s.upgrades.vitality);
    document.getElementById('speedLevel').textContent=this.roman(s.upgrades.speed);
    const need=100+(player.level-1)*55;
    document.getElementById('xpFill').style.width=`${Math.min(100,player.xp/need*100)}%`;
    document.getElementById('xpText').textContent=`${Math.floor(player.xp)}/${need}`;
    document.getElementById('wizardLevel').textContent=player.level;
  }
  time(sec){sec=Math.max(0,Math.floor(sec));return `${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`}
  roman(n){return ['0','I','II','III','IV','V','VI','VII','VIII'][n]||String(n)}
}