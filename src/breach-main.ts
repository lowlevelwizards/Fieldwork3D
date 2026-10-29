import {
  W,H,WALLS,COVER,GRID,doorCenter,route,type Pt,
} from './breach-core.ts';
import {
  type Session,type TeamActor,
  newSession,team,enemies,isSeen,lastKnown,missionText,debrief,
  planMove,planMoveStroke,planLook,planDoor,planWait,planSync,movePlanNode,
  planPieAt,editPie,doorAtNode,planStack,setStrafe,backOne,
  deletePlanNode,insertPlanNode,clearPlan,undoPlan,redoPlan,
  posture,toggleContactRule,toggling,stepSession,nearestDoor,knownAt,liveVisibility,
} from './breach-game.ts';
import {type PieSide} from './breach-plan.ts';
import {TacticalScene3D,type ViewMode} from './breach-3d.ts';
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
  context:el<HTMLElement>('contextTools'),
  orders:el<HTMLElement>('advancedOrders'),
  moreOrders:el<HTMLButtonElement>('moreOrders'),
  viewIso:el<HTMLButtonElement>('viewIso'),
  viewTop:el<HTMLButtonElement>('viewTop'),
  view2d:el<HTMLButtonElement>('view2d'),
  rotLeft:el<HTMLButtonElement>('rotLeft'),
  rotRight:el<HTMLButtonElement>('rotRight'),
  cameraOrbit:el<HTMLButtonElement>('cameraOrbit'),
  cameraPan:el<HTMLButtonElement>('cameraPan'),
  zoomIn:el<HTMLButtonElement>('zoomIn'),
  zoomOut:el<HTMLButtonElement>('zoomOut'),
  cameraFit:el<HTMLButtonElement>('cameraFit'),
  back:el<HTMLButtonElement>('back'),
  undo:el<HTMLButtonElement>('undo'),redo:el<HTMLButtonElement>('redo'),
  insert:el<HTMLButtonElement>('insert'),delete:el<HTMLButtonElement>('delete'),
  door:el<HTMLButtonElement>('door'),method:el<HTMLButtonElement>('method'),
  strafe:el<HTMLButtonElement>('strafe'),
  pieLeft:el<HTMLButtonElement>('pieLeft'),
  pieRight:el<HTMLButtonElement>('pieRight'),
  wait:el<HTMLButtonElement>('wait'),sync:el<HTMLButtonElement>('sync'),
  stance:el<HTMLButtonElement>('stance'),variant:el<HTMLButtonElement>('variant'),
  contact:el<HTMLButtonElement>('contact'),
  debrief:el<HTMLElement>('debrief'),
  debriefTitle:el<HTMLElement>('debriefTitle'),
  debriefStats:el<HTMLElement>('debriefStats'),
  retry:el<HTMLButtonElement>('retry'),next:el<HTMLButtonElement>('next'),
};
let state:Session=newSession();
let stage:TacticalScene3D|null=null;
let viewMode:ViewMode='iso';
try{stage=new TacticalScene3D();}
catch(error){console.warn('3D unavailable; reverting to tactical plan',error);
  viewMode='plan2d';}
let selected='rook';
let looking=false;
let doorMode=false,insertMode=false,strafeNext=false;
let pieMode:PieSide|null=null;
let contextSignature='';
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
  mode:'undecided'|'route'|'pan'|'node'|'pivot'|'sweep'|'cameraOrbit'|'cameraPan'|'cameraMulti';moved:boolean}>();
let pinchDistance=0,panMid:Pt|null=null,pinchAngle=0;
let twistAmount=0,twistActive=false;
let cameraTool:'orders'|'orbit'|'pan'='orders';
let pieRepositionNode:number|null=null;
const colors={rook:'#a2d4ca',moss:'#b9c6a0'};
const colorFor=(id:string)=>id==='rook'?colors.rook:colors.moss;
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
function layout(){
  cssW=Math.max(1,innerWidth);cssH=Math.max(1,innerHeight);
  dpr=Math.min(devicePixelRatio||1,2);
  canvas.width=Math.round(cssW*dpr);canvas.height=Math.round(cssH*dpr);
  canvas.style.width=cssW+'px';canvas.style.height=cssH+'px';
  stage?.resize(cssW,cssH);
  const available=Math.max(240,cssH-(cssH<500?85:172));
  const fit=Math.min((cssW-20)/W,available/H);
  viewScale=fit*zoom;
  ox=cssW/2-W*viewScale/2+panX;
  oy=cssH/2-H*viewScale/2-11+panY;
}
const toWorld=(x:number,y:number):Pt=>{
  if(stage&&viewMode!=='plan2d')return stage.screenToWorld(x,y)??{x:-500,y:-500};
  return {x:(x-ox)/viewScale,y:(y-oy)/viewScale};
};
const worldToScreen=(p:Pt,height=4):Pt=>
  stage&&viewMode!=='plan2d'?stage.project(p,height):
    {x:ox+p.x*viewScale,y:oy+p.y*viewScale};
function fitZoom(next:number,x=cssW/2,y=cssH/2){
  if(stage&&viewMode!=='plan2d'){
    stage.zoomAt(clamp(next,.65,6)/stage.view.zoom,x,y);
  }else{
    zoom=clamp(next,.65,4.8);layout();
  }
  updateContext();
}
function setCameraTool(tool:'orders'|'orbit'|'pan'){
  cameraTool=cameraTool===tool?'orders':tool;
  if(viewMode==='plan2d'&&cameraTool==='orbit')cameraTool='orders';
  ui.cameraOrbit.setAttribute('aria-pressed',String(cameraTool==='orbit'));
  ui.cameraPan.setAttribute('aria-pressed',String(cameraTool==='pan'));
  canvas.style.cursor=cameraTool==='orbit'?'grab':
    cameraTool==='pan'?'move':'crosshair';
  updateContext();
}
function cameraMode(mode:ViewMode){
  viewMode=stage?mode:'plan2d';
  if(stage){stage.setMode(viewMode);stage.updateCamera(1);}
  if(viewMode==='plan2d'&&cameraTool==='orbit')setCameraTool('orders');
  for(const [m,button] of [['iso',ui.viewIso],
    ['top',ui.viewTop],['plan2d',ui.view2d]] as const){
    button.setAttribute('aria-pressed',String(m===viewMode));
  }
  contextSignature='';updateHud();
}
function turnCamera(shift:number){
  if(stage&&viewMode!=='plan2d'){
    stage.rotate(shift);updateContext();
  }
}
const uid=(id:string)=>team(state).find(o=>o.id===id);
function selectUnit(id:string){
  const actor=uid(id);if(!actor||actor.health<=0)return;
  selected=id;looking=false;doorMode=false;insertMode=false;
  pieMode=null;strafeNext=false;pieRepositionNode=null;
  selectedNode=null;updateHud();
}
function message(){
  if(state.phase==='planning'){
    if(looking)return 'LOOK: choose a facing for the selected waypoint.';
    if(doorMode)return 'DOOR: tap a door to append '+method.toUpperCase()+' order.';
    if(pieMode)return 'PIE: tap a world-space pivot. The soldier will sweep around it, keeping the weapon aimed inward.';
    if(pieRepositionNode!==null)return 'Tap a new world-space pivot for the selected pie order.';
    if(strafeNext)return 'STRAFE armed: tap or draw travel, then select the node and LOOK to set weapon direction.';
    if(insertMode)return 'INSERT: tap between route nodes to add a waypoint.';
    if(selectedNode!==null)return 'Selected order: drag to adjust. Nearby door and cover actions appear beside it.';
    return 'Tap to add a waypoint · drag a waypoint to edit · GO to execute.';
  }
  if(state.phase==='running')
    return 'Executing. Pause anytime to correct the plan.';
  return state.phase==='won'?'Station secured. Review your report.':
    'Team lost. Review the debrief and try a new plan.';
}
function activeIsStrafe(){
  return uid(selected)?.plan.find(n=>n.id===selectedNode)?.moveMode==='strafe';
}
function updateContext(){
  // Context chrome must disappear while the player is pointing at the map.
  // Otherwise its floating touch targets can swallow door/pivot/LOOK taps.
  if(state.phase!=='planning'||looking||doorMode||insertMode||
     pieMode!==null||pieRepositionNode!==null){
    ui.context.hidden=true;return;
  }
  const a=uid(selected);
  if(!a||a.health<=0){ui.context.hidden=true;return;}
  const node=a.plan.find(n=>n.id===selectedNode);
  const where=node?.p??a.p;
  const closest=state.doors.filter(d=>
    !d.open&&distance(where,doorCenter(d))<43)
    .sort((x,y)=>distance(where,doorCenter(x))-
      distance(where,doorCenter(y)))[0];
  const isMove=node?.kind==='move';
  const isPie=node?.kind==='pie';
  const choices:{id:string;label:string;pressed?:boolean}[]=[];
  if(node){
    choices.push({id:'ctxLook',label:'FACE'});
    if(isMove)choices.push({id:'ctxStrafe',label:'STRAFE',
      pressed:node?.moveMode==='strafe'});
    if(isPie)choices.push({id:'ctxPivot',label:'MOVE PIVOT'});
    choices.push({id:'ctxDelete',label:'DELETE'});
  }else{
    choices.push({id:'ctxLook',label:'LOOK'});
    choices.push({id:'ctxCrouch',label:a.posture==='crouch'?'STAND':'CROUCH'});
    choices.push({id:'ctxWait',label:'WAIT'});
    choices.push({id:'ctxSync',label:'SYNC'});
  }
  if(closest){
    choices.push({id:'ctxStack',label:'STACK'});
    choices.push({id:'ctxOpen',label:'OPEN'});
    choices.push({id:'ctxKick',label:'KICK'});
    choices.push({id:'ctxHold',label:'HOLD'});
  }
  if(node||closest){
    choices.push({id:'ctxPieLeft',label:'PIE ↶'});
    choices.push({id:'ctxPieRight',label:'PIE ↷'});
  }
  const signature=choices.map(x=>x.id+String(x.pressed)).join('/')+
    '/'+(closest?.id??'')+'/'+(node?.id??'-');
  if(contextSignature!==signature){
    contextSignature=signature;
    ui.context.replaceChildren();
    for(const option of choices){
      const button=document.createElement('button');
      button.type='button';button.dataset.action=option.id;
      button.textContent=option.label;
      if(option.pressed)button.setAttribute('aria-pressed','true');
      ui.context.append(button);
    }
  }
  ui.context.hidden=false;
  // No node: dock the unit's small action tray above the control bar.
  // A floating tray above the soldier can intercept the user's first
  // destination tap, especially at the starting position on portrait.
  if(!node){
    ui.context.style.left=cssW/2+'px';
    ui.context.style.top=Math.max(190,cssH-163)+'px';
    ui.context.style.transform='translate(-50%,-100%)';
    return;
  }
  // Selected node: float above it without covering the waypoint itself.
  const screen=worldToScreen(where,12);
  const left=clamp(screen.x,ui.context.offsetWidth/2+6,
    cssW-ui.context.offsetWidth/2-6);
  const above=screen.y-22;
  const top=above<175?screen.y+ui.context.offsetHeight+36:above;
  ui.context.style.left=left+'px';
  ui.context.style.top=clamp(top,170,cssH-123)+'px';
  ui.context.style.transform=above<175?'translate(-50%,-0%)':'translate(-50%,-100%)';
}
ui.context.addEventListener('click',event=>{
  const button=(event.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]');
  if(!button||state.phase!=='planning')return;
  const action=button.dataset.action;
  const a=uid(selected);
  if(!a)return;
  const node=a.plan.find(n=>n.id===selectedNode);
  const where=node?.p??a.p;
  const door=state.doors.filter(d=>!d.open&&distance(where,doorCenter(d))<50)
    .sort((x,y)=>distance(where,doorCenter(x))-distance(where,doorCenter(y)))[0];
  switch(action){
    case 'ctxLook':toggleAim();return;
    case 'ctxStrafe':
      if(node)setStrafe(state,selected,node.id);
      else strafeNext=!strafeNext;
      break;
    case 'ctxCrouch':posture(state,selected);fogStamp=-1;break;
    case 'ctxWait':planWait(state,selected);break;
    case 'ctxSync':planSync(state);break;
    case 'ctxDelete':
      if(node)deletePlanNode(state,selected,node.id);
      selectedNode=null;break;
    case 'ctxStack':
      if(door&&!planStack(state,selected,door.id,node?.id))
        state.events.push('NO REACHABLE STACK POSITION');
      selectedNode=null;break;
    case 'ctxOpen':
    case 'ctxKick':
    case 'ctxHold':
      if(door&&!doorAtNode(state,selected,door.id,
        action==='ctxOpen'?'open':action==='ctxKick'?'kick':'hold',
        node?.id))state.events.push('DOOR NOT REACHABLE FROM THAT POINT');
      selectedNode=null;break;
    case 'ctxPieLeft':armPie('ccw');return;
    case 'ctxPieRight':armPie('cw');return;
    case 'ctxPivot':if(node?.kind==='pie'){
      pieRepositionNode=node.id;state.events.push('TAP NEW PIVOT OR DRAG MARKER');
    }break;
  }
  contextSignature='';updateHud();
});
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
  ui.strafe.setAttribute('aria-pressed',String(strafeNext||
    (activeIsStrafe())));
  ui.pieLeft.setAttribute('aria-pressed',String(pieMode==='ccw'));
  ui.pieRight.setAttribute('aria-pressed',String(pieMode==='cw'));
  ui.method.textContent=method.toUpperCase();
  const active=uid(selected);
  ui.stance.textContent=active?.posture==='crouch'?'STAND':'CROUCH';
  ui.stance.setAttribute('aria-pressed',String(active?.posture==='crouch'));
  ui.contact.setAttribute('aria-pressed',String(active?.haltOnContact));
  ui.variant.textContent='SITE '+(state.variant+1)+'/3';
  ui.delete.disabled=selectedNode===null;
  ui.back.disabled=!active?.plan.length;
  ui.strafe.disabled=!!(selectedNode!==null&&active?.plan.find(n=>n.id===selectedNode)?.kind!=='move');
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
  updateContext();
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
        }else if(node.kind==='pie'&&node.arc?.length){
          for(const p of node.arc)draw.lineTo(p.x,p.y);
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
      if(n.kind==='move'&&n.moveMode==='strafe'){
        draw.textAlign='left';draw.font='bold 10px monospace';
        draw.fillStyle='#b8e7dd';
        draw.fillText('STRAFE',point.x+12,point.y-11);
      }
      if(n.kind==='pie'&&n.pivot&&n.arc?.length){
        draw.save();
        draw.strokeStyle='#e7b982';draw.lineWidth=3.2;
        draw.setLineDash([4,3]);draw.beginPath();
        const first=a.plan[i-1]?.p??a.p;
        draw.moveTo(first.x,first.y);
        for(const step of n.arc)draw.lineTo(step.x,step.y);
        draw.stroke();draw.setLineDash([]);
        line(point,n.pivot,'#d6b18b83',1.1);
        draw.fillStyle='#eacda0';draw.font='bold 10px monospace';
        draw.fillText(n.pieSide==='cw'?'PIE ↷':'PIE ↶',point.x+12,point.y-11);
        draw.restore();
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
function renderProjectedPlans(){
  if(!stage)return;
  draw.setTransform(dpr,0,0,dpr,0,0);
  draw.clearRect(0,0,cssW,cssH);
  for(const a of team(state)){
    if(a.health<=0)continue;
    const color=colorFor(a.id);
    let previous=a.p;
    for(const n of a.plan){
      const steps=n.kind==='pie'?n.arc??[]:
        n.kind==='move'||n.kind==='door'?route(previous,n.p):[];
      if(steps.length){
        draw.beginPath();
        const start=worldToScreen(previous,4);
        draw.moveTo(start.x,start.y);
        for(const point of steps){
          const projected=worldToScreen(point,4);
          draw.lineTo(projected.x,projected.y);
        }
        draw.strokeStyle=n.kind==='pie'?'#e8c090':color;
        draw.globalAlpha=a.id===selected?.94:.50;
        draw.lineWidth=n.kind==='pie'?3:2.4;
        draw.setLineDash(n.kind==='pie'?[3,3]:[7,4]);
        draw.stroke();draw.setLineDash([]);draw.globalAlpha=1;
      }
      const selectedNow=a.id===selected&&selectedNode===n.id;
      const point=worldToScreen(selectedNow&&draggingNode?draggingNode:n.p,8);
      circle(point.x,point.y,selectedNow?11:7,
        selectedNow?'#ecd29f':n.kind==='pie'?'#daa972':color);
      circle(point.x,point.y,3,'#233b39');
      draw.fillStyle='#142829';draw.font='bold 11px monospace';
      draw.textAlign='center';draw.fillText(String(a.plan.indexOf(n)+1),
        point.x,point.y+3);
      if(n.facing!==undefined){
        const aim=worldToScreen({x:n.p.x+Math.cos(n.facing)*33,
          y:n.p.y+Math.sin(n.facing)*33},8);
        line(point,aim,'#efd5a4',2);
        circle(aim.x,aim.y,3,'#efd5a4');
      }
      if(n.kind==='move'&&n.moveMode==='strafe'){
        draw.fillStyle='#e0f7e9';draw.textAlign='left';
        draw.font='bold 10px monospace';
        draw.fillText('STRAFE',point.x+13,point.y-12);
      }
      if(n.kind==='door'){
        draw.fillStyle='#e2ca9f';draw.textAlign='left';
        draw.font='bold 10px monospace';
        draw.fillText((n.method??'open').toUpperCase(),point.x+12,point.y-11);
      }
      if(n.kind==='pie'&&n.pivot){
        const pivot=worldToScreen(n.pivot,12);
        circle(pivot.x,pivot.y,7,'#e2b476');
        circle(pivot.x,pivot.y,3,'#24322f');
        line(point,pivot,'#e3b37c8a',1.5);
        draw.textAlign='left';draw.font='bold 10px monospace';
        draw.fillStyle='#e3bb87';
        draw.fillText('PIVOT '+Math.round(n.pieDegrees??54)+'°',
          pivot.x+10,pivot.y-12);
      }
      if(n.kind==='pie'&&n.arc?.length&&a.id===selected){
        const finish=worldToScreen(n.arc.at(-1)!,8);
        draw.strokeStyle='#f0d3a4';draw.lineWidth=1.8;
        draw.strokeRect(finish.x-8,finish.y-8,16,16);
      }
      if(n.kind==='move'||n.kind==='door'||n.kind==='pie')previous=n.p;
    }
    const pawn=worldToScreen(a.p,32);
    draw.textAlign='center';draw.font='bold 12px monospace';
    draw.fillStyle=color;draw.fillText(a.name,pawn.x,pawn.y-9);
    if(a.id===selected){
      draw.strokeStyle='#e9d6b1';draw.lineWidth=1.5;
      draw.beginPath();draw.arc(pawn.x,pawn.y+15,13,0,Math.PI*2);draw.stroke();
    }
  }
  // Unknown enemies stay unrendered; only grounded last-known reports show.
  for(const hostile of enemies(state)){
    if(isSeen(state,hostile))continue;
    const memory=lastKnown(state,hostile.id);
    if(!memory||state.seconds-memory.at>25)continue;
    const where=worldToScreen(memory.p,12);
    draw.font='bold 17px monospace';draw.textAlign='center';
    draw.fillStyle='#e6bb9d';
    draw.fillText(memory.status==='heard'?'~':'?',where.x,where.y);
  }
  if(trace&&trace.length>1){
    draw.beginPath();
    const first=worldToScreen(trace[0],8);
    draw.moveTo(first.x,first.y);
    for(const point of trace.slice(1)){
      const screen=worldToScreen(point,8);
      draw.lineTo(screen.x,screen.y);
    }
    draw.strokeStyle='#f0cd96';draw.lineWidth=3;draw.stroke();
  }
  if(state.mission!=='clear'&&state.mission!=='done'){
    const target=worldToScreen(state.mission==='secure'?
      state.scenario.objective:state.scenario.extract,9);
    draw.strokeStyle='#e8d5a6';draw.lineWidth=2;
    draw.beginPath();draw.arc(target.x,target.y,17,0,2*Math.PI);draw.stroke();
    draw.fillStyle='#e8d5a6';draw.font='bold 10px monospace';
    draw.fillText(state.mission.toUpperCase(),target.x,target.y-23);
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
        draw.fillStyle=memory.status==='heard'?'#e6bb828e':'#d19d837e';
        draw.font='bold 16px monospace';draw.textAlign='center';
        draw.fillText(memory.status==='heard'?'~':'?',memory.p.x,memory.p.y);
        if(memory.status==='heard'){
          draw.strokeStyle='#c9af7c4b';draw.lineWidth=1;
          draw.beginPath();draw.arc(memory.p.x,memory.p.y,30,0,Math.PI*2);draw.stroke();
        }
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
  // Body and alternating leg extension are driven by actual travel.
  const gait=Math.sin(state.seconds*15+Math.floor(a.p.x*.15))*
    Math.min(1,a.velocity/70)*3.5;
  rect(-9,-7+gait,9,5,friendly?'#304842':'#4b3633');
  rect(-9,2-gait,9,5,friendly?'#304842':'#4b3633');
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
  if(state.phase==='won'||state.phase==='lost'){
    // The HTML debrief owns the readable text and restart buttons.
    draw.fillStyle='#101c1f88';draw.fillRect(0,0,W,H);
  }
}
function render(){
  if(stage&&viewMode!=='plan2d'){
    renderProjectedPlans();return;
  }
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
function toggleAim(){
  looking=!looking;doorMode=false;insertMode=false;pieMode=null;updateHud();
}
function armPie(side:PieSide){
  pieMode=pieMode===side?null:side;
  looking=false;doorMode=false;insertMode=false;strafeNext=false;
  updateHud();
}
function useSelectedGround(pt:Pt){
  if(state.phase!=='planning')return;
  if(looking){
    if(!planLook(state,selected,pt,selectedNode??undefined))
      state.events.push('SELECT OR CREATE A NODE FIRST');
    looking=false;updateHud();return;
  }
  if(pieRepositionNode!==null){
    if(!editPie(state,selected,pieRepositionNode,pt))
      state.events.push('INVALID PIVOT LOCATION');
    pieRepositionNode=null;updateHud();return;
  }
  if(pieMode){
    if(!planPieAt(state,selected,pt,pieMode,65,selectedNode??undefined))
      state.events.push('INVALID PIVOT OR SWEEP: MOVE TO AN OPEN ARC');
    pieMode=null;selectedNode=null;updateHud();return;
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
  if(!planMove(state,selected,pt,strafeNext))
    state.events.push('NO WALKABLE ROUTE');
  strafeNext=false;selectedNode=null;updateHud();
}
function reset(next=state.variant){
  state=newSession(next);selected='rook';looking=false;doorMode=false;
  insertMode=false;selectedNode=null;draggingNode=null;
  strafeNext=false;pieMode=null;pieRepositionNode=null;
  cursor=null;trace=null;zoom=1;panX=panY=0;
  fogStamp=-1;lastSoundShotCount=0;lastEventAudio='';
  layout();updateHud();
}
ui.rook.addEventListener('click',()=>selectUnit('rook'));
ui.moss.addEventListener('click',()=>selectUnit('moss'));
ui.aim.addEventListener('click',toggleAim);
ui.back.addEventListener('click',()=>{
  if(backOne(state,selected)){selectedNode=null;state.events.push('REMOVED LAST ORDER');}
  updateHud();
});
ui.strafe.addEventListener('click',()=>{
  if(selectedNode!==null){
    setStrafe(state,selected,selectedNode);
  }else{
    strafeNext=!strafeNext;
    pieMode=null;doorMode=false;insertMode=false;looking=false;
  }
  updateHud();
});
ui.pieLeft.addEventListener('click',()=>armPie('ccw'));
ui.pieRight.addEventListener('click',()=>armPie('cw'));
ui.clear.addEventListener('click',()=>{clearPlan(state,selected);selectedNode=null;updateHud();});
ui.undo.addEventListener('click',()=>{undoPlan(state,selected);selectedNode=null;updateHud();});
ui.redo.addEventListener('click',()=>{redoPlan(state,selected);selectedNode=null;updateHud();});
ui.delete.addEventListener('click',()=>{
  if(selectedNode!==null)deletePlanNode(state,selected,selectedNode);
  selectedNode=null;updateHud();
});
ui.insert.addEventListener('click',()=>{
  insertMode=!insertMode;doorMode=false;looking=false;pieMode=null;
  strafeNext=false;updateHud();
});
ui.door.addEventListener('click',()=>{
  doorMode=!doorMode;insertMode=false;looking=false;pieMode=null;
  strafeNext=false;updateHud();
});
ui.method.addEventListener('click',()=>{
  method=method==='open'?'kick':method==='kick'?'hold':'open';updateHud();
});
ui.wait.addEventListener('click',()=>{planWait(state,selected);updateHud();});
ui.sync.addEventListener('click',()=>{planSync(state);updateHud();});
ui.stance.addEventListener('click',()=>{
  posture(state,selected);fogStamp=-1;updateHud();
});
ui.contact.addEventListener('click',()=>{toggleContactRule(state,selected);updateHud();});
ui.variant.addEventListener('click',()=>reset(state.variant+1));
ui.retry.addEventListener('click',()=>reset());
ui.next.addEventListener('click',()=>reset(state.variant+1));
ui.play.addEventListener('click',()=>{
  unlockAudio();
  if(state.phase==='won'||state.phase==='lost')reset();
  else{looking=false;doorMode=false;insertMode=false;pieMode=null;
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
  if(e.code==='Backspace'&&!e.repeat){
    e.preventDefault();backOne(state,selected);selectedNode=null;updateHud();
  }
  if(e.code==='KeyF'&&!e.repeat){strafeNext=!strafeNext;updateHud();}
  if(e.code==='BracketLeft'&&!e.repeat)armPie('ccw');
  if(e.code==='BracketRight'&&!e.repeat)armPie('cw');
  if(e.code==='KeyZ'&&(e.ctrlKey||e.metaKey)){
    e.preventDefault();
    if(e.shiftKey)redoPlan(state,selected);
    else undoPlan(state,selected);updateHud();
  }
  if(e.code==='KeyR'&&!e.repeat)reset();
  if(e.code==='KeyV'&&!e.repeat)cameraMode(viewMode==='iso'?'top':'iso');
  if(e.code==='KeyQ'&&!e.repeat)turnCamera(-Math.PI/8);
  if(e.code==='KeyE'&&!e.repeat)turnCamera(Math.PI/8);
  if(e.code==='KeyC'&&!e.repeat)setCameraTool('orbit');
  if(e.code==='KeyP'&&!e.repeat)setCameraTool('pan');
  if(e.code==='Digit0'&&!e.repeat)ui.cameraFit.click();
});
function pointerWorld(e:PointerEvent){return toWorld(e.clientX,e.clientY);}
const hitNode=(p:Pt):{id:number;index:number}|null=>{
  const unit=uid(selected);
  if(!unit)return null;
  for(let i=unit.plan.length-1;i>=0;i--){
    const n=unit.plan[i];
    if(viewMode!=='plan2d'&&stage){
      const screen=worldToScreen(n.p,8),cursor=worldToScreen(p,8);
      if(distance(screen,cursor)<19)return {id:n.id,index:i};
    }else if(distance(n.p,p)<Math.max(14,12/viewScale))
      return {id:n.id,index:i};
  }
  return null;
};
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('pointerdown',e=>{
  e.preventDefault();canvas.setPointerCapture(e.pointerId);
  const pt=pointerWorld(e);
  // Explicit camera interaction does NOT select units or place orders.
  const cameraModeInput=viewMode!=='plan2d'&&
    (e.button===2||cameraTool==='orbit'&&e.pointerType!=='mouse'||
      cameraTool==='orbit'&&e.button===0||
      cameraTool==='pan'||e.button===1||e.shiftKey);
  if(cameraModeInput){
    const orbit=e.button===2||cameraTool==='orbit'&&
      e.button!==1&&!e.shiftKey;
    activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY,
      startX:e.clientX,startY:e.clientY,wasUnit:false,nodeId:null,
      mode:orbit?'cameraOrbit':'cameraPan',moved:false});
  }else{
    const contextual=looking||doorMode||insertMode||
      pieMode!==null||pieRepositionNode!==null;
    const hit=contextual?undefined:team(state).find(a=>
      a.health>0&&(viewMode==='plan2d'||!stage?
        distance(a.p,pt)<22:
        distance(worldToScreen(a.p,24),{x:e.clientX,y:e.clientY})<25));
    if(hit)selectUnit(hit.id);
    const current=uid(selected)?.plan.find(n=>n.id===selectedNode);
    let handle:'pivot'|'sweep'|null=null;
    if(!contextual&&current?.kind==='pie'&&stage&&viewMode!=='plan2d'){
      if(current.pivot&&distance(worldToScreen(current.pivot,12),
        {x:e.clientX,y:e.clientY})<22)handle='pivot';
      else if(distance(worldToScreen(current.p,8),
        {x:e.clientX,y:e.clientY})<20)handle='sweep';
    }
    const node=state.phase==='planning'&&!hit&&!contextual&&!handle?
      hitNode(pt):null;
    if(node)selectedNode=node.id;
    activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY,
      startX:e.clientX,startY:e.clientY,wasUnit:!!hit,
      nodeId:handle?selectedNode:node?.id??null,
      mode:handle??(node?'node':'undecided'),moved:false});
  }
  if(activePointers.size>=2){
    // Cancel any tentative route gesture when a second finger arrives.
    // The remaining finger is never retroactively treated as a map tap.
    for(const pointer of activePointers.values())pointer.mode='cameraMulti';
    const pts=[...activePointers.values()];
    pinchDistance=distance({x:pts[0].x,y:pts[0].y},
      {x:pts[1].x,y:pts[1].y});
    panMid={x:(pts[0].x+pts[1].x)/2,y:(pts[0].y+pts[1].y)/2};
    pinchAngle=Math.atan2(pts[1].y-pts[0].y,pts[1].x-pts[0].x);
    twistAmount=0;twistActive=false;
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
    const angle=Math.atan2(pts[1].y-pts[0].y,pts[1].x-pts[0].x);
    const turn=Math.atan2(Math.sin(angle-pinchAngle),
      Math.cos(angle-pinchAngle));
    if(stage&&viewMode!=='plan2d'){
      if(panMid)stage.panBetween(panMid.x,panMid.y,mid.x,mid.y);
      if(pinchDistance>8)stage.zoomAt(gap/pinchDistance,mid.x,mid.y);
      twistAmount+=turn;
      // A pinch does not become an accidental rotation until the user
      // deliberately twists at least ~10 degrees.
      if(!twistActive&&Math.abs(twistAmount)>.17)twistActive=true;
      if(twistActive&&Math.abs(turn)>.004)stage.rotate(-turn);
    }else{
      if(panMid){panX+=mid.x-panMid.x;panY+=mid.y-panMid.y;}
      if(pinchDistance>8)zoom=clamp(zoom*gap/pinchDistance,.65,4.8);
      layout();
    }
    pinchAngle=angle;pinchDistance=gap;panMid=mid;return;
  }
  if(p.mode==='cameraOrbit'&&stage&&viewMode!=='plan2d'){
    stage.orbit(dx,dy);return;
  }
  if(p.mode==='cameraPan'){
    if(stage&&viewMode!=='plan2d')stage.pan(dx,dy);
    else{panX+=dx;panY+=dy;layout();}
    return;
  }
  if(p.mode==='cameraMulti')return;
  if((p.mode==='node'||p.mode==='pivot'||p.mode==='sweep')&&
    p.moved&&p.nodeId!==null){
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
    if((p.mode==='pivot'||p.mode==='sweep')&&p.nodeId!==null){
      const a=uid(selected),node=a?.plan.find(n=>n.id===p.nodeId);
      if(node?.kind==='pie'&&node.pivot&&p.moved){
        if(p.mode==='pivot'){
          if(!editPie(state,selected,node.id,pt))
            state.events.push('PIVOT SWEEP BLOCKED');
        }else{
          const index=a!.plan.indexOf(node);
          const origin=index===0?a!.p:a!.plan[index-1].p;
          const base=Math.atan2(origin.y-node.pivot.y,origin.x-node.pivot.x);
          const endpoint=Math.atan2(pt.y-node.pivot.y,pt.x-node.pivot.x);
          const diff=Math.atan2(Math.sin(endpoint-base),Math.cos(endpoint-base));
          const side=diff>=0?'cw':'ccw';
          const degrees=clamp(Math.abs(diff)*180/Math.PI,8,120);
          if(!editPie(state,selected,node.id,node.pivot,degrees,side))
            state.events.push('ARC INTERSECTS OBSTACLE');
        }
      }
      selectedNode=p.nodeId;
    }else if(p.mode==='node'&&p.nodeId!==null){
      if(p.moved&&!movePlanNode(state,selected,p.nodeId,pt))
        state.events.push('INVALID NODE POSITION');
      selectedNode=p.nodeId;
    }else if(p.mode==='route'&&trace&&trace.length>1){
      const points=[...trace,pt];
      if(!planMoveStroke(state,selected,points.slice(1),strafeNext))
        state.events.push('NO WALKABLE STROKE');
      strafeNext=false;selectedNode=null;
    }else if(!p.moved&&!p.wasUnit&&pt.x>=0&&pt.y>=0&&
      pt.x<=W&&pt.y<=H)useSelectedGround(pt);
  }
  trace=null;draggingNode=null;activePointers.delete(e.pointerId);
  if(activePointers.size<2){panMid=null;pinchDistance=0;pinchAngle=0;
    twistAmount=0;twistActive=false;}
  updateHud();
}
canvas.addEventListener('pointerup',e=>releasePointer(e));
canvas.addEventListener('pointercancel',e=>releasePointer(e,true));
canvas.addEventListener('lostpointercapture',e=>releasePointer(e,true));
window.addEventListener('blur',()=>{activePointers.clear();trace=null;
  panMid=null;pinchDistance=0;twistActive=false;});
window.addEventListener('resize',layout);
ui.viewIso.addEventListener('click',()=>cameraMode('iso'));
ui.viewTop.addEventListener('click',()=>cameraMode('top'));
ui.view2d.addEventListener('click',()=>cameraMode('plan2d'));
ui.rotLeft.addEventListener('click',()=>turnCamera(-Math.PI/8));
ui.rotRight.addEventListener('click',()=>turnCamera(Math.PI/8));
ui.cameraOrbit.addEventListener('click',()=>setCameraTool('orbit'));
ui.cameraPan.addEventListener('click',()=>setCameraTool('pan'));
ui.zoomIn.addEventListener('click',()=>{
  const z=stage&&viewMode!=='plan2d'?stage.view.zoom:zoom;
  fitZoom(z*1.3);
});
ui.zoomOut.addEventListener('click',()=>{
  const z=stage&&viewMode!=='plan2d'?stage.view.zoom:zoom;
  fitZoom(z/1.3);
});
ui.cameraFit.addEventListener('click',()=>{
  if(stage&&viewMode!=='plan2d')stage.resetCamera();
  else{zoom=1;panX=0;panY=0;layout();}
  updateContext();
});
ui.moreOrders.addEventListener('click',()=>{
  const expanded=ui.orders.classList.toggle('compact')===false;
  ui.moreOrders.setAttribute('aria-pressed',String(expanded));
  ui.moreOrders.textContent=expanded?'HIDE':'TOOLS';
});
canvas.addEventListener('wheel',e=>{
  e.preventDefault();
  const z=stage&&viewMode!=='plan2d'?stage.view.zoom:zoom;
  fitZoom(z*Math.exp(-e.deltaY*.001),e.clientX,e.clientY);
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
  if(stage&&viewMode!=='plan2d')stage.update(state,selected,dt);
  render();updateContext();requestAnimationFrame(tick);
}
layout();cameraMode(viewMode);updateHud();requestAnimationFrame(tick);
