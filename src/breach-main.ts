import {
  W,H,WALLS,COVER,GRID,doorCenter,route,type Pt,
} from './breach-core.ts';
import {
  type Session,type TeamActor,
  newSession,team,enemies,isSeen,lastKnown,missionText,debrief,
  planMove,planLook,planDoor,planWait,planSync,movePlanNode,
  deletePlanNode,insertPlanNode,clearPlan,undoPlan,redoPlan,
  posture,toggleContactRule,toggling,stepSession,nearestDoor,knownAt,liveVisibility,
} from './breach-game.ts';
import './breach-style.css';

const el=<T extends HTMLElement>(id:string)=>{
  const node=document.getElementById(id);
  if(!node)throw Error('Missing tactical UI: '+id);
  return node as T;
};
const canvas=el<HTMLCanvasElement>('breachCanvas');
const ctx=canvas.getContext('2d');
if(!ctx)throw Error('Canvas 2D unavailable');
const draw:CanvasRenderingContext2D=ctx;
const ui={
  rook:el<HTMLButtonElement>('rook'),
  moss:el<HTMLButtonElement>('moss'),
  rookHp:el<HTMLElement>('rookHp'),mossHp:el<HTMLElement>('mossHp'),
  aim:el<HTMLButtonElement>('aim'),clear:el<HTMLButtonElement>('clear'),
  play:el<HTMLButtonElement>('play'),restart:el<HTMLButtonElement>('restart'),
  phase:el<HTMLElement>('phase'),clock:el<HTMLOutputElement>('clock'),
  hint:el<HTMLElement>('hint'),feed:el<HTMLElement>('feed'),
  mission:el<HTMLElement>('mission'),
  undo:el<HTMLButtonElement>('undo'),redo:el<HTMLButtonElement>('redo'),
  insert:el<HTMLButtonElement>('insert'),delete:el<HTMLButtonElement>('delete'),
  door:el<HTMLButtonElement>('door'),method:el<HTMLButtonElement>('method'),
  wait:el<HTMLButtonElement>('wait'),sync:el<HTMLButtonElement>('sync'),
  stance:el<HTMLButtonElement>('stance'),variant:el<HTMLButtonElement>('variant'),
  contact:el<HTMLButtonElement>('contact'),
  debrief:el<HTMLElement>('debrief'),
  debriefTitle:el<HTMLElement>('debriefTitle'),
  debriefStats:el<HTMLElement>('debriefStats'),
  retry:el<HTMLButtonElement>('retry'),next:el<HTMLButtonElement>('next'),
};
let state:Session=newSession();
let selected='rook';
let looking=false;
let doorMode=false,insertMode=false;
let method:'open'|'kick'|'hold'='open';
let selectedNode:number|null=null;
let draggingNode:Pt|null=null;
let fogData=new Uint8Array(16*19),fogStamp=-1;
let audio:AudioContext|null=null;
let lastSoundShotCount=0,lastEventAudio='';
const playTone=(frequency:number,decay:number,noise=false)=>{
  try{
    if(!audio)return;
    const osc=audio.createOscillator(),gain=audio.createGain();
    osc.type=noise?'sawtooth':'triangle';osc.frequency.value=frequency;
    gain.gain.setValueAtTime(.065,audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+decay);
    osc.connect(gain);gain.connect(audio.destination);
    osc.start();osc.stop(audio.currentTime+decay+.01);
  }catch{/* Audio must never interrupt control. */}
};
function unlockAudio(){
  try{
    if(!audio&&typeof AudioContext!=='undefined')audio=new AudioContext();
    if(audio?.state==='suspended')void audio.resume();
  }catch{/* WebAudio may be unavailable in embedded browsers. */}
}

let last=performance.now(),accum=0,hudAt=0;
let cssW=innerWidth,cssH=innerHeight,dpr=1;
let viewScale=1,ox=0,oy=0,zoom=1,panX=0,panY=0;
let cursor:Pt|null=null;
let trace:Pt[]|null=null;
const activePointers=new Map<number,{x:number;y:number;startX:number;startY:number;
  wasUnit:boolean;nodeId:number|null;
  mode:'undecided'|'route'|'pan'|'node';moved:boolean}>();
let pinchDistance=0,panMid:Pt|null=null;
const colors={rook:'#a2d4ca',moss:'#b9c6a0'};
const colorFor=(id:string)=>id==='rook'?colors.rook:colors.moss;
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
function layout(){
  cssW=Math.max(1,innerWidth);cssH=Math.max(1,innerHeight);
  dpr=Math.min(devicePixelRatio||1,2);
  canvas.width=Math.round(cssW*dpr);canvas.height=Math.round(cssH*dpr);
  canvas.style.width=cssW+'px';canvas.style.height=cssH+'px';
  const available=Math.max(240,cssH-(cssH<500?85:172));
  const fit=Math.min((cssW-20)/W,available/H);
  viewScale=fit*zoom;
  ox=cssW/2-W*viewScale/2+panX;
  oy=cssH/2-H*viewScale/2-11+panY;
}
const toWorld=(x:number,y:number):Pt=>({
  x:(x-ox)/viewScale,y:(y-oy)/viewScale});
function fitZoom(next:number){
  zoom=clamp(next,1,2.35);layout();
}
const uid=(id:string)=>team(state).find(o=>o.id===id);
function selectUnit(id:string){
  const actor=uid(id);if(!actor||actor.health<=0)return;
  selected=id;looking=false;doorMode=false;insertMode=false;
  selectedNode=null;updateHud();
}
function message(){
  if(state.phase==='planning'){
    if(looking)return 'LOOK: choose a facing for the selected waypoint.';
    if(doorMode)return 'DOOR: tap a door to append '+method.toUpperCase()+' order.';
    if(insertMode)return 'INSERT: tap between route nodes to add a waypoint.';
    if(selectedNode!==null)return 'Waypoint selected: drag to move, LOOK to face, − NODE to delete.';
    return 'Tap to add a waypoint · drag a waypoint to edit · GO to execute.';
  }
  if(state.phase==='running')
    return 'Executing. Pause anytime to correct the plan.';
  return state.phase==='won'?'Station secured. Review your report.':
    'Team lost. Review the debrief and try a new plan.';
}
function updateHud(){
  ui.phase.textContent=state.phase==='planning'?'PLANNING':
    state.phase==='running'?'EXECUTING':
    state.phase==='won'?'COMPLETE':'FAILED';
  ui.phase.classList.toggle('live',state.phase==='running');
  ui.phase.classList.toggle('done',state.phase==='won'||state.phase==='lost');
  const seconds=Math.floor(state.seconds);
  ui.clock.textContent=String(Math.floor(seconds/60)).padStart(2,'0')+':'+
    String(seconds%60).padStart(2,'0');
  ui.play.innerHTML=state.phase==='running'?'PAUSE <span>Ⅱ</span>':
    state.phase==='planning'?'GO <span>▶</span>':'RESET <span>↺</span>';
  ui.play.classList.toggle('running',state.phase==='running');
  ui.aim.setAttribute('aria-pressed',String(looking));
  ui.door.setAttribute('aria-pressed',String(doorMode));
  ui.insert.setAttribute('aria-pressed',String(insertMode));
  ui.method.textContent=method.toUpperCase();
  const active=uid(selected);
  ui.stance.textContent=active?.posture==='crouch'?'STAND':'CROUCH';
  ui.stance.setAttribute('aria-pressed',String(active?.posture==='crouch'));
  ui.contact.setAttribute('aria-pressed',String(active?.haltOnContact));
  ui.variant.textContent='SITE '+(state.variant+1)+'/3';
  ui.delete.disabled=selectedNode===null;
  ui.undo.disabled=!(active?.history.undo.length);
  ui.redo.disabled=!(active?.history.redo.length);
  ui.debrief.hidden=state.phase!=='won'&&state.phase!=='lost';
  if(!ui.debrief.hidden){
    const stats=debrief(state);
    ui.debriefTitle.textContent=state.phase==='won'?'OPERATION COMPLETE':'MISSION FAILED';
    ui.debriefStats.textContent='SITE: '+stats.variant+'\nTIME: '+stats.time+'s'+
      '\nCASUALTIES: '+stats.casualties+'/2'+
      '\nSHOTS: '+stats.shots+' | HITS: '+stats.hits+
      '\nPAUSES: '+stats.pauses;
  }
  for(const id of ['rook','moss'] as const){
    const a=uid(id);
    ui[id].classList.toggle('selected',id===selected);
    ui[id].classList.toggle('down',!a||a.health<=0);
    ui[id].setAttribute('aria-pressed',String(id===selected));
    (id==='rook'?ui.rookHp:ui.mossHp).textContent=a?.health===2?'●●':a?.health===1?'●○':'○○';
  }
  ui.hint.textContent=message();
  ui.feed.textContent=state.events.at(-1)??'';
  const visible=enemies(state).filter(e=>e.health>0&&isSeen(state,e)).length;
  ui.mission.textContent=missionText(state)+
    (visible?' • '+visible+' CONTACT'+(visible===1?'':'S'):'');
}
function rect(x:number,y:number,w:number,h:number,color:string){
  draw.fillStyle=color;draw.fillRect(x,y,w,h);
}
function line(a:Pt,b:Pt,color:string,width:number){
  draw.beginPath();draw.moveTo(a.x,a.y);draw.lineTo(b.x,b.y);
  draw.lineWidth=width;draw.strokeStyle=color;draw.stroke();
}
function circle(x:number,y:number,r:number,color:string){
  draw.beginPath();draw.arc(x,y,r,0,2*Math.PI);draw.fillStyle=color;draw.fill();
}
function noise(x:number,y:number){const v=Math.sin(x*123.31+y*98.717)*43897.44;return v-Math.floor(v);}
function terrain(){
  rect(0,0,W,H,'#2c3733');
  // A deterministic, low-contrast base, not another terrain simulation.
  for(let y=6;y<H;y+=17)for(let x=6;x<W;x+=17){
    const n=noise(x,y);
    if(n>.56)rect(x+3*n,y+2*n,2+n*3,2,n>.85?'#435348':'#35453d');
  }
  // Dirt service road leading to the lower door.
  draw.fillStyle='#4a4840';draw.beginPath();
  draw.moveTo(230,H);draw.lineTo(400,H);
  draw.lineTo(352,534);draw.lineTo(271,534);draw.closePath();draw.fill();
  draw.strokeStyle='#585648';draw.lineWidth=9;draw.beginPath();
  draw.moveTo(268,H);draw.lineTo(294,536);
  draw.moveTo(363,H);draw.lineTo(324,536);draw.stroke();
  for(let y=540;y<H;y+=14)for(let x=230;x<400;x+=13){
    const n=noise(x*.7,y*.3);
    if(n>.6)circle(x+4*n,y+3*n,1.4,'#676251');
  }
  // Outside boundary and an overhead planning-grid.
  draw.strokeStyle='rgba(159,182,165,.08)';draw.lineWidth=1;
  for(let x=0;x<=W;x+=GRID*2)line({x,y:0},{x,y:H},'rgba(161,192,175,.055)',.6);
  for(let y=0;y<=H;y+=GRID*2)line({x:0,y},{x:W,y},'rgba(161,192,175,.055)',.6);
  rect(113,101,268,430,'#555247');
  rect(383,101,206,430,'#4d5753');
  // Floor wear, tiles and loose clutter — only enough for level recognition.
  for(let x=121;x<591;x+=24)for(let y=110;y<529;y+=24){
    draw.strokeStyle='#c5bca018';draw.lineWidth=1;
    draw.strokeRect(x,y,24,24);
    if(noise(x*.21,y*.17)>.8)rect(x+4,y+6,5,3,'#a49b7955');
  }
  // Entry threshold, inner doorway and exit-facing mat.
  rect(269,524,69,23,'#3e4b49');
  rect(374,298,16,54,'#374643');
  rect(278,549,51,10,'#707164');
  // Yard: sparse barrels, netting and access stairs.
  rect(175,570,65,23,'#515f55');
  rect(184,577,48,5,'#84917c');
  for(const [x,y] of [[170,653],[470,654],[543,701],[107,652]]){
    circle(x,y,10,'#4f5e57');circle(x,y,6,'#2c3b39');
  }
  // Quiet exterior rust / earth patches.
  for(const [x,y,r] of [[85,441,28],[558,548,33],[74,221,35],[525,694,24]]){
    draw.fillStyle='rgba(112,106,78,.15)';
    draw.beginPath();draw.ellipse(x,y,r,r*.52,.4,0,Math.PI*2);draw.fill();
  }
}
function furniture(){
  for(const c of COVER){
    draw.fillStyle='#0f1b1c66';
    draw.fillRect(c.x-c.w/2+6,c.y-c.h/2+7,c.w,c.h);
    rect(c.x-c.w/2,c.y-c.h/2,c.w,c.h,c.low?'#81725b':'#485552');
    rect(c.x-c.w/2+4,c.y-c.h/2+4,c.w-8,c.h-8,c.low?'#60594b':'#394440');
    draw.strokeStyle='#a995777e';draw.lineWidth=2;
    draw.strokeRect(c.x-c.w/2+4,c.y-c.h/2+4,c.w-8,c.h-8);
    line({x:c.x-c.w/2+8,y:c.y},{x:c.x+c.w/2-8,y:c.y},'#9d907348',2);
  }
  // Furniture silhouettes reinforce sightline decisions.
  rect(170,140,35,22,'#51564c');rect(224,460,51,22,'#424b47');
  rect(438,303,32,38,'#505a52');rect(516,337,50,14,'#343f3e');
  circle(544,151,11,'#726d58');circle(544,151,7,'#494e46');
}
function wallShape(a:Pt,b:Pt){
  line({x:a.x+3,y:a.y+5},{x:b.x+3,y:b.y+5},'#0b181bd9',17);
  line(a,b,'#292f30',16);line(a,b,'#a39c86',7);
  line({x:a.x,y:a.y-2},{x:b.x,y:b.y-2},'#d5c9a962',1.4);
}
function architecture(){
  for(const wall of WALLS)wallShape(wall.a,wall.b);
  // Closed doors obscure sight and movement; opened doors have an arc.
  for(const door of state.doors){
    const a=door.a,b=door.b,center=doorCenter(door);
    if(!door.open){
      line(a,b,'#1c2727',15);
      line(a,b,'#b5a17a',8);
      circle(a.x,a.y,3,'#ead0a0');circle(b.x,b.y,3,'#ead0a0');
      draw.save();draw.translate(center.x,center.y);
      draw.fillStyle='#e4d1a2';draw.font='bold 9px monospace';
      draw.textAlign='center';draw.fillText('Ⅱ',0,3);draw.restore();
    }else{
      // Hinge rotates out of the walkable gap, with no second collider.
      if(door.id==='FRONT'){
        line(a,{x:a.x,y:a.y-40},'#c2b08a',7);
      }else{
        line(a,{x:a.x+34,y:a.y},'#c2b08a',7);
      }
      circle(a.x,a.y,3,'#f0d8a9');
    }
  }
  // Narrow window markers (not navigable openings).
  for(const x of [211,501]){
    line({x,y:97},{x:x+52,y:97},'#8bb6af',4);
    line({x,y:94},{x:x+52,y:94},'#d4d5bb',2);
  }
}
function conical(a:TeamActor,radius=110){
  const a0=a.heading-.93,a1=a.heading+.93;
  draw.beginPath();draw.moveTo(a.p.x,a.p.y);
  draw.arc(a.p.x,a.p.y,radius,a0,a1);
  draw.closePath();
  draw.fillStyle=a.id===selected?'rgba(172,217,206,.075)':'rgba(178,199,168,.035)';
  draw.fill();
}
function paths(){
  for(const a of team(state)){
    if(a.health<=0)continue;
    const c=colorFor(a.id);
    const plan=a.plan;
    if(plan.length){
      draw.beginPath();draw.moveTo(a.p.x,a.p.y);
      let from=a.p;
      for(const node of plan){
        if(node.kind==='move'||node.kind==='door'){
          const course=route(from,node.p);
          for(const p of course)draw.lineTo(p.x,p.y);
          from=node.p;
        }
      }
      draw.strokeStyle=c;draw.globalAlpha=a.id===selected?.88:.40;
      draw.lineWidth=a.id===selected?2.6:1.6;
      draw.setLineDash([8,4]);draw.stroke();draw.setLineDash([]);
      draw.globalAlpha=1;
    }
    for(let i=0;i<plan.length;i++){
      const n=plan[i],selectedNow=a.id===selected&&selectedNode===n.id;
      const point=selectedNow&&draggingNode?draggingNode:n.p;
      circle(point.x,point.y,selectedNow?10:7,
        selectedNow?'#ecd29f':n.kind==='move'?c:'#c8ae7f');
      circle(point.x,point.y,3,'#263836');
      draw.textAlign='center';draw.fillStyle='#111e20';
      draw.font='bold 10px monospace';
      draw.fillText(String(i+1),point.x,point.y+3.1);
      if(n.facing!==undefined){
        const end={x:point.x+Math.cos(n.facing)*30,
          y:point.y+Math.sin(n.facing)*30};
        line(point,end,'#ebcea1',2.1);circle(end.x,end.y,2.2,'#ebcea1');
      }
      if(n.kind==='door'||n.kind==='wait'||n.kind==='sync'){
        draw.textAlign='left';draw.font='bold 10px monospace';
        draw.fillStyle='#e7c797';
        draw.fillText(n.kind==='door'?(n.method??'open').toUpperCase():
          n.kind.toUpperCase(),point.x+11,point.y-9);
      }
    }
  }
  if(trace&&trace.length>1){
    draw.beginPath();draw.moveTo(trace[0].x,trace[0].y);
    trace.slice(1).forEach(p=>draw.lineTo(p.x,p.y));
    draw.strokeStyle='#e4c998';draw.lineWidth=3;draw.stroke();
  }else if(cursor&&state.phase==='planning'){
    const a=uid(selected);
    if(a&&a.health>0&&cursor.x>=0&&cursor.x<W&&cursor.y>=0&&cursor.y<H){
      const start=a.plan.at(-1)?.p??a.p;
      draw.setLineDash([3,7]);line(start,cursor,
        looking?'#d8ad79':'rgba(193,219,213,.30)',1.4);
      draw.setLineDash([]);
    }
  }
}
function fog(){
  // Cached visibility tile raster, refreshed only as the world moves.
  if(fogStamp<0||state.seconds-fogStamp>.24){
    fogStamp=state.seconds;
    for(let row=0;row<19;row++)for(let col=0;col<16;col++){
      const p={x:col*40+20,y:row*40+20};
      fogData[row*16+col]=liveVisibility(state,p)?0:
        knownAt(state,p.x,p.y)?1:2;
    }
  }
  for(let row=0;row<19;row++)for(let col=0;col<16;col++){
    const value=fogData[row*16+col];
    if(value)rect(col*40,row*40,40,40,
      value===1?'rgba(9,20,22,.28)':'rgba(9,20,22,.49)');
  }
}
function missionMarkers(){
  const p=state.mission==='extract'?state.scenario.extract:state.scenario.objective;
  if(state.mission==='clear'||state.mission==='done')return;
  draw.strokeStyle='#d8cc98';draw.lineWidth=2;
  draw.beginPath();draw.arc(p.x,p.y,33,0,Math.PI*2);draw.stroke();
  draw.fillStyle='#e1d1a2';draw.font='bold 12px monospace';
  draw.textAlign='center';
  draw.fillText(state.mission==='secure'?'SECURE':'EXTRACT',p.x,p.y-39);
}
function sprite(a:TeamActor){
  if(a.side==='red'){
    const visible=a.health>0&&isSeen(state,a);
    if(!visible){
      const memory=lastKnown(state,a.id);
      if(memory&&state.seconds-memory.at<25){
        draw.fillStyle='#d19d837e';
        draw.font='bold 16px monospace';draw.textAlign='center';
        draw.fillText('?',memory.p.x,memory.p.y);
      }
      return;
    }
  }
  const friendly=a.side==='blue',c=friendly?colorFor(a.id):'#d3917b';
  if(a.health<=0){
    draw.save();draw.translate(a.p.x,a.p.y);
    draw.rotate(a.heading);
    rect(-8,-3,17,8,'#574d49');rect(-2,-7,4,17,'#a46556');
    draw.restore();return;
  }
  if(friendly&&(a.id===selected)){
    draw.strokeStyle='#e8d6b1';draw.lineWidth=1.6;
    draw.beginPath();draw.arc(a.p.x,a.p.y,16,0,2*Math.PI);draw.stroke();
    conical(a);
  }
  draw.save();draw.translate(a.p.x,a.p.y);draw.rotate(a.heading);
  circle(0,2,11,'#0d1b20af');circle(0,0,9.2,friendly?'#4b756f':'#794a43');
  // Torso/head orientation and gun barrel.
  rect(-7,-5,14,10,c);
  rect(-10,-4,5,8,friendly?'#45625d':'#563e39');
  circle(4,0,3.8,friendly?'#d3dac1':'#d0a58a');
  rect(5,-2,18,4,'#1a2527');
  rect(20,-1,6,2,'#a2a9a1');
  draw.restore();
  if(friendly){
    draw.textAlign='center';draw.font='bold 10px monospace';
    draw.fillStyle=c;draw.fillText(a.name,a.p.x,a.p.y-21);
    if(a.health===1){draw.fillStyle='#e7a886';
      draw.fillRect(a.p.x-8,a.p.y+13,16,2);}
  }else{
    draw.strokeStyle='#f0c5a4';draw.lineWidth=1.4;
    draw.strokeRect(a.p.x-12,a.p.y-12,24,24);
  }
}
function contacts(){
  for(const shot of state.shots){
    draw.globalAlpha=Math.max(0,(.24-shot.age)/.24)*.75;
    line(shot.start,shot.end,shot.side==='blue'?'#eacb91':'#f5a187',1.6);
    draw.globalAlpha=1;
    if(shot.hit)circle(shot.end.x,shot.end.y,3,'#d79e79');
  }
  for(const spark of state.sparks){
    const r=3+(1-spark.age/.2)*10;
    draw.globalAlpha=Math.max(0,1-spark.age/.2);
    circle(spark.p.x,spark.p.y,r,
      spark.side==='blue'?'#e2cea1':'#e39e7a');
    draw.globalAlpha=1;
  }
}
function endMessage(){
  if(state.phase!=='won'&&state.phase!=='lost')return;
  // The HTML debrief owns text and buttons. Map remains visible behind it.
  draw.fillStyle='#101c1f99';draw.fillRect(0,0,W,H);
  return;
  rect(122,311,397,116,'#142225e9');
  draw.strokeStyle=state.phase==='won'?'#a9cbb7':'#cd8d77';
  draw.lineWidth=2;draw.strokeRect(122,311,397,116);
  draw.textAlign='center';
  draw.fillStyle=state.phase==='won'?'#c3ddc7':'#e8aa93';
  draw.font='bold 24px monospace';
  draw.fillText(state.phase==='won'?'STATION SECURED':'TEAM LOST',320,365);
  draw.fillStyle='#c2cfc8';draw.font='12px monospace';
  draw.fillText('RESET TO TRY A DIFFERENT PLAN',320,393);
}
function render(){
  draw.setTransform(dpr,0,0,dpr,0,0);
  draw.fillStyle='#141e20';draw.fillRect(0,0,cssW,cssH);
  // Map-space drawing has a single reversible projection.
  draw.save();
  draw.translate(ox,oy);draw.scale(viewScale,viewScale);
  draw.fillStyle='#52655b';draw.fillRect(-9,-9,W+18,H+18);
  terrain();furniture();architecture();fog();missionMarkers();
  paths();
  for(const a of state.operators)sprite(a);
  contacts();endMessage();
  draw.strokeStyle='#d4dac64f';draw.lineWidth=2;
  draw.strokeRect(0,0,W,H);
  draw.restore();
}
function toggleAim(){looking=!looking;doorMode=false;insertMode=false;updateHud();}
function useSelectedGround(pt:Pt){
  if(state.phase!=='planning')return;
  if(looking){
    if(!planLook(state,selected,pt,selectedNode??undefined))
      state.events.push('SELECT OR CREATE A NODE FIRST');
    looking=false;updateHud();return;
  }
  if(doorMode){
    const door=nearestDoor(state,pt);
    if(!door||!planDoor(state,selected,door.id,method))
      state.events.push('TAP A REACHABLE CLOSED DOOR');
    doorMode=false;selectedNode=null;updateHud();return;
  }
  if(insertMode){
    const a=uid(selected);
    if(a){
      let index=a.plan.length,best=Infinity,prev=a.p;
      a.plan.forEach((n,i)=>{
        const ab={x:n.p.x-prev.x,y:n.p.y-prev.y};
        const t=clamp(((pt.x-prev.x)*ab.x+(pt.y-prev.y)*ab.y)/
          Math.max(1,ab.x*ab.x+ab.y*ab.y),0,1);
        const gap=Math.hypot(pt.x-prev.x-ab.x*t,pt.y-prev.y-ab.y*t);
        if(gap<best){best=gap;index=i;}
        prev=n.p;
      });
      if(!insertPlanNode(state,selected,index,pt))
        state.events.push('CANNOT INSERT HERE');
    }
    insertMode=false;updateHud();return;
  }
  if(!planMove(state,selected,pt))
    state.events.push('NO WALKABLE ROUTE');
  selectedNode=null;updateHud();
}
function reset(next=state.variant){
  state=newSession(next);selected='rook';looking=false;doorMode=false;
  insertMode=false;selectedNode=null;draggingNode=null;
  cursor=null;trace=null;zoom=1;panX=panY=0;
  fogStamp=-1;lastSoundShotCount=0;lastEventAudio='';
  layout();updateHud();
}
ui.rook.addEventListener('click',()=>selectUnit('rook'));
ui.moss.addEventListener('click',()=>selectUnit('moss'));
ui.aim.addEventListener('click',toggleAim);
ui.clear.addEventListener('click',()=>{clearPlan(state,selected);selectedNode=null;updateHud();});
ui.undo.addEventListener('click',()=>{undoPlan(state,selected);selectedNode=null;updateHud();});
ui.redo.addEventListener('click',()=>{redoPlan(state,selected);selectedNode=null;updateHud();});
ui.delete.addEventListener('click',()=>{
  if(selectedNode!==null)deletePlanNode(state,selected,selectedNode);
  selectedNode=null;updateHud();
});
ui.insert.addEventListener('click',()=>{
  insertMode=!insertMode;doorMode=false;looking=false;updateHud();
});
ui.door.addEventListener('click',()=>{
  doorMode=!doorMode;insertMode=false;looking=false;updateHud();
});
ui.method.addEventListener('click',()=>{
  method=method==='open'?'kick':method==='kick'?'hold':'open';updateHud();
});
ui.wait.addEventListener('click',()=>{planWait(state,selected);updateHud();});
ui.sync.addEventListener('click',()=>{planSync(state);updateHud();});
ui.stance.addEventListener('click',()=>{posture(state,selected);updateHud();});
ui.contact.addEventListener('click',()=>{toggleContactRule(state,selected);updateHud();});
ui.variant.addEventListener('click',()=>reset(state.variant+1));
ui.retry.addEventListener('click',()=>reset());
ui.next.addEventListener('click',()=>reset(state.variant+1));
ui.play.addEventListener('click',()=>{
  unlockAudio();
  if(state.phase==='won'||state.phase==='lost')reset();
  else{looking=false;doorMode=false;insertMode=false;
    toggling(state);updateHud();}
});
ui.restart.addEventListener('click',()=>reset());
window.addEventListener('keydown',e=>{
  if(e.code==='Space'&&!e.repeat){
    e.preventDefault();unlockAudio();
    if(state.phase==='won'||state.phase==='lost')reset();
    else toggling(state);updateHud();
  }
  if(e.code==='Digit1')selectUnit('rook');
  if(e.code==='Digit2')selectUnit('moss');
  if(e.code==='KeyX'){clearPlan(state,selected);updateHud();}
  if(e.code==='KeyL')toggleAim();
  if(e.code==='KeyZ'&&(e.ctrlKey||e.metaKey)){
    e.preventDefault();
    if(e.shiftKey)redoPlan(state,selected);
    else undoPlan(state,selected);updateHud();
  }
  if(e.code==='KeyR'&&!e.repeat)reset();
});
function pointerWorld(e:PointerEvent){return toWorld(e.clientX,e.clientY);}
const hitNode=(p:Pt):{id:number;index:number}|null=>{
  const unit=uid(selected);
  if(!unit)return null;
  for(let i=unit.plan.length-1;i>=0;i--){
    const n=unit.plan[i];
    if(distance(n.p,p)<Math.max(14,12/viewScale))
      return {id:n.id,index:i};
  }
  return null;
};
canvas.addEventListener('pointerdown',e=>{
  e.preventDefault();canvas.setPointerCapture(e.pointerId);
  const pt=pointerWorld(e);
  const hit=team(state).find(a=>a.health>0&&distance(a.p,pt)<22);
  if(hit)selectUnit(hit.id);
  const node=state.phase==='planning'&&!hit?hitNode(pt):null;
  if(node)selectedNode=node.id;
  activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY,
    startX:e.clientX,startY:e.clientY,wasUnit:!!hit,nodeId:node?.id??null,
    mode:node?'node':'undecided',moved:false});
  if(activePointers.size>=2){
    for(const p of activePointers.values())p.mode='pan';
    const pts=[...activePointers.values()];
    pinchDistance=distance({x:pts[0].x,y:pts[0].y},
      {x:pts[1].x,y:pts[1].y});
    panMid={x:(pts[0].x+pts[1].x)/2,y:(pts[0].y+pts[1].y)/2};
    trace=null;draggingNode=null;
  }
});
canvas.addEventListener('pointermove',e=>{
  const p=activePointers.get(e.pointerId);
  cursor=pointerWorld(e);
  if(!p)return;
  e.preventDefault();
  const dx=e.clientX-p.x,dy=e.clientY-p.y;
  p.x=e.clientX;p.y=e.clientY;
  if(Math.hypot(e.clientX-p.startX,e.clientY-p.startY)>9)p.moved=true;
  if(activePointers.size===2){
    const pts=[...activePointers.values()];
    const gap=distance({x:pts[0].x,y:pts[0].y},
      {x:pts[1].x,y:pts[1].y});
    const mid={x:(pts[0].x+pts[1].x)/2,y:(pts[0].y+pts[1].y)/2};
    if(panMid){panX+=mid.x-panMid.x;panY+=mid.y-panMid.y;}
    if(pinchDistance>8)zoom=clamp(zoom*gap/pinchDistance,1,2.35);
    pinchDistance=gap;panMid=mid;layout();return;
  }
  if(p.mode==='node'&&p.moved&&p.nodeId!==null){
    draggingNode=cursor;return;
  }
  if(state.phase==='planning'&&p.wasUnit&&p.moved){
    p.mode='route';
    if(!trace)trace=[{...uid(selected)!.p}];
    if(distance(trace.at(-1)!,cursor)>20)trace.push({...cursor});
  }else if(p.moved&&e.pointerType==='mouse'&&(e.buttons&4)){
    panX+=dx;panY+=dy;layout();
  }
});
function releasePointer(e:PointerEvent,cancelled=false){
  const p=activePointers.get(e.pointerId);if(!p)return;
  if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
  const pt=pointerWorld(e);
  if(!cancelled&&state.phase==='planning'&&activePointers.size===1){
    if(p.mode==='node'&&p.nodeId!==null){
      if(p.moved&&!movePlanNode(state,selected,p.nodeId,pt))
        state.events.push('INVALID NODE POSITION');
      selectedNode=p.nodeId;
    }else if(p.mode==='route'&&trace&&trace.length>1){
      const points=[...trace,pt];
      let last=uid(selected)!.plan.at(-1)?.p??uid(selected)!.p;
      for(const v of points.slice(1)){
        if(distance(v,last)<24)continue;
        if(planMove(state,selected,v))last=v;
      }
      selectedNode=null;
    }else if(!p.moved&&!p.wasUnit&&pt.x>=0&&pt.y>=0&&
      pt.x<=W&&pt.y<=H)useSelectedGround(pt);
  }
  trace=null;draggingNode=null;activePointers.delete(e.pointerId);
  if(activePointers.size<2){panMid=null;pinchDistance=0;}
  updateHud();
}
canvas.addEventListener('pointerup',e=>releasePointer(e));
canvas.addEventListener('pointercancel',e=>releasePointer(e,true));
canvas.addEventListener('lostpointercapture',e=>releasePointer(e,true));
window.addEventListener('blur',()=>{activePointers.clear();trace=null;});
window.addEventListener('resize',layout);
canvas.addEventListener('wheel',e=>{
  e.preventDefault();fitZoom(zoom*Math.exp(-e.deltaY*.00065));
},{passive:false});
function tick(now:number){
  const dt=Math.min(.08,Math.max(0,(now-last)/1000));last=now;
  if(state.phase==='running'){
    accum+=dt;
    while(accum>=1/60){
      stepSession(state,1/60);accum-=1/60;
    }
  }else accum=0;
  if(audio&&state.shots.length>lastSoundShotCount){
    playTone(115,.095,true);
  }
  lastSoundShotCount=state.shots.length;
  const event=state.events.at(-1)??'';
  if(event!==lastEventAudio&&event.includes('OPENED'))
    playTone(160,.16);
  if(event!==lastEventAudio&&event.includes('KICKED'))
    playTone(90,.25,true);
  lastEventAudio=event;
  if(now-hudAt>120){updateHud();hudAt=now;}
  render();requestAnimationFrame(tick);
}
layout();updateHud();requestAnimationFrame(tick);
