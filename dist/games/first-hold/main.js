import {Game} from './core/Game.js?v=46S';

const canvas=document.getElementById('game');
let game=new Game(canvas);

document.getElementById('startBtn').addEventListener('click',()=>{
  document.getElementById('intro').hidden=true;
  game.start();
});

document.getElementById('restartBtn').addEventListener('click',()=>{
  document.getElementById('gameover').hidden=true;
  game=new Game(canvas);
  game.start();
});

// Parent site can ask for a lightweight run snapshot later.
addEventListener('message',e=>{
  if(e.origin!==location.origin||!e.data)return;
  if(e.data.type==='DRAGON_FIRST_HOLD_SNAPSHOT'){
    parent.postMessage({type:'DRAGON_FIRST_HOLD_STATE',state:{
      wave:game?.waves?.wave||1,
      survival:game?.state?.survival||0,
      kills:game?.waves?.totalKills||0,
      bank:game?.state?.bank||{}
    }},location.origin);
  }
});