import {CONFIG} from '../data/config.js?v=46S';

export class BuildSystem{
  constructor(bus,world,state){this.bus=bus;this.world=world;this.state=state;this.selected=null}
  canAfford(cost){const b=this.state.bank;return b.wood>=cost.wood&&b.stone>=cost.stone&&b.gold>=cost.gold&&b.essence>=cost.essence}
  pay(cost){for(const k of ['wood','stone','gold','essence'])this.state.bank[k]-=cost[k]||0}
  select(type){this.selected=this.selected===type?null:type;this.bus.emit('build:selected',this.selected)}
  cancel(){this.selected=null;this.bus.emit('build:selected',null)}
  place(x,y){
    if(!this.selected)return false;
    const def=CONFIG.build[this.selected];
    if(!this.canAfford(def.cost)){this.bus.emit('notice',{type:'build',text:'The Hold lacks the materials for that structure.'});return false}
    if(Math.hypot(x-CONFIG.hall.x,y-CONFIG.hall.y)>(520+((this.state.holdLevel||1)-1)*45)){this.bus.emit('notice',{type:'build',text:'Build inside the Hold’s current reach.'});return false}
    if(this.world.collidesBuild(x,y,def.size)){this.bus.emit('notice',{type:'build',text:'Another structure blocks that ground.'});return false}
    this.pay(def.cost);
    this.bus.emit('notice',{type:'build',text:`Realm Stores spent ${def.cost.wood||0} Wood + ${def.cost.stone||0} Stone on ${def.name}.`});
    const b=this.world.place(this.selected,x,y);
    this.bus.emit('notice',{type:'build',text:`${def.name} foundation placed. Construction has begun.`});
    this.selected=null;this.bus.emit('build:selected',null);return !!b;
  }
  upgradeNearby(player){
    const b=this.world.nearestBuilding(player,100);
    if(!b){this.bus.emit('notice',{type:'build',text:'Stand near a structure to upgrade it.'});return}
    if(!b.complete){this.bus.emit('notice',{type:'build',text:'Finish construction before upgrading this structure.'});return}
    if(b.level>=3){this.bus.emit('notice',{type:'build',text:'That structure has reached its current limit.'});return}
    const cost={wood:8*b.level,stone:7*b.level,gold:8*b.level,essence:b.type==='shrine'?2*b.level:0};
    if(!this.canAfford(cost)){this.bus.emit('notice',{type:'build',text:`Upgrade requires ${cost.wood} Wood, ${cost.stone} Stone and ${cost.gold} Gold.`});return}
    this.pay(cost);b.level++;b.maxHealth=Math.round(b.maxHealth*1.45);b.health=b.maxHealth;
    this.bus.emit('notice',{type:'build',text:`${CONFIG.build[b.type].name} advanced to Tier ${b.level}.`});
    this.bus.emit('build:upgraded',b);
  }
}