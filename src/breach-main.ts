import {
  W,H,WALLS,COVER,GRID,doorCenter,route,type Pt,
} from './breach-core.ts';
import {
  type Session,type TeamActor,
  newSession,team,enemies,isSeen,lastKnown,missionText,debrief,
  planMove,planMoveStroke,planAim,planWait,planSync,movePlanNode,
  finalPoint,doorAtNode,planStack,backOne,
  deletePlanNode,clearPlan,undoPlan,redoPlan,
  posture,toggleContactRule,toggling,stepSession,knownAt,liveVisibility,
} from './breach-game.ts';
import {TacticalScene3D,type ViewMode} from './breach-3d.ts';
import {shotVisibility,doorVisibility,contactFade} from './breach-presentation.ts';
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
  clear:el<HTMLButtonElement>('clear'),
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
  cameraFit:el<HTMLButtonElement>('cameraFit'),
  back:el<HTMLButtonElement>('back'),
  undo:el<HTMLButtonElement>('undo'),redo:el<HTMLButtonElement>('redo'),
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
let lookMode:'look'|'pie'|'strafe'='look';
let contextSignature='';
let selectedNode:number|null=null;
let doorFocusId:string|null=null;
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
function cameraMode(mode:ViewMode){
  viewMode=stage?mode:'plan2d';
  if(stage){stage.setMode(viewMode);stage.updateCamera(1);}
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
  selected=id;looking=false;
  selectedNode=null;doorFocusId=null;updateHud();
}
function message(){
  if(state.phase==='planning'){
    if(looking)return lookMode==='pie'?
      'PIE: tap a point to watch continuously while moving.':
      lookMode==='strafe'?
        'STRAFE: tap a direction to hold while moving.':
        'LOOK: tap a direction to face at this node, then resume normal travel-facing.';
    if(selectedNode!==null)return 'Order selected: LOOK, PIE and STRAFE change facing, not the movement path.';
    return 'Tap to move · drag empty ground to orbit · choose LOOK / PIE / STRAFE for aiming.';
  }
  if(state.phase==='running')return 'Executing. Pause to change your plan.';
  return state.phase==='won'?'Station secured. Review your report.':
    'Team lost. Review the debrief and try another approach.';
}
function armFacing(mode:'look'|'pie'|'strafe'){
  looking=!looking||lookMode!==mode;
  lookMode=mode;
  updateHud();
}
/** The tray never competes with the expanded TOOLS panel or GO/BACK. */
function focusedDoor(a:TeamActor,node:ReturnType<typeof selectedPlanNode>){
  const explicit=state.doors.find(d=>d.id===doorFocusId&&!d.open);
  if(explicit)return explicit;
  const points=node?[node.p]:[finalPoint(a),a.p];
  return state.doors.filter(d=>!d.open&&points.some(p=>
    distance(p,doorCenter(d))<=43))
    .sort((x,y)=>{
      const dx=Math.min(...points.map(p=>distance(p,doorCenter(x))));
      const dy=Math.min(...points.map(p=>distance(p,doorCenter(y))));
      return dx-dy;
    })[0];
}
function selectedPlanNode(){
  return uid(selected)?.plan.find(n=>n.id===selectedNode);
}
function updateContext(){
  if(state.phase!=='planning'||looking||
     !ui.orders.classList.contains('compact')){
    ui.context.hidden=true;return;
  }
  const a=uid(selected);
  if(!a||a.health<=0){ui.context.hidden=true;return;}
  const node=selectedPlanNode();
  const door=focusedDoor(a,node);
  const where=doorFocusId&&door?doorCenter(door):node?.p??finalPoint(a);
  const choices:{id:string;label:string}[]=[
    {id:'ctxLook',label:'LOOK'},
    {id:'ctxPie',label:'PIE'},
    {id:'ctxStrafe',label:'STRAFE'},
  ];
  if(node)choices.push({id:'ctxDelete',label:'DELETE'});
  if(door)choices.push(
    {id:'ctxStack',label:'STACK'},
    {id:'ctxOpen',label:'OPEN'},
    {id:'ctxKick',label:'KICK'},
    {id:'ctxHold',label:'HOLD'},
  );
  const signature=choices.map(x=>x.id).join('/')+
    '/'+(door?.id??'')+'/'+(node?.id??'-')+'/'+(doorFocusId??'');
  if(contextSignature!==signature){
    contextSignature=signature;
    ui.context.replaceChildren();
    for(const option of choices){
      const button=document.createElement('button');
      button.type='button';button.dataset.action=option.id;
      button.textContent=option.label;
      if(option.id==='ctxStack'||option.id==='ctxOpen'||
        option.id==='ctxKick'||option.id==='ctxHold')
        button.classList.add('door-action');
      ui.context.append(button);
    }
  }
  ui.context.hidden=false;
  ui.context.dataset.door=door?.id??'';
  ui.context.setAttribute('aria-label',door?
    'Actions near '+door.id.toLowerCase()+' door':'Soldier and waypoint actions');

  // Use a real reserved viewport lane between header and bottom controls.
  // This is measured after the tray becomes visible so two-row door menus
  // cannot cover BACK, TOOLS, or GO in portrait or landscape.
  const bounds=ui.context.getBoundingClientRect();
  const barTop=ui.back.getBoundingClientRect().top;
  const trayHeight=bounds.height;
  const minTop=cssH<500?57:112;
  const maxTop=Math.max(minTop,barTop-trayHeight-12);
  const target=worldToScreen(where,node?12:26);
  const wantTop=node||doorFocusId?
    target.y-trayHeight-22:maxTop;
  const desired=wantTop<minTop?target.y+25:wantTop;
  const top=clamp(desired,minTop,maxTop);
  ui.context.style.left=clamp(target.x,bounds.width/2+7,
    cssW-bounds.width/2-7)+'px';
  ui.context.style.top=top+'px';
  ui.context.style.transform='translateX(-50%)';
}
ui.context.addEventListener('click',event=>{
  const button=(event.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]');
  if(!button||state.phase!=='planning')return;
  const action=button.dataset.action;
  const a=uid(selected);
  if(!a)return;
  const node=selectedPlanNode();
  const door=focusedDoor(a,node);
  const nodeNearDoor=!!(node&&door&&
    distance(node.p,doorCenter(door))<=43);
  switch(action){
    case 'ctxLook':armFacing('look');return;
    case 'ctxPie':armFacing('pie');return;
    case 'ctxStrafe':armFacing('strafe');return;
    case 'ctxDelete':
      if(node)deletePlanNode(state,selected,node.id);
      selectedNode=null;doorFocusId=null;break;
    case 'ctxStack':
      if(door&&!planStack(state,selected,door.id,
        nodeNearDoor?node?.id:undefined))
        state.events.push('NO REACHABLE STACK POSITION');
      selectedNode=null;doorFocusId=null;break;
    case 'ctxOpen':
    case 'ctxKick':
    case 'ctxHold':
      if(door&&!doorAtNode(state,selected,door.id,
        action==='ctxOpen'?'open':action==='ctxKick'?'kick':'hold',
        nodeNearDoor?node?.id:undefined))
        state.events.push('DOOR NOT REACHABLE FROM THAT POINT');
      selectedNode=null;doorFocusId=null;break;
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
  const active=uid(selected);
  ui.stance.textContent=active?.posture==='crouch'?'STAND':'CROUCH';
  ui.stance.setAttribute('aria-pressed',String(active?.posture==='crouch'));
  ui.contact.setAttribute('aria-pressed',String(active?.haltOnContact));
  ui.variant.textContent='SITE '+(state.variant+1)+'/3';
  ui.back.disabled=!active?.plan.length;
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
  ui.hint.hidden=state.started&&!looking;
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
        const end={x:point.x+Math.cos(n.facing)*40,
          y:point.y+Math.sin(n.facing)*40};
        line(point,end,'#ebcea1',2.1);circle(end.x,end.y,2.2,'#ebcea1');
      }
      if(n.aimMode==='track'&&n.aimPoint){
        line(point,n.aimPoint,'#ddb37c',1.8);
        circle(n.aimPoint.x,n.aimPoint.y,7,'#e6b77d');
        circle(n.aimPoint.x,n.aimPoint.y,3,'#203732');
        draw.textAlign='left';draw.font='bold 10px monospace';
        draw.fillStyle='#e8cba2';
        draw.fillText('PIE · TRACK',point.x+12,point.y-12);
      }else if(n.aimMode==='fixed'){
        draw.textAlign='left';draw.font='bold 10px monospace';
        draw.fillStyle='#d5e8de';
        draw.fillText(n.aimLabel==='strafe'?'STRAFE · HOLD':'LOOK',
          point.x+12,point.y-12);
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
        const aim=worldToScreen({x:n.p.x+Math.cos(n.facing)*38,
          y:n.p.y+Math.sin(n.facing)*38},8);
        line(point,aim,'#efd5a4',2);
        circle(aim.x,aim.y,3,'#efd5a4');
      }
      if(n.aimMode==='track'&&n.aimPoint){
        const target=worldToScreen(n.aimPoint,12);
        line(point,target,'#dcb988',1.8);
        circle(target.x,target.y,8,'#eac089');
        circle(target.x,target.y,3,'#264039');
        draw.fillStyle='#f1d7a4';draw.textAlign='left';
        draw.font='bold 10px monospace';
        draw.fillText('PIE · TRACK',point.x+12,point.y-13);
      }else if(n.aimMode==='fixed'){
        draw.fillStyle='#d2eee4';draw.textAlign='left';
        draw.font='bold 10px monospace';
        draw.fillText(n.aimLabel==='strafe'?'STRAFE · HOLD':'LOOK',
          point.x+12,point.y-13);
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
    const pawn=worldToScreen(a.p,32),ground=worldToScreen(a.p,1);
    draw.textAlign='center';draw.font='bold 12px monospace';
    draw.fillStyle=color;draw.fillText(a.name,pawn.x,pawn.y-9);
    if(a.id===selected){
      draw.strokeStyle='#e9d6b1';draw.lineWidth=2.1;
      draw.beginPath();draw.arc(ground.x,ground.y,14,0,Math.PI*2);draw.stroke();
    }
    if(a.suppression>.53){
      draw.font='bold 9px monospace';draw.fillStyle='#e5bc92';
      draw.fillText('SUPPRESSED',pawn.x,pawn.y-23);
    }
  }
  // Screen-space icons stay readable regardless of ortho pitch or zoom.
  for(const hostile of enemies(state)){
    if(!liveVisibility(state,hostile.p))continue;
    const pawn=worldToScreen(hostile.p,33);
    const ground=worldToScreen(hostile.p,1);
    if(hostile.health<=0){
      draw.fillStyle='#f0b39a';draw.textAlign='center';
      draw.font='bold 11px monospace';
      draw.fillText('× DOWN',pawn.x,pawn.y-13);
      draw.strokeStyle='#d99980';draw.lineWidth=2;
      draw.beginPath();draw.arc(ground.x,ground.y,14,0,Math.PI*2);draw.stroke();
    }else{
      draw.strokeStyle='#e2a18b';draw.lineWidth=1.6;
      draw.beginPath();draw.arc(ground.x,ground.y,12,0,Math.PI*2);draw.stroke();
    }
  }
  for(const member of team(state)){
    const pawn=worldToScreen(member.p,33);
    if(member.health<=0){
      draw.font='bold 11px monospace';draw.fillStyle='#f4baa7';
      draw.textAlign='center';draw.fillText('× DOWN',pawn.x,pawn.y-14);
    }else if(member.health===1){
      draw.fillStyle='#e6a485';draw.fillRect(pawn.x-10,pawn.y+1,20,3);
    }
  }
  for(const door of state.doors){
    const visibility=doorVisibility(state,door);
    if(!visibility.known)continue;
    const p=worldToScreen(doorCenter(door),38);
    const focused=doorFocusId===door.id;
    const label=visibility.live?(door.open?'OPEN':'DOOR'):'DOOR';
    draw.font='bold 10px monospace';draw.textAlign='center';
    draw.strokeStyle=focused?'#ffe1a0':'#e1c18b';
    draw.lineWidth=focused?2.8:1.7;
    draw.beginPath();draw.arc(p.x,p.y+13,focused?12:9,0,2*Math.PI);
    draw.stroke();
    draw.fillStyle='#f0d9ab';draw.fillText(label,p.x,p.y-4);
  }
  // The 3D camera does not define combat outcomes: use the same shot event
  // visibility and damage flags as the physical effects and 2D renderer.
  for(const shot of state.shots){
    const visibility=shotVisibility(state,shot);
    const start=worldToScreen(shot.start,15);
    const point=worldToScreen(shot.end,27);
    const fade=contactFade(shot.age,.40);
    if(visibility.trace&&shot.age<.22){
      draw.globalAlpha=contactFade(shot.age,.22);
      line(start,point,shot.side==='blue'?'#f6dfa9':'#f0a28a',2.2);
      draw.globalAlpha=1;
    }
    if(visibility.flash&&shot.age<.14){
      draw.globalAlpha=contactFade(shot.age,.14);
      circle(start.x,start.y,6+2*(1-shot.age/.14),'#ffdd9c');
      draw.globalAlpha=1;
    }
    if(!visibility.impact||!shot.hit)continue;
    draw.globalAlpha=fade;
    draw.strokeStyle=shot.down?'#f5c5b1':'#ed9e80';
    draw.lineWidth=shot.down?3:2;
    draw.beginPath();draw.arc(point.x,point.y,
      (shot.down?17:10)+(1-fade)*8,0,2*Math.PI);draw.stroke();
    draw.fillStyle='#f2b39b';draw.font='bold 11px monospace';
    draw.textAlign='center';
    draw.fillText(shot.down?'DOWN':'HIT',point.x,point.y-17);
    draw.globalAlpha=1;
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
    const visible=a.health>0?isSeen(state,a):liveVisibility(state,a.p);
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
    rect(-13,-4,29,8,'#574d49');rect(-3,-9,5,18,'#a46556');
    draw.restore();
    draw.strokeStyle='#d39b84';draw.lineWidth=2;
    draw.beginPath();draw.arc(a.p.x,a.p.y,19,0,Math.PI*2);draw.stroke();
    draw.fillStyle='#edbea4';draw.font='bold 11px monospace';
    draw.textAlign='center';draw.fillText('× DOWN',a.p.x,a.p.y-23);
    return;
  }
  if(friendly&&(a.id===selected)){
    draw.strokeStyle='#e8d6b1';draw.lineWidth=1.6;
    draw.beginPath();draw.arc(a.p.x,a.p.y,16,0,2*Math.PI);draw.stroke();
    conical(a);
  }
  const impactAge=state.seconds-a.lastHitAt;
  const flinch=impactAge>=0&&impactAge<.28?1-impactAge/.28:0;
  const firing=state.shots.some(shot=>shot.shooterId===a.id&&
    shot.age<.11&&shotVisibility(state,shot).flash);
  draw.save();
  draw.translate(a.p.x-flinch*2.3,a.p.y+flinch*1.7);
  draw.rotate(a.heading+flinch*.14);
  circle(0,2,11,'#0d1b20af');circle(0,0,9.2,friendly?'#4b756f':'#794a43');
  // Body and alternating leg extension are driven by actual travel.
  const gait=Math.sin(state.seconds*15+Math.floor(a.p.x*.15))*
    Math.min(1,a.velocity/70)*3.5;
  rect(-9,-7+gait,9,5,friendly?'#304842':'#4b3633');
  rect(-9,2-gait,9,5,friendly?'#304842':'#4b3633');
  rect(-7,-5,14,10,c);
  rect(-10,-4,5,8,friendly?'#45625d':'#563e39');
  circle(4,0,3.8,friendly?'#d3dac1':'#d0a58a');
  rect(firing?2:5,-2,18,4,'#1a2527');
  rect(firing?17:20,-1,6,2,'#a2a9a1');
  draw.restore();
  if(friendly){
    draw.textAlign='center';draw.font='bold 10px monospace';
    draw.fillStyle=c;draw.fillText(a.name,a.p.x,a.p.y-21);
    if(a.suppression>.53){
      draw.fillStyle='#eac69d';draw.font='bold 9px monospace';
      draw.fillText('SUPP',a.p.x,a.p.y-32);
    }
    if(a.health===1){draw.fillStyle='#e7a886';
      draw.fillRect(a.p.x-8,a.p.y+13,16,2);}
  }else{
    draw.strokeStyle='#f0c5a4';draw.lineWidth=1.4;
    draw.strokeRect(a.p.x-12,a.p.y-12,24,24);
  }
}
function contacts(){
  for(const shot of state.shots){
    const visibility=shotVisibility(state,shot);
    const fade=contactFade(shot.age,.40);
    draw.globalAlpha=fade;
    if(visibility.trace&&shot.age<.23)
      line(shot.start,shot.end,
        shot.side==='blue'?'#f6db9d':'#f2a087',2.3);
    if(visibility.flash&&shot.age<.12)
      circle(shot.start.x,shot.start.y,4+fade*4,'#f4dbb0');
    if(visibility.impact){
      circle(shot.end.x,shot.end.y,shot.hit?5:2.8,
        shot.hit?'#de8b78':'#dfc8a4');
      if(shot.hit){
        draw.fillStyle='#efb19c';draw.font='bold 11px monospace';
        draw.textAlign='center';
        draw.fillText(shot.down?'DOWN':'HIT',shot.end.x,shot.end.y-16);
      }
    }
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
function useSelectedGround(pt:Pt){
  if(state.phase!=='planning')return;
  if(looking){
    const mode=lookMode==='pie'?'track':lookMode==='strafe'?'fixed':'free';
    if(!planAim(state,selected,mode,pt,selectedNode??undefined,lookMode))
      state.events.push('SELECT A DIFFERENT AIM POINT');
    looking=false;selectedNode=null;updateHud();return;
  }
  if(!planMove(state,selected,pt))
    state.events.push('NO WALKABLE ROUTE');
  selectedNode=null;updateHud();
}
function reset(next=state.variant){
  state=newSession(next);selected='rook';looking=false;
  selectedNode=null;doorFocusId=null;draggingNode=null;
  cursor=null;trace=null;zoom=1;panX=panY=0;
  fogStamp=-1;lastSoundShotCount=0;lastEventAudio='';
  layout();updateHud();
}
ui.rook.addEventListener('click',()=>selectUnit('rook'));
ui.back.addEventListener('click',()=>{
  // Build 076 accidentally removed this listener when slimming the HUD.
  if(backOne(state,selected)){
    selectedNode=null;doorFocusId=null;
  }
  updateHud();
});
ui.moss.addEventListener('click',()=>selectUnit('moss'));
ui.clear.addEventListener('click',()=>{clearPlan(state,selected);selectedNode=null;updateHud();});
ui.undo.addEventListener('click',()=>{undoPlan(state,selected);selectedNode=null;updateHud();});
ui.redo.addEventListener('click',()=>{redoPlan(state,selected);selectedNode=null;updateHud();});
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
  else{looking=false;toggling(state);updateHud();}
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
  if(e.code==='KeyL')armFacing('look');
  if(e.code==='Backspace'&&!e.repeat){
    e.preventDefault();ui.back.click();
  }
  if(e.code==='KeyF'&&!e.repeat)armFacing('strafe');
  if(e.code==='KeyB'&&!e.repeat)armFacing('pie');
  if(e.code==='KeyZ'&&(e.ctrlKey||e.metaKey)){
    e.preventDefault();
    if(e.shiftKey)redoPlan(state,selected);
    else undoPlan(state,selected);updateHud();
  }
  if(e.code==='KeyR'&&!e.repeat)reset();
  if(e.code==='KeyV'&&!e.repeat)cameraMode(viewMode==='iso'?'top':'iso');
  if(e.code==='KeyQ'&&!e.repeat)turnCamera(-Math.PI/8);
  if(e.code==='KeyE'&&!e.repeat)turnCamera(Math.PI/8);
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
  // Touch defaults to direct orbit on empty ground after a drag threshold.
  // Desktop retains RMB orbit, MMB/Shift pan; plain clicks still plan.
  const cameraModeInput=e.button===1||e.shiftKey||
    (viewMode!=='plan2d'&&e.button===2);
  if(cameraModeInput){
    const orbit=viewMode!=='plan2d'&&e.button===2;
    activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY,
      startX:e.clientX,startY:e.clientY,wasUnit:false,nodeId:null,
      mode:orbit?'cameraOrbit':'cameraPan',moved:false});
  }else{
    const contextual=looking;
    const hit=contextual?undefined:team(state).find(a=>
      a.health>0&&(viewMode==='plan2d'||!stage?
        distance(a.p,pt)<22:
        distance(worldToScreen(a.p,24),{x:e.clientX,y:e.clientY})<25));
    if(hit)selectUnit(hit.id);
    const node=state.phase==='planning'&&!hit&&!contextual?
      hitNode(pt):null;
    if(node){selectedNode=node.id;doorFocusId=null;}
    activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY,
      startX:e.clientX,startY:e.clientY,wasUnit:!!hit,
      nodeId:node?.id??null,
      mode:node?'node':'undecided',moved:false});
  }
  if(activePointers.size>=2){
    // Cancel any tentative route gesture when a second finger arrives.
    // The remaining finger is never retroactively treated as a map tap.
    for(const pointer of activePointers.values())pointer.mode='cameraMulti';
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
    if(stage&&viewMode!=='plan2d'){
      if(panMid)stage.panBetween(panMid.x,panMid.y,mid.x,mid.y);
      if(pinchDistance>8)stage.zoomAt(gap/pinchDistance,mid.x,mid.y);
      // Two fingers have ONLY pan/pinch behavior: never rotate accidentally.
    }else{
      if(panMid){panX+=mid.x-panMid.x;panY+=mid.y-panMid.y;}
      if(pinchDistance>8)zoom=clamp(zoom*gap/pinchDistance,.65,4.8);
      layout();
    }
    pinchDistance=gap;panMid=mid;return;
  }
  if(p.mode==='cameraOrbit'&&stage&&viewMode!=='plan2d'){
    stage.orbit(dx,dy);
    for(const [mode,button] of [['iso',ui.viewIso],
      ['top',ui.viewTop],['plan2d',ui.view2d]] as const)
      button.setAttribute('aria-pressed',String(mode===stage.view.mode));
    return;
  }
  if(p.mode==='cameraPan'){
    if(stage&&viewMode!=='plan2d')stage.pan(dx,dy);
    else{panX+=dx;panY+=dy;layout();}
    return;
  }
  if(p.mode==='cameraMulti')return;
  // On touch a drag starting in empty space or the map ground orbits.
  // Tapping that same spot still creates a waypoint; dragging from a
  // selected operator or node keeps its deliberate tactical editing semantics.
  if(p.mode==='undecided'&&e.pointerType==='touch'&&p.moved&&
     viewMode!=='plan2d'&&stage){
    p.mode='cameraOrbit';
    stage.orbit(dx,dy);
    return;
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
      selectedNode=p.nodeId;doorFocusId=null;
    }else if(p.mode==='route'&&trace&&trace.length>1){
      const points=[...trace,pt];
      if(!planMoveStroke(state,selected,points.slice(1)))
        state.events.push('NO WALKABLE STROKE');
      selectedNode=null;doorFocusId=null;
    }else if(!p.moved&&!p.wasUnit&&pt.x>=0&&pt.y>=0&&
      pt.x<=W&&pt.y<=H){
      const door=state.doors.find(d=>!d.open&&
        (distance(worldToScreen(doorCenter(d),10),
          {x:e.clientX,y:e.clientY})<24||
         distance(worldToScreen(doorCenter(d),38),
          {x:e.clientX,y:e.clientY})<25));
      if(door&&!looking){
        doorFocusId=door.id;selectedNode=null;
      }else{
        doorFocusId=null;useSelectedGround(pt);
      }
    }
  }
  trace=null;draggingNode=null;activePointers.delete(e.pointerId);
  if(activePointers.size<2){panMid=null;pinchDistance=0;}
  updateHud();
}
canvas.addEventListener('pointerup',e=>releasePointer(e));
canvas.addEventListener('pointercancel',e=>releasePointer(e,true));
canvas.addEventListener('lostpointercapture',e=>releasePointer(e,true));
window.addEventListener('blur',()=>{activePointers.clear();trace=null;
  panMid=null;pinchDistance=0;});
window.addEventListener('resize',layout);
ui.viewIso.addEventListener('click',()=>cameraMode('iso'));
ui.viewTop.addEventListener('click',()=>cameraMode('top'));
ui.view2d.addEventListener('click',()=>cameraMode('plan2d'));
ui.cameraFit.addEventListener('click',()=>{
  if(stage&&viewMode!=='plan2d')stage.resetCamera();
  else{zoom=1;panX=0;panY=0;layout();}
  updateContext();
});
ui.moreOrders.addEventListener('click',()=>{
  const expanded=ui.orders.classList.toggle('compact')===false;
  ui.moreOrders.setAttribute('aria-pressed',String(expanded));
  ui.moreOrders.textContent=expanded?'HIDE':'TOOLS';
  // Never render two command overlays on top of each other.
  updateContext();
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
  if(stage&&viewMode!=='plan2d')stage.update(state,selected,dt,doorFocusId);
  render();updateContext();requestAnimationFrame(tick);
}
layout();cameraMode(viewMode);updateHud();requestAnimationFrame(tick);
