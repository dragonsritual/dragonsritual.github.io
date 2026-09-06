export class Input{
  constructor(canvas){
    this.keys=new Set();this.mouse={x:0,y:0,down:false,clicked:false};
    addEventListener('keydown',e=>{this.keys.add(e.code);if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault()});
    addEventListener('keyup',e=>this.keys.delete(e.code));
    canvas.addEventListener('mousemove',e=>{const r=canvas.getBoundingClientRect();this.mouse.x=(e.clientX-r.left)*(canvas.width/r.width);this.mouse.y=(e.clientY-r.top)*(canvas.height/r.height)});
    canvas.addEventListener('mousedown',()=>{this.mouse.down=true;this.mouse.clicked=true});
    addEventListener('mouseup',()=>this.mouse.down=false);
    canvas.addEventListener('contextmenu',e=>e.preventDefault());
  }
  down(code){return this.keys.has(code)}
  consumeClick(){const v=this.mouse.clicked;this.mouse.clicked=false;return v}
}