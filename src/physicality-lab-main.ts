/** Deterministic isolated tactical movement harness, not campaign state. */
import {activateSite,doorCenter,doorLeafSegment,segmentsCross,route,
  type Door,type Pt,type Side,type Obstacle,type Segment}
 from './breach-core.ts';
import {initDoor,advanceDoor,pushDoor,approachingDoorLeaf} from './breach-door.ts';
import {sweptBodyClear} from './breach-navigation.ts';
import {routeWithSqueezeWorld} from './breach-squeeze-route.ts';
import {friendlyPassingStep,opposingPassingStep} from './breach-friendly-traffic.ts';
import {resolveMovementFrame} from './breach-movement-authority.ts';
import {passageWait,type PassageLease} from './breach-passage.ts';
import type {Site} from './breach-site.ts';

type Unit={id:string;side:Side;p:Pt;goal:Pt;held:boolean;path:Pt[];
 blocked:string;blockedTicks:number;stalledTicks:number};
const el=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const canvas=el<HTMLCanvasElement>('stage'),ctx=canvas.getContext('2d')!;
const scenario=el<HTMLSelectElement>('scenario');
const traffic=el<HTMLSelectElement>('traffic'),doorsMode=el<HTMLSelectElement>('doors');
const speed=el<HTMLSelectElement>('speed');
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const wall=(x:number,y:number,u:number,v:number):Segment=>({a:{x,y},b:{x:u,y:v}});
const door=(id:string,x:number):Door=>({
 id,a:{x,y:211},b:{x,y:259},open:false,openedAt:-1,kind:'hinged',
 hinge:'a',swing:1,style:'wood'
});
let units:Unit[]=[],activeDoors:Door[]=[],walls:Segment[]=[],cover:Obstacle[]=[];
let elapsed=0,blockedTicks=0,overlaps=0,running=false;
let leases:Record<string,PassageLease>={};
const unit=(id:string,side:Side,x:number,y:number,gx:number,gy:number,held=false):Unit=>({
 id,side,p:{x,y},goal:{x:gx,y:gy},held,path:[],blocked:'clear',blockedTicks:0,
 stalledTicks:0
});
function reset(){
 running=false;el<HTMLButtonElement>('run').textContent='RUN';
 elapsed=0;blockedTicks=0;overlaps=0;leases={};
 const choice=scenario.value;
 walls=[];cover=[];activeDoors=[];
 if(choice==='vestibule'){
  walls=[wall(310,48,310,211),wall(310,259,310,452),
   wall(403,48,403,211),wall(403,259,403,452)];
  activeDoors=[door('ENTRY',310),door('INNER',403)];
  units=[unit('ROOK','blue',244,235,485,235),
   unit('MOSS','blue',205,235,481,231),
   unit('ASH','blue',165,235,481,239),
   unit('VALE','blue',125,235,476,244)];
 }else if(choice==='headon'){
  walls=[wall(320,48,320,211),wall(320,259,320,452)];
  activeDoors=[{...door('PASSAGE',320),open:true}];
  units=[unit('ROOK','blue',265,229,410,229),
   unit('MOSS','blue',232,239,417,239),
   unit('GUARD','red',392,229,230,229),
   unit('WATCH','red',420,239,240,239)];
 }else if(choice==='furniture'){
  cover=[{x:285,y:204,w:51,h:42,fixture:'shelf'},
   {x:362,y:269,w:56,h:47,fixture:'counter'}];
  units=[unit('ROOK','blue',195,235,490,235),
   unit('MOSS','blue',160,247,486,246),
   unit('ASH','blue',138,225,474,222),
   unit('VALE','blue',115,256,476,257)];
 }else{
  walls=[wall(320,48,320,211),wall(320,259,320,452)];
  activeDoors=[door('SHOP',320)];
  units=[unit('ROOK','blue',350,235,350,235,true),
   unit('MOSS','blue',276,225,450,225),
   unit('ASH','blue',241,235,455,235),
   unit('VALE','blue',203,245,455,245)];
 }
 const site:Site={seed:19,name:'PHYSICALITY LAB',layout:'corridor',
  rooms:[],walls,doors:activeDoors,cover,entrance:{x:230,y:235},
  spawn:[],enemies:[],objective:{x:480,y:235},extract:{x:130,y:235},
  roomCount:0,bounds:{minX:0,minY:0,maxX:640,maxY:500}};
 activateSite(site);
 activeDoors=activeDoors.map((d,i)=>initDoor(d,i));
 for(const u of units)u.path=u.held?[]:route(u.p,u.goal);
 draw();
}
function tick(){
 const dt=1/30;
 elapsed+=dt;
 for(const d of activeDoors)advanceDoor(d,dt,units.map(u=>u.p));
 const frame=units.map(u=>({...u.p}));
 const proposals=units.map((u,i)=>{
  const start=frame[i];
  if(u.held||distance(start,u.goal)<5)
   return {id:u.id,side:u.side,from:start,to:start,alive:true};
  let target=u.path[0]??u.goal;
  if(distance(start,target)<4){u.path.shift();target=u.path[0]??u.goal;}
  const bearing=Math.atan2(target.y-start.y,target.x-start.x);
  const amount=Math.min(distance(start,target),50*dt);
  let move={x:start.x+Math.cos(bearing)*amount,
    y:start.y+Math.sin(bearing)*amount};
  for(const d of activeDoors){
   const gap=distance(start,doorCenter(d));
   const crossing=segmentsCross({a:start,b:u.goal},{a:d.a,b:d.b});
   if(crossing&&gap<70&&!d.open)d.open=true;
   if(doorsMode.value==='assisted'&&approachingDoorLeaf(start,move,d))
    pushDoor(d,2.5);
  }
  if(traffic.value==='hybrid'){
   move=friendlyPassingStep(start,move,target,
     units.filter(v=>v!==u&&v.side===u.side).map(v=>v.p),
     (a,b)=>sweptBodyClear(a,b,activeDoors));
  }
  // Combat opponents remain solid but can negotiate shoulder-to-shoulder
  // space instead of both walking straight into each other forever.
  move=opposingPassingStep(start,move,target,
    units.filter(v=>v!==u&&v.side!==u.side).map(v=>frame[units.indexOf(v)]),
    (a,b)=>sweptBodyClear(a,b,activeDoors));
  if(traffic.value==='strict'&&units.some(v=>v!==u&&v.side===u.side&&
     distance(move,v.p)<16))move=start;
  const actors=units.map(v=>({id:v.id,p:v.p,goal:v.held?null:v.goal,
    health:4,blockedTime:v.blockedTicks*dt,active:!v.held}));
  if(activeDoors.length&&passageWait(actors[i],activeDoors,actors,leases,elapsed))
   move=start;
  return {id:u.id,side:u.side,from:start,to:move,alive:true};
 });
 const outcomes=resolveMovementFrame(proposals,p=>
   doorsMode.value==='forgiving'?
     // Still obey hard architecture, only ignore *opened* leaf bodies.
     sweptBodyClear(p.from,p.to,activeDoors.filter(d=>!d.open)):
     sweptBodyClear(p.from,p.to,activeDoors));
 for(const [i,result] of outcomes.entries()){
  const u=units[i],p=proposals[i];
  const blocked=result.blocked??(
   !u.held&&distance(p.from,u.goal)>5&&
   distance(result.point,p.from)<.01?'waiting':'clear');
  u.blocked=blocked;
  if(blocked!=='clear'){u.blockedTicks++;blockedTicks++;}
  const progressed=distance(result.point,p.from)>.05;
  u.stalledTicks=progressed?0:u.held?0:u.stalledTicks+1;
  u.p={...result.point};
  // The original lab never tried a new path after finding a leaf in the
  // current way. Dynamic open doors need route repair just like the game.
  if(u.stalledTicks===24||u.stalledTicks>24&&u.stalledTicks%45===0){
   const repaired=routeWithSqueezeWorld(u.p,u.goal,activeDoors);
   if(repaired.length)u.path=repaired;
  }
 }
 for(let i=0;i<units.length;i++)for(let j=i+1;j<units.length;j++)
  if(distance(units[i].p,units[j].p)<12)overlaps++;
 draw();
}
function line(a:Pt,b:Pt,color:string,w=3){
 ctx.strokeStyle=color;ctx.lineWidth=w;ctx.beginPath();
 ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
}
function draw(){
 ctx.clearRect(0,0,800,500);
 ctx.fillStyle='#34473f';ctx.fillRect(0,0,800,500);
 ctx.strokeStyle='#51645b';ctx.lineWidth=.55;
 for(let x=40;x<640;x+=20){ctx.beginPath();ctx.moveTo(x,35);ctx.lineTo(x,460);ctx.stroke();}
 for(let y=40;y<460;y+=20){ctx.beginPath();ctx.moveTo(50,y);ctx.lineTo(650,y);ctx.stroke();}
 for(const o of cover){ctx.fillStyle='#837966';ctx.fillRect(o.x-o.w/2,o.y-o.h/2,o.w,o.h);}
 for(const w of walls)line(w.a,w.b,'#e1dcc5',7);
 for(const d of activeDoors){
  line(d.a,d.b,'#ac9a6d',2);
  line(doorLeafSegment(d).a,doorLeafSegment(d).b,'#e4b774',5);
 }
 for(const u of units){
  ctx.setLineDash([3,5]);line(u.p,u.goal,'#9db4a7',1);ctx.setLineDash([]);
  const paint=u.side==='red'?'#da8f78':'#9bd3c6';
  ctx.beginPath();ctx.arc(u.p.x,u.p.y,9,0,Math.PI*2);
  ctx.fillStyle=paint;ctx.fill();ctx.strokeStyle='#162d27';ctx.lineWidth=2;ctx.stroke();
  ctx.fillStyle='#f5f0e2';ctx.font='bold 11px monospace';
  ctx.fillText(u.id,u.p.x-14,u.p.y-15);
  if(u.held){ctx.fillStyle='#edbf80';ctx.fillText('HOLD',u.p.x-13,u.p.y+24);}
 }
 el<HTMLElement>('elapsed').textContent=elapsed.toFixed(1)+'s';
 el<HTMLElement>('blocked').textContent=String(blockedTicks);
 el<HTMLElement>('overlaps').textContent=String(overlaps);
 el<HTMLElement>('angle').textContent=(activeDoors[0]?
  ((activeDoors[0].openFraction??0)*88.24).toFixed(0)+'°':'—');
 el<HTMLElement>('detail').textContent=units.map(u=>u.id+' · '+
  (u.held?'HELD':u.blocked.toUpperCase())+' · remaining '+
  distance(u.p,u.goal).toFixed(1)+' · blocked ticks '+u.blockedTicks).join('\n');
}
let last=0,accum=0;
function frame(time:number){
 if(running){accum+=Math.min(.1,(time-last)/1000||0)*Number(speed.value);
  let steps=0;while(accum>=1/30&&steps<6){tick();accum-=1/30;steps++;}
 }
 last=time;requestAnimationFrame(frame);
}
el<HTMLButtonElement>('run').addEventListener('click',()=>{
 running=!running;el<HTMLButtonElement>('run').textContent=running?'PAUSE':'RUN';
});
el<HTMLButtonElement>('step').addEventListener('click',()=>{running=false;tick();
 el<HTMLButtonElement>('run').textContent='RUN';});
el<HTMLButtonElement>('reset').addEventListener('click',reset);
for(const input of [scenario,traffic,doorsMode])input.addEventListener('change',reset);
reset();requestAnimationFrame(frame);
