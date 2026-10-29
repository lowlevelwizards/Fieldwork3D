import {TacticalScene3D} from './breach-3d.ts';
import {newSession,team,enemies,type ShotEvent} from './breach-game.ts';
import {type Pt} from './breach-core.ts';

/**
 * Standalone developer presentation fixture. This does not call fire(),
 * does not determine a game hit, and is never included in breach.html.
 * Test-only shots demonstrate how the renderer handles authoritative events.
 */
const stage=new TacticalScene3D();
const session=newSession();
const rook=team(session)[0],moss=team(session)[1],target=enemies(session)[0];
rook.p={x:246,y:445};rook.heading=0;
moss.p={x:214,y:463};moss.heading=0;
target.p={x:333,y:445};target.heading=Math.PI;
enemies(session)[1].p={x:518,y:242};
stage.view.focus={x:318,y:390};
stage.view.zoom=1.75;
stage.updateCamera(1);
for(let row=0;row<19;row++)for(let col=0;col<16;col++)
  session.seenGround.add(col+','+row);
let last=performance.now();
function reset(){
  target.health=2;target.lastDownAt=-100;target.lastHitAt=-100;
  session.shots=[];session.sparks=[];
  stage.update(session,'rook',1/60);
}
function sample(kind:'miss'|'hit'|'down'){
  if(kind==='hit'&&target.health<=0)reset();
  if(kind==='down'&&target.health<=0)reset();
  const before=target.health;
  const damage=kind==='miss'?0:kind==='down'?before:1;
  target.health=Math.max(0,before-damage);
  if(damage)target.lastHitAt=session.seconds;
  if(target.health===0)target.lastDownAt=session.seconds;
  const targetPos:Pt=kind==='miss'?{x:target.p.x+22,y:target.p.y+17}:
    {...target.p};
  const shot:ShotEvent={
    id:session.nextShotId++,shooterId:rook.id,targetId:target.id,
    side:'blue',start:{...rook.p},end:targetPos,
    age:0,hit:damage>0,healthBefore:before,
    healthAfter:target.health,down:damage>0&&target.health===0,
  };
  session.shots.push(shot);
  document.querySelector('footer')!.textContent=
    kind==='down'?'DOWN · collapse and persistent body pose':
    kind==='hit'?'HIT · tracer, flinch and wound indication':
    'MISS · tracer and surface dust indication';
}
const action=(id:string,fn:()=>void)=>{
  document.getElementById(id)?.addEventListener('click',fn);
};
action('miss',()=>sample('miss'));
action('hit',()=>sample('hit'));
action('down',()=>sample('down'));
action('reset',reset);
action('iso',()=>stage.setMode('iso'));
action('top',()=>stage.setMode('top'));
const pointers=new Map<number,Pt>();
let lastMid:Pt|null=null,lastGap=0;
const dist=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const main=document.body;
main.addEventListener('pointerdown',e=>{
  if((e.target as Element).closest('button,header'))return;
  e.preventDefault();main.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointers.size===2){
    const [a,b]=[...pointers.values()];
    lastMid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};lastGap=dist(a,b);
  }
});
main.addEventListener('pointermove',e=>{
  const prior=pointers.get(e.pointerId);if(!prior)return;
  const next={x:e.clientX,y:e.clientY};
  const dx=next.x-prior.x,dy=next.y-prior.y;
  pointers.set(e.pointerId,next);
  if(pointers.size===2){
    const [a,b]=[...pointers.values()];
    const mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2},gap=dist(a,b);
    if(lastMid)stage.panBetween(lastMid.x,lastMid.y,mid.x,mid.y);
    if(lastGap>8)stage.zoomAt(gap/lastGap,mid.x,mid.y);
    lastMid=mid;lastGap=gap;
  }else stage.orbit(dx,dy);
});
const stop=(e:PointerEvent)=>{
  pointers.delete(e.pointerId);
  if(pointers.size<2){lastMid=null;lastGap=0;}
};
main.addEventListener('pointerup',stop);
main.addEventListener('pointercancel',stop);
window.addEventListener('wheel',e=>{
  e.preventDefault();stage.zoomAt(Math.exp(-e.deltaY*.001),e.clientX,e.clientY);
},{passive:false});
window.addEventListener('resize',()=>stage.resize(innerWidth,innerHeight));
function frame(now:number){
  const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;
  session.seconds+=dt; // Lab-only visual clock, not the tactical simulation.
  session.shots=session.shots.filter(s=>(s.age+=dt)<.4);
  stage.update(session,'rook',dt);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
