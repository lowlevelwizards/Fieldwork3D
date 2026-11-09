/** Owns floor, architecture, physical light and decal drawing.
 * Only reads live or historically disclosed presentation state.
 */
import {W,H,GRID,WALLS,COVER,doorCenter,doorLeafSegment,type Pt,type Segment} from './breach-core.ts';
import {type Session,type TeamActor,liveVisibility} from './breach-game.ts';
import {spatialSurfaceState} from './breach-presentation.ts';
import {doorKnown} from './breach-intel.ts';
import {lightingPresentation} from './equipment-lighting-presentation.ts';
import {weaponClearance} from './breach-weapon-clearance.ts';
import {lightBeamBlockers,lightBeamFootprint,weaponLightEmitter} from './equipment-weapon-light-beam.ts';
import {sameWeaponConfiguration} from './equipment-weapon-assemblies.ts';
import {confinedGroundRadius} from './breach-ground-geometry.ts';
import {replayActorDisclosed} from './breach-replay-visibility.ts';
import type {ReplayKnowledgeController} from './breach-replay-knowledge-controller.ts';
import type {ReplayPlaybackController} from './breach-replay-playback-controller.ts';
export type World2DDrawing={
 draw:CanvasRenderingContext2D;
 rect:(x:number,y:number,w:number,h:number,color:string)=>void;
 line:(a:Pt,b:Pt,color:string,width:number)=>void;
 circle:(x:number,y:number,r:number,color:string)=>void;
 getState:()=>Session;
 isReplaying:()=>boolean;
 getDoorFocusId:()=>string|null;
 replayKnowledge:ReplayKnowledgeController;
 replayPlayback:ReplayPlaybackController;
};
export function createBreach2DWorldRenderer({
 draw,rect,line,circle,getState,isReplaying,getDoorFocusId,
 replayKnowledge,replayPlayback
}:World2DDrawing){
function noise(x:number,y:number){const v=Math.sin(x*123.31+y*98.717)*43897.44;return v-Math.floor(v);}
function terrain(){
  const state=getState();
  const replaying=isReplaying();
  rect(0,0,W,H,'#2c3733');
  // A deterministic, low-contrast base, not another terrain simulation.
  for(let y=6;y<H;y+=17)for(let x=6;x<W;x+=17){
    const n=noise(x,y);
    if(n>.56)rect(x+3*n,y+2*n,2+n*3,2,n>.85?'#435348':'#35453d');
  }
  if(state.site){
    const site=state.site;
    // Exterior access follows this actual generated entrance, not a
    // decorative road still pointing at the obsolete fixed station.
    const x=site.entrance.x,y=site.entrance.y;
    draw.fillStyle='#514e43';draw.beginPath();
    draw.moveTo(x-52,H);draw.lineTo(x+52,H);
    draw.lineTo(x+34,y-21);draw.lineTo(x-34,y-21);
    draw.closePath();draw.fill();
    for(const room of site.rooms){
      if(spatialSurfaceState(state,'room',room.id,replaying&&replayKnowledge.omniscient)==='unknown')continue;
      const palette=['#666558','#526b66','#77705c','#58605a'];
      rect(room.x+2,room.y+2,room.w-4,room.h-4,
        room.kind==='hall'?'#4a5c55':palette[room.tone]);
      draw.strokeStyle='#b9b09b18';draw.lineWidth=.8;
      for(let a=room.x+15;a<room.x+room.w-10;a+=25)
        for(let b=room.y+15;b<room.y+room.h-10;b+=25)
          draw.strokeRect(a,b,25,25);
    }
    draw.strokeStyle='rgba(161,192,175,.06)';
    for(let a=0;a<=W;a+=GRID*2)
      line({x:a,y:0},{x:a,y:H},'rgba(161,192,175,.045)',.6);
    for(let b=0;b<=H;b+=GRID*2)
      line({x:0,y:b},{x:W,y:b},'rgba(161,192,175,.045)',.6);
    return;
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
  const state=getState();
  const replaying=isReplaying();
  for(const [i,c] of COVER.entries()){
    if(spatialSurfaceState(state,'cover',i,replaying&&replayKnowledge.omniscient)==='unknown')continue;
    if(c.toppled){
      // Low, collapsed silhouette rather than a standing furniture block.
      draw.save();draw.globalAlpha=.84;
      rect(c.x-c.w/2,c.y-c.h/2,c.w,c.h,'#756f57');
      draw.strokeStyle='#d5ae7d';draw.lineWidth=2.4;
      draw.beginPath();
      draw.moveTo(c.x-c.w/2+3,c.y+c.h/2-3);
      draw.lineTo(c.x+c.w/2-3,c.y-c.h/2+3);
      draw.stroke();draw.restore();
      continue;
    }
    draw.fillStyle='#0f1b1c66';
    draw.fillRect(c.x-c.w/2+6,c.y-c.h/2+7,c.w,c.h);
    rect(c.x-c.w/2,c.y-c.h/2,c.w,c.h,c.low?'#81725b':'#485552');
    rect(c.x-c.w/2+4,c.y-c.h/2+4,c.w-8,c.h-8,c.low?'#60594b':'#394440');
    draw.strokeStyle='#a995777e';draw.lineWidth=2;
    draw.strokeRect(c.x-c.w/2+4,c.y-c.h/2+4,c.w-8,c.h-8);
    line({x:c.x-c.w/2+8,y:c.y},{x:c.x+c.w/2-8,y:c.y},'#9d907348',2);
  }
  if(state.site)return;
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
  const state=getState();
  const replaying=isReplaying();
  const doorFocusId=getDoorFocusId();
  for(const [i,wall] of WALLS.entries())if(
    spatialSurfaceState(state,'wall',i,replaying&&replayKnowledge.omniscient)!=='unknown')
    wallShape(wall.a,wall.b);
  // Closed doors obscure sight and movement; opened doors have an arc.
  for(const door of state.doors){
    if(spatialSurfaceState(state,'door',door.id,replaying&&replayKnowledge.omniscient)==='unknown')continue;
    const a=door.a,b=door.b,center=doorCenter(door);
    // Personal contact review consumes the last door state this operator
    // actually witnessed. Never substitute today's door state after a rewind.
    const personalDoor=replaying&&replayKnowledge.observerId?
      replayKnowledge.doorHistory?.at(replayPlayback.time,replayKnowledge.observerId,door.id):null;
    const visuallyOpen=replaying&&replayKnowledge.observerId?
      (personalDoor?.openFraction??0):
      liveVisibility(state,center)?
        (door.openFraction??(door.open?1:0)):
        (state.intel.doorMemory.get(door.id)??0);
    // Every known hinged door has a true-to-geometry swing preview
    // before selection, so an entry side can be chosen from the briefing.
    if(state.phase==='planning'&&door.kind!=='sliding'&&door.kind!=='shutter'){
      const hinge=door.hinge==='b'?door.b:door.a;
      const end=doorLeafSegment({...door,openFraction:1}).b;
      draw.save();draw.globalAlpha=.62;
      line(hinge,end,'#d2ad7459',2);
      circle(hinge.x,hinge.y,4.2,'#f7d39c');
      draw.setLineDash([3,4]);draw.strokeStyle='#ecd5a47a';draw.lineWidth=1.3;
      draw.beginPath();
      for(let i=0;i<=8;i++){
        const tip=doorLeafSegment({...door,openFraction:i/8}).b;
        if(i===0)draw.moveTo(tip.x,tip.y);else draw.lineTo(tip.x,tip.y);
      }
      draw.stroke();draw.setLineDash([]);draw.restore();
    }
    if(replaying&&replayKnowledge.observerId?
      !!personalDoor?.wedged:door.wedged){
      circle(center.x,center.y,4.5,'#e8b36d');
      line({x:center.x-5,y:center.y+6},{x:center.x+5,y:center.y+6},'#33271b',2);
    }
    if(visuallyOpen<.14){
      line(a,b,'#1c2727',15);
      line(a,b,'#b5a17a',8);
      circle(a.x,a.y,3,'#ead0a0');circle(b.x,b.y,3,'#ead0a0');
      draw.save();draw.translate(center.x,center.y);
      draw.fillStyle='#e4d1a2';draw.font='700 11px "Saira Condensed",sans-serif';
      draw.textAlign='center';draw.fillText('Ⅱ',0,3);draw.restore();
    }else{
      // Remember only the last witnessed angle, never offscreen changes.
      const leaf=doorLeafSegment({...door,openFraction:visuallyOpen});
      line(leaf.a,leaf.b,'#c2b08a',7);
      circle(leaf.a.x,leaf.a.y,3,'#f0d8a9');
    }
  }
  const selectedDoor=state.doors.find(d=>
    d.id===doorFocusId&&doorKnown(state.intel,d.id));
  if(selectedDoor&&state.phase==='planning'){
    const hinge=selectedDoor.hinge==='b'?selectedDoor.b:selectedDoor.a;
    const swept=doorLeafSegment({...selectedDoor,openFraction:1});
    const current=doorLeafSegment(selectedDoor);
    draw.save();draw.globalAlpha=.36;draw.strokeStyle='#e7c995';
    draw.fillStyle='#d9b57b17';draw.setLineDash([5,5]);
    draw.beginPath();draw.moveTo(hinge.x,hinge.y);
    for(let i=0;i<=16;i++){
      const leaf=doorLeafSegment({...selectedDoor,openFraction:i/16});
      draw.lineTo(leaf.b.x,leaf.b.y);
    }
    draw.closePath();draw.fill();draw.stroke();draw.setLineDash([]);
    line(current.a,current.b,'#f4dba9',6);
    line(swept.a,swept.b,'#f4dba9',5);
    draw.restore();
  }
  // Narrow window markers (not navigable openings).
  if(state.site)return;
  for(const x of [211,501]){
    line({x,y:97},{x:x+52,y:97},'#8bb6af',4);
    line({x,y:94},{x:x+52,y:94},'#d4d5bb',2);
  }
}
let beam2DBlockers:Segment[]=[];
let beam2DBlockerTick=-1,beam2DSite=-1,beam2DRevision=-1;
const beam2DHistory=new Map<string,{x:number;y:number;yaw:number;tick:number;
 config:TeamActor['weaponConfiguration'];footprint:Pt[]}>();
function renderLightingMood2D(){
  const state=getState();
 const mood=lightingPresentation(state.lightingMode);
 if(mood.floorTint<=0)return;
 draw.save();
 draw.fillStyle='rgba(2,7,11,'+mood.floorTint+')';
 draw.fillRect(-9,-9,W+18,H+18);
 draw.restore();
}
function renderWeaponLights2D(){
  const state=getState();
  const replaying=isReplaying();
 const active=state.operators.filter(a=>a.health>0&&a.weaponLightOn&&
  a.weaponConfiguration?.slots.light==='light-compact');
 if(!active.length)return;
 const tick=Math.floor(state.seconds*8),site=state.site?.seed??-1;
 if(tick!==beam2DBlockerTick||site!==beam2DSite||
  state.objectRevision!==beam2DRevision){
  beam2DBlockers=lightBeamBlockers(WALLS,state.doors,COVER);
  beam2DBlockerTick=tick;beam2DSite=site;
  beam2DRevision=state.objectRevision;
 }
 draw.save();draw.fillStyle='rgba(183,240,205,.12)';
 for(const actor of active){
  if(actor.side==='red'&&!replayActorDisclosed(state,actor,
      replaying?replayKnowledge.disclosure():{mode:'squad'}))continue;
  const previous=beam2DHistory.get(actor.id);
  const yaw=actor.weaponYaw;
  if(!previous||previous.tick!==tick||!sameWeaponConfiguration(previous.config,actor.weaponConfiguration)||
   Math.hypot(previous.x-actor.p.x,previous.y-actor.p.y)>.7||
   Math.abs(Math.atan2(Math.sin(previous.yaw-yaw),Math.cos(previous.yaw-yaw)))>.025){
   const muzzle=weaponClearance({x:actor.p.x,z:actor.p.y,
    heading:actor.heading,weaponYaw:yaw,weapon:actor.weapon,
    weaponConfiguration:actor.weaponConfiguration,
    equipment:actor.equipment,aim:actor.aim,
    velocity:actor.velocity,recoil:actor.recoil,posture:actor.posture},
    state.doors).muzzle;
   const from=weaponLightEmitter(muzzle,actor.weaponConfiguration!);
   beam2DHistory.set(actor.id,{x:actor.p.x,y:actor.p.y,yaw,tick,
    config:actor.weaponConfiguration,
    footprint:lightBeamFootprint(from,muzzle.yaw,beam2DBlockers)});
  }
  const polygon=beam2DHistory.get(actor.id)!.footprint;
  draw.beginPath();draw.moveTo(polygon[0].x,polygon[0].y);
  for(let i=1;i<polygon.length;i++)draw.lineTo(polygon[i].x,polygon[i].y);
  draw.closePath();draw.fill();
 }
 draw.restore();
}
function renderGroundMarks(){
  const state=getState();
  const replaying=isReplaying();
  for(const mark of state.impactMarks){
    if(!(replaying&&replayKnowledge.omniscient)&&!liveVisibility(state,mark.p))continue;
    const radius=mark.surface==='blood'?
      confinedGroundRadius(mark.p,4,state.site?.walls??WALLS):2.5;
    if(radius<.5)continue;
    draw.globalAlpha=Math.max(.18,.78-mark.age*.023);
    circle(mark.p.x,mark.p.y,radius,
      mark.surface==='blood'?'#914a44':
      mark.surface==='wood'?'#42332a':
      mark.surface==='stone'?'#363936':
      mark.surface==='metal'?'#262e30':'#4e4b40');
    draw.globalAlpha=1;
  }
 }

 return {terrain,furniture,architecture,renderLightingMood2D,
   renderWeaponLights2D,renderGroundMarks};
}
