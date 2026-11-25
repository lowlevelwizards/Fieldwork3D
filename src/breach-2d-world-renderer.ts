/** Owns floor, architecture, physical light and decal drawing.
 * Only reads live or historically disclosed presentation state.
 */
import {W,H,GRID,doorCenter,doorLeafSegment,type Pt,type Segment} from './breach-core.ts';
import type {TacticalScene3D,ViewMode} from './breach-3d.ts';
import type {createBreach2DVisibilityRenderer} from './breach-2d-visibility-renderer.ts';
import type {createBreach2DActorRenderer} from './breach-2d-actor-renderer.ts';
import type {createBreach2DRouteOverlays} from './breach-2d-route-overlays.ts';
import type {createBreach2DReplayOverlays} from './breach-2d-replay-overlays.ts';
import type {createBreach2DProjectedOverlays} from './breach-2d-projected-overlays.ts';
import {sessionWorldGeometry} from './breach-world-context.ts';
import {team,type Session,type TeamActor,liveVisibility,isSeen} from './breach-game.ts';
import {civilianPresentationVisible} from './breach-civilian-visibility.ts';
import {previewKnownDoorSwing} from './breach-door-swing-preview.ts';
import {spatialSurfaceState,windowPresentationKnown} from './breach-presentation.ts';
import {windowApertureSegment} from './worldgen/window-geometry-contract.ts';
import {doorKnown} from './breach-intel.ts';
import {lightingPresentation} from './equipment-lighting-presentation.ts';
import {fixtureLightingVisuals,fixtureVisualColor} from './equipment-lighting-visuals.ts';
import {sitePowerControls,currentControlState} from './equipment-site-power-controls.ts';
import {weaponClearance} from './breach-weapon-clearance.ts';
import {lightBeamBlockers,lightBeamFootprint,weaponLightEmitter} from './equipment-weapon-light-beam.ts';
import {sameWeaponConfiguration} from './equipment-weapon-assemblies.ts';
import {weaponLightEmitting} from './equipment-weapon-light-operations.ts';
import {confinedGroundRadius} from './breach-ground-geometry.ts';
import {bloodMarkRadius} from './breach-blood-evidence.ts';
import {wallMarkPose,doorMarkLocalPose,coverMarkLocalPose,windowMarkPose} from './breach-impact-surface.ts';
import {presentActor,presentDecor} from './rendering/breach-3d-disclosure-presenter.ts';
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
const controlDiscoveryCache=new WeakMap<Session,{site:NonNullable<Session['site']>;
 bucket:number;revision:number;ids:ReadonlySet<string>}>();
function visiblePowerControlIds(state:Session):ReadonlySet<string>{
 if(!state.site)return new Set();
 const bucket=Math.floor(state.seconds*8);
 const entry=controlDiscoveryCache.get(state);
 if(entry&&entry.site===state.site&&entry.bucket===bucket&&
    entry.revision===state.objectRevision)return entry.ids;
 const ids=new Set<string>();
 for(const c of sitePowerControls(state.site))
  if(liveVisibility(state,c.p))ids.add(c.id);
 controlDiscoveryCache.set(state,{site:state.site,bucket,
  revision:state.objectRevision,ids});
 return ids;
}
function noise(x:number,y:number){const v=Math.sin(x*123.31+y*98.717)*43897.44;return v-Math.floor(v);}
function terrain(){
  const state=getState();
  const replaying=isReplaying();
  const bounds=state.site?.bounds??{minX:0,minY:0,maxX:W,maxY:H};
  const width=bounds.maxX-bounds.minX,height=bounds.maxY-bounds.minY;
  rect(bounds.minX,bounds.minY,width,height,'#2c3733');
  // A larger generated property must not cause proportionally more dots
  // per frame on a phone. Keep the old 17u spacing for legacy maps.
  const detailStep=Math.max(17,Math.ceil(17*Math.sqrt(width*height/(W*H))));
  for(let y=bounds.minY+6;y<bounds.maxY;y+=detailStep)
    for(let x=bounds.minX+6;x<bounds.maxX;x+=detailStep){
    const n=noise(x,y);
    if(n>.56)rect(x+3*n,y+2*n,2+n*3,2,n>.85?'#435348':'#35453d');
  }
  if(state.site){
    const site=state.site;
    // This low-contrast street approach follows the actual entry side.
    // It is decoration, never navigable geometry or briefing knowledge.
    const side=site.entrySide??'south',x=site.entrance.x,y=site.entrance.y;
    const outward=side==='north'?{x:0,y:-1}:
      side==='east'?{x:1,y:0}:side==='west'?{x:-1,y:0}:
        {x:0,y:1};
    const across={x:-outward.y,y:outward.x};
    const boundary=outward.x>0?bounds.maxX:outward.x<0?bounds.minX:
      outward.y>0?bounds.maxY:bounds.minY;
    const distance=outward.x!==0?(boundary-x)*outward.x:
      (boundary-y)*outward.y;
    if(distance>12){
      const edge={x:x+outward.x*distance,y:y+outward.y*distance};
      draw.fillStyle='#514e43';draw.beginPath();
      draw.moveTo(x+across.x*34,y+across.y*34);
      draw.lineTo(edge.x+across.x*52,edge.y+across.y*52);
      draw.lineTo(edge.x-across.x*52,edge.y-across.y*52);
      draw.lineTo(x-across.x*34,y-across.y*34);
      draw.closePath();draw.fill();
    }
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
    for(let a=bounds.minX;a<=bounds.maxX;a+=GRID*2)
      line({x:a,y:bounds.minY},{x:a,y:bounds.maxY},
        'rgba(161,192,175,.045)',.6);
    for(let b=bounds.minY;b<=bounds.maxY;b+=GRID*2)
      line({x:bounds.minX,y:b},{x:bounds.maxX,y:b},
        'rgba(161,192,175,.045)',.6);
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
  for(const [i,c] of sessionWorldGeometry(state).cover.entries()){
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
  // Only disclosed people are admissible for tactical swing warnings.
  // Historical playback never samples live actor truth to predict contacts.
  const disclosedPeople=!replaying&&state.phase==='planning'?[
    ...state.operators.filter(a=>a.health>0&&
      (a.side==='blue'||isSeen(state,a))).map(a=>a.p),
    ...state.civilians.filter(c=>c.health>0&&
      civilianPresentationVisible(c,false,false,liveVisibility(state,c.p)))
      .map(c=>c.p)
  ]:[];
  const swingPreviews=new Map<string,ReturnType<typeof previewKnownDoorSwing>>();
  for(const [i,wall] of sessionWorldGeometry(state).walls.entries())if(
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
    // Known door direction remains legible at ordinary mobile zoom.
    // Warning colors are driven ONLY by people already disclosed to the team.
    if(!replaying&&state.phase==='planning'&&
       door.kind!=='sliding'&&door.kind!=='shutter'){
      const hinge=door.hinge==='b'?door.b:door.a;
      const preview=previewKnownDoorSwing(door,disclosedPeople);
      swingPreviews.set(door.id,preview);
      const color=preview.tone==='blocked'?'#e76a59':
        preview.tone==='restricted'?'#e9a04a':
        preview.tone==='near'?'#ebc45a':'#ecd5a4';
      draw.save();
      draw.globalAlpha=.94;
      circle(hinge.x,hinge.y,3.5,'#f7d39c');
      draw.setLineDash([4,3.5]);draw.strokeStyle=color;
      draw.lineWidth=door.id===doorFocusId?2.5:1.85;
      draw.beginPath();
      for(let i=0;i<=16;i++){
        const tip=doorLeafSegment({...door,openFraction:i/16}).b;
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
  if(selectedDoor&&state.phase==='planning'&&!replaying&&
     selectedDoor.kind!=='sliding'&&selectedDoor.kind!=='shutter'){
    const hinge=selectedDoor.hinge==='b'?selectedDoor.b:selectedDoor.a;
    const preview=swingPreviews.get(selectedDoor.id)??
      previewKnownDoorSwing(selectedDoor,disclosedPeople);
    const current=doorLeafSegment(selectedDoor);
    const predicted=doorLeafSegment({...selectedDoor,
      openFraction:preview.reachable});
    const warning=preview.tone==='blocked'?'#e76a59':
      preview.tone==='restricted'?'#e9a04a':
      preview.tone==='near'?'#ebc45a':'#e7c995';
    // The filled ghost is only shown on focus: never cover a whole room
    // with bright diagnostics while the player is reading the map.
    draw.save();
    draw.globalAlpha=.48;draw.fillStyle=warning+'29';
    draw.strokeStyle=warning;draw.lineWidth=2;
    draw.setLineDash([5,4]);
    draw.beginPath();draw.moveTo(hinge.x,hinge.y);
    for(let i=0;i<=20;i++){
      const leaf=doorLeafSegment({...selectedDoor,
        openFraction:preview.reachable*i/20});
      draw.lineTo(leaf.b.x,leaf.b.y);
    }
    draw.closePath();draw.fill();draw.stroke();draw.setLineDash([]);
    line(current.a,current.b,'#f4dba9',6);
    // Predicted resting leaf, not a fabricated full-90-degree opening.
    line(predicted.a,predicted.b,warning,5);
    if(preview.contact!==null){
      const contact=doorLeafSegment({...selectedDoor,
        openFraction:preview.contact}).b;
      circle(contact.x,contact.y,3.8,warning);
    }
    draw.restore();
  }
  // Small, knowledge-gated physical electrical props; game illumination
  // remains authoritative and these marks never disclose unvisited rooms.
  if(state.site&&state.sitePower){
    const power=state.sitePower;
    const seenControls=visiblePowerControlIds(state);
    const drawn=new Set<string>();
    for(const control of sitePowerControls(state.site)){
      if(!seenControls.has(control.id))continue;
      const key=control.p.x+','+control.p.y;
      if(drawn.has(key))continue;drawn.add(key);
      const on=currentControlState(control,power.circuits,power.switches);
      const size=control.kind==='breaker'?6:3.6;
      rect(control.p.x-size/2,control.p.y-size/2,size,size,
        on?'#aaad86':'#62584e');
      if(control.kind==='breaker')
        line({x:control.p.x-2,y:control.p.y},
          {x:control.p.x+2,y:control.p.y},
          '#ded7ba',1.4);
    }
  }
  // Generated windows use the same real aperture as physical shots and 3D.
  // Unknown interior glass must not be outlined through historical fog.
  if(state.site){
    for(const opening of state.site.windows??[]){
      if(!windowPresentationKnown(state,opening,
          replaying&&replayKnowledge.omniscient))continue;
      const pane=windowApertureSegment(opening);
      line(pane.a,pane.b,'#1f4d51',8);
      line(pane.a,pane.b,'#8bb6af',4);
      const dx=pane.b.x-pane.a.x,dy=pane.b.y-pane.a.y;
      const length=Math.hypot(dx,dy)||1;
      const normal={x:-dy/length*3,y:dx/length*3};
      for(const p of [pane.a,pane.b])
        line({x:p.x-normal.x,y:p.y-normal.y},
             {x:p.x+normal.x,y:p.y+normal.y},'#d4d5bb',1.6);
    }
    return;
  }
  // Legacy-only map keeps its two authored window markers.
  for(const x of [211,501]){
    line({x,y:97},{x:x+52,y:97},'#8bb6af',4);
    line({x,y:94},{x:x+52,y:94},'#d4d5bb',2);
  }
}
/** A renderer may be reused for live/replay/restart. Cache ownership follows
 * Session identity, not seed, tick, actor ID, or whichever site is global.
 * Weak keys ensure that retired missions do not accumulate light history.
 */
type Beam2DHistory={x:number;y:number;yaw:number;tick:number;shoulderOffset:number;
 config:TeamActor['weaponConfiguration'];footprint:Pt[]};
type Beam2DSessionCache={
 tick:number;revision:number;doorSignature:string;blockers:Segment[];
 history:Map<string,Beam2DHistory>;
};
const beam2DBySession=new WeakMap<Session,Beam2DSessionCache>();
function renderLightingMood2D(){
  const state=getState();
 const mood=lightingPresentation(state.lightingMode);
 if(mood.floorTint<=0)return;
 draw.save();
 draw.fillStyle='rgba(2,7,11,'+mood.floorTint+')';
 const bounds=state.site?.bounds??{minX:0,minY:0,maxX:W,maxY:H};
 draw.fillRect(bounds.minX-9,bounds.minY-9,
  bounds.maxX-bounds.minX+18,bounds.maxY-bounds.minY+18);
 draw.restore();
}
/** State is shared with ISO; floor fog masks undiscovered geometry.
 * The radial gradient is clipped to real opaque world blockers, not a
 * decorative circle that can glow through a closed door.
 */
let fixtureGradientCache:{
 visuals:ReturnType<typeof fixtureLightingVisuals>;
 gradients:Map<string,CanvasGradient>;
}|null=null;
function renderFixtureLighting2D(){
 const state=getState(),replaying=isReplaying();
 if(!state.site)return;
 const view=fixtureLightingVisuals(state);
 if(fixtureGradientCache?.visuals!==view)
  fixtureGradientCache={visuals:view,gradients:new Map()};
 const observer=replaying&&replayKnowledge.groundLensOn?
  replayKnowledge.observerId:null;
 const personal=!!observer;
 const evidence=observer?
  replayKnowledge.personalGround?.at(replayPlayback.time,observer)??null:null;
 for(const f of view.fixtures){
  if(spatialSurfaceState(state,'room',f.roomId,
     replaying&&replayKnowledge.omniscient)==='unknown')continue;
  const micro='micro:'+Math.floor(f.p.x/10)+','+Math.floor(f.p.y/10);
  const fine='fine:'+Math.floor(f.p.x/20)+','+Math.floor(f.p.y/20);
  if(!presentDecor(state,{position:f.p,microKey:micro,fineKey:fine},
     replaying&&replayKnowledge.omniscient,personal,evidence,()=>false))
   continue;
  const color=fixtureVisualColor(f);
  const rgb=((color>>16)&255)+','+((color>>8)&255)+','+(color&255);
  if(f.intensity>0&&f.footprint.length>2){
   draw.save();draw.beginPath();
   draw.moveTo(f.footprint[1].x,f.footprint[1].y);
   for(let i=2;i<f.footprint.length;i++)
    draw.lineTo(f.footprint[i].x,f.footprint[i].y);
   draw.closePath();draw.clip();
   let gradient=fixtureGradientCache!.gradients.get(f.id);
   if(!gradient){
    gradient=draw.createRadialGradient(f.p.x,f.p.y,0,
     f.p.x,f.p.y,f.range);
    const weight=f.intensity*(f.status==='backup'?.27:.35);
    gradient.addColorStop(0,'rgba('+rgb+','+weight.toFixed(3)+')');
    gradient.addColorStop(.42,'rgba('+rgb+','+(weight*.32).toFixed(3)+')');
    gradient.addColorStop(1,'rgba('+rgb+',0)');
    fixtureGradientCache!.gradients.set(f.id,gradient);
   }
   draw.fillStyle=gradient;
   draw.fillRect(f.p.x-f.range,f.p.y-f.range,f.range*2,f.range*2);
   draw.restore();
  }
  // The fixture itself is equipment, not a beacon revealing an unknown
  // room; require precise recorded/observed ground in restricted intel.
  const width=f.kind==='fluorescent'?12:f.kind==='worklight'?8:6;
  const height=f.kind==='fluorescent'?3:5;
  rect(f.p.x-width/2,f.p.y-height/2,width,height,
   '#222c2b');
  rect(f.p.x-width/2+1,f.p.y-height/2+1,
   width-2,Math.max(1,height-2),'#'+color.toString(16).padStart(6,'0'));
  if(f.status==='failed')
   line({x:f.p.x-width/2,y:f.p.y+height/2},
    {x:f.p.x+width/2,y:f.p.y-height/2},'#b97463',1.2);
 }
}
function renderWeaponLights2D(){
 const state=getState(),replaying=isReplaying();
 const active=state.operators.filter(a=>weaponLightEmitting(a));
 if(!active.length)return;
 const world=sessionWorldGeometry(state);
 const tick=Math.floor(state.seconds*8),revision=world.revision;
 // A seek can rewind to the same tick and object revision but a different
 // door aperture. Door state is part of the optical cache dependency.
 const doorSignature=state.doors.map(d=>d.id+':'+
  (d.openFraction??(d.open?1:0)).toFixed(5)+':'+
  (d.glassShattered?1:0)+':'+(d.wedged?1:0)).join('|');
 let cached=beam2DBySession.get(state);
 if(!cached){
  cached={tick:-1,revision:-1,doorSignature:'',blockers:[],
   history:new Map()};
  beam2DBySession.set(state,cached);
 }
 if(cached.tick!==tick||cached.revision!==revision||
    cached.doorSignature!==doorSignature){
  cached.blockers=lightBeamBlockers(world.walls,state.doors,state.coverState);
  cached.tick=tick;cached.revision=revision;
  cached.doorSignature=doorSignature;
  cached.history.clear();
 }
 draw.save();draw.fillStyle='rgba(183,240,205,.12)';
 for(const actor of active){
  // Live play uses current sight; replay uses only recorded actor evidence.
  // A squad replay policy must never be substituted for live presentation.
  if(actor.side==='red'&&!presentActor(state,actor,
      replaying&&replayKnowledge.omniscient,
      replaying?replayKnowledge.disclosure():null))continue;
  const previous=cached.history.get(actor.id);
  const yaw=actor.weaponYaw;
  if(!previous||previous.tick!==tick||
   !sameWeaponConfiguration(previous.config,actor.weaponConfiguration)||
   Math.hypot(previous.x-actor.p.x,previous.y-actor.p.y)>.7||
   previous.shoulderOffset!==(actor.aimSideOffset??0)||
   Math.abs(Math.atan2(Math.sin(previous.yaw-yaw),
     Math.cos(previous.yaw-yaw)))>.025){
   const muzzle=weaponClearance({x:actor.p.x,z:actor.p.y,
    heading:actor.heading,weaponYaw:yaw,
    shoulderOffset:actor.aimSideOffset??0,weapon:actor.weapon,
    weaponConfiguration:actor.weaponConfiguration,
    equipment:actor.equipment,aim:actor.aim,
    velocity:actor.velocity,recoil:actor.recoil,posture:actor.posture},
    state.doors,state.coverState,world.walls).muzzle;
   const from=weaponLightEmitter(muzzle,actor.weaponConfiguration!);
   cached.history.set(actor.id,{x:actor.p.x,y:actor.p.y,yaw,tick,
    shoulderOffset:actor.aimSideOffset??0,
    config:actor.weaponConfiguration,
    footprint:lightBeamFootprint(from,muzzle.yaw,cached.blockers)});
  }
  const polygon=cached.history.get(actor.id)!.footprint;
  draw.beginPath();draw.moveTo(polygon[0].x,polygon[0].y);
  for(let i=1;i<polygon.length;i++)draw.lineTo(polygon[i].x,polygon[i].y);
  draw.closePath();draw.fill();
 }
 draw.restore();
}
function renderGroundMarks(){
  const state=getState();
  const replaying=isReplaying();
  // Match 3D's conservative personal replay evidence policy until V19.
  if(replaying&&replayKnowledge.observerId)return;
  for(const mark of state.impactMarks){
    // Surface-attached marks cannot be represented as unrelated floor circles.
    if(mark.surface!=='blood'&&(mark.surfaceRef||mark.shotId!==undefined||mark.surface!=='dust'||mark.height===undefined||mark.height>1))continue;
    if(!(replaying&&replayKnowledge.omniscient)&&!liveVisibility(state,mark.p))continue;
    const radius=mark.surface==='blood'?
      confinedGroundRadius(mark.p,bloodMarkRadius(mark),sessionWorldGeometry(state).walls):2.5;
    if(radius<.5)continue;
    draw.globalAlpha=mark.surface==='blood'?.70:Math.max(.18,.78-mark.age*.023);
    circle(mark.p.x,mark.p.y,radius,
      mark.surface==='blood'?(mark.bloodKind==='pool'?'#703b37':'#763c38'):'#4e4b40');
    draw.globalAlpha=1;
  }
 }

 /** Draw owned marks over their corresponding plan-view surface, not on floor. */
 function renderSurfaceMarks(){
  const s=getState(),replaying=isReplaying(),omni=replaying&&replayKnowledge.omniscient;
  if(replaying&&replayKnowledge.observerId)return;
  const walls=sessionWorldGeometry(s).walls;
  for(const mark of s.impactMarks){
   const ref=mark.surfaceRef;
   if(!ref||mark.surface==='blood')continue;
   let point:Pt|undefined;
   if(ref.kind==='wall'){
    const wall=walls[ref.index];
    if(!wall||spatialSurfaceState(s,'wall',ref.index,omni)==='unknown')continue;
    const pose=wallMarkPose(ref,wall);
    if(pose)point={x:pose.x,y:pose.z};
   }else if(ref.kind==='door'){
    const door=s.doors[ref.index];
    if(!door||!omni&&!liveVisibility(s,doorCenter(door))||spatialSurfaceState(s,'door',door.id,omni)==='unknown')continue;
    if(!doorMarkLocalPose(ref,door))continue;
    const leaf=doorLeafSegment(door),dx=leaf.b.x-leaf.a.x,dy=leaf.b.y-leaf.a.y,len=Math.hypot(dx,dy);
    if(len>ref.along)point={x:leaf.a.x+dx/len*ref.along,y:leaf.a.y+dy/len*ref.along};
   }else if(ref.kind==='cover'){
    const authored=s.site?.cover[ref.index],current=s.coverState[ref.index];
    if(!authored||!current||current.toppled||spatialSurfaceState(s,'cover',ref.index,omni)==='unknown')continue;
    const pose=coverMarkLocalPose(ref,authored,current);
    if(pose){
     const t=(authored.orientation??0)*Math.PI/2,co=Math.cos(t),si=Math.sin(t);
     point={x:current.x+(co*pose.x+si*pose.z)*current.w/authored.w,
       y:current.y+(-si*pose.x+co*pose.z)*current.h/authored.h};
    }
   }else if(ref.kind==='window'){
    const pane=s.windows[ref.index];if(!pane||!windowPresentationKnown(s,pane,omni))continue;
    const pose=windowMarkPose(ref,pane);
    if(pose)point={x:pose.x,y:pose.z};
   }
   if(!point||!omni&&!liveVisibility(s,point))continue;
   draw.globalAlpha=.9;
   circle(point.x,point.y,2.5+.4*((mark.damageCount??1)-1),mark.surface==='metal'?'#242b2b':'#3a3028');
   draw.globalAlpha=1;
  }
 }
 /** Read-only diagnostic of bounded, session-owned visual cache. */
 function inspectLightCache(session:Session){
  const cache=beam2DBySession.get(session);
  return cache?{tick:cache.tick,revision:cache.revision,
   doorSignature:cache.doorSignature,lights:cache.history.size,
   blockers:cache.blockers.length}:null;
 }
 return {terrain,furniture,architecture,renderLightingMood2D,
   renderFixtureLighting2D,renderWeaponLights2D,renderGroundMarks,renderSurfaceMarks,inspectLightCache};
}

export type BreachTacticalWorldFrame={
 stage:TacticalScene3D|null;viewMode:ViewMode;
 draw:CanvasRenderingContext2D;dpr:number;cssW:number;cssH:number;
 ox:number;oy:number;viewScale:number;state:Session;replaying:boolean;
 replayAnalysis:boolean;photoClean?:boolean;
 world2D:ReturnType<typeof createBreach2DWorldRenderer>;
 fog2D:ReturnType<typeof createBreach2DVisibilityRenderer>;
 actor2D:ReturnType<typeof createBreach2DActorRenderer>;
 route2D:ReturnType<typeof createBreach2DRouteOverlays>;
 replay2D:ReturnType<typeof createBreach2DReplayOverlays>;
 projected2D:ReturnType<typeof createBreach2DProjectedOverlays>;
};
/** Render-only layer order; 3D Bodycam never receives projected world/X-ray HUD. */
export function renderBreachTacticalWorldFrame(p:BreachTacticalWorldFrame):void{
 const {stage,viewMode,draw,dpr,cssW,cssH,ox,oy,viewScale,
   state,replaying,replayAnalysis,world2D,fog2D,actor2D,route2D,replay2D,projected2D}=p;

  if(stage&&viewMode!=='plan2d'){
    if(p.photoClean){draw.setTransform(dpr,0,0,dpr,0,0);
      draw.clearRect(0,0,cssW,cssH);return;}
    if(stage.isReplayBodycamActive()){
      // Bodycam footage is a clean perspective, not an X-ray tactical HUD.
      // Keep accessible replay transport as DOM, clear only projected plans,
      // floating names, objective circles and selection rings.
      draw.setTransform(dpr,0,0,dpr,0,0);
      draw.clearRect(0,0,cssW,cssH);
      return;
    }
    projected2D.renderProjectedPlans();return;
  }
  draw.setTransform(dpr,0,0,dpr,0,0);
  draw.fillStyle='#141e20';draw.fillRect(0,0,cssW,cssH);
  // Map-space drawing has a single reversible projection.
  draw.save();
  draw.translate(ox,oy);draw.scale(viewScale,viewScale);
  const bounds=state.site?.bounds??{minX:0,minY:0,maxX:W,maxY:H};
  draw.fillStyle='#52655b';
  draw.fillRect(bounds.minX-9,bounds.minY-9,
    bounds.maxX-bounds.minX+18,bounds.maxY-bounds.minY+18);
  world2D.terrain();world2D.furniture();world2D.renderGroundMarks();world2D.renderLightingMood2D();world2D.renderFixtureLighting2D();world2D.renderWeaponLights2D();
  world2D.architecture();world2D.renderSurfaceMarks();fog2D.renderFog();fog2D.renderPersonalGround();
  if(!p.photoClean)actor2D.missionMarkers();
  if(!p.photoClean){route2D.paths();replay2D.renderReplayMovementHistory(false);}
  for(const a of state.civilians)actor2D.civilianSprite(a);
  for(const a of state.operators)actor2D.sprite(a);
  if(!p.photoClean&&(!replaying||replayAnalysis))
    for(const a of team(state))actor2D.drawExecutionProblem(a,false);
  if(!p.photoClean){actor2D.contacts();replay2D.renderReplayGhosts(false);
   replay2D.renderReplayBallistics(false);replay2D.renderReplayFollowMarker(false);
   actor2D.endMessage();}
  draw.strokeStyle='#d4dac64f';draw.lineWidth=2;
  draw.strokeRect(bounds.minX,bounds.minY,
    bounds.maxX-bounds.minX,bounds.maxY-bounds.minY);
  draw.restore();

}

/** Pure responsive 2D tactical fit. No intel, camera mutation or motor state. */
export function fitBreach2DView(input:{
 cssW:number;cssH:number;zoom:number;panX:number;panY:number;
 bounds?:{minX:number;minY:number;maxX:number;maxY:number}|null;
}):{viewScale:number;ox:number;oy:number}{
 const {cssW,cssH,zoom,panX,panY}=input;
 const available=Math.max(240,cssH-(cssH<500?85:172));
 const bounds=input.bounds??{minX:0,minY:0,maxX:W,maxY:H};
 const width=bounds.maxX-bounds.minX,height=bounds.maxY-bounds.minY;
 const fit=Math.min((cssW-20)/width,available/height);
 const viewScale=fit*zoom;
 return {
  viewScale,
  ox:cssW/2-(bounds.minX+bounds.maxX)*viewScale/2+panX,
  oy:cssH/2-(bounds.minY+bounds.maxY)*viewScale/2-11+panY
 };
}

/** Exact inverse of the 2D board fit: center an operator without changing
 * its zoom, camera mode, or the site's intel disclosure.
 */
export function centerBreach2DView(input:{
 cssW:number;cssH:number;zoom:number;point:Pt;
 bounds?:{minX:number;minY:number;maxX:number;maxY:number}|null;
}):{panX:number;panY:number}{
 const {point,cssW,cssH,zoom}=input;
 const bounds=input.bounds??{minX:0,minY:0,maxX:W,maxY:H};
 const {viewScale}=fitBreach2DView({
   cssW,cssH,zoom,panX:0,panY:0,bounds
 });
 const midX=(bounds.minX+bounds.maxX)/2;
 const midY=(bounds.minY+bounds.maxY)/2;
 return {
   panX:(midX-point.x)*viewScale,
   panY:(midY-point.y)*viewScale+11
 };
}
