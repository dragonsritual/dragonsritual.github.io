
(function(){
'use strict';
const NS=window.NINTH_SPIRE;
function board(){
 const p=NS.profile.get();
 return [{
  rank:1,local:true,wizardId:p.wizardId,name:p.name||'Unnamed Wizard',level:p.level||1,
  floor:p.highestFloor||1,wins:p.wins||0,bosses:p.bosses||0,score:p.leaguePoints||0
 }];
}
NS.league={
 current:{id:'founding-era',name:'Founding Era',startsAt:null,endsAt:null},
 board,
 categories:[
  {id:'tower',label:'Highest Floor',field:'floor'},
  {id:'legacy',label:'Legacy Score',field:'score'},
  {id:'hunts',label:'Creatures Defeated',field:'wins'},
  {id:'bosses',label:'Bosses Defeated',field:'bosses'}
 ]
};
})();
