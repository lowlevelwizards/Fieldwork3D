/** Floor Plan operators, civilians, execution warnings and effects.
 * Uses the supplied observation/selection state; never updates game truth.
 */
import {W,H,type Pt} from './breach-core.ts';
import {type Session,type TeamActor,enemies,isSeen,lastKnown,liveVisibility} from './breach-game.ts';
import type {ViewMode} from './breach-3d.ts';
import {replayActorDisclosed,replayCivilianDisclosed} from './breach-replay-visibility.ts';
import {civilianPose} from './breach-civilian-pose.ts';
import {civilianPresentationVisible} from './breach-civilian-visibility.ts';
import {presentUnrecordedRescueMarker}
 from './rendering/breach-3d-disclosure-presenter.ts';
import {shotVisibility,contactFade} from './breach-presentation.ts';
import type {ReplayKnowledgeController} from './breach-replay-knowledge-controller.ts';
export type Actor2DFrame={
 state:Session;replaying:boolean;selected:string;
 replayPlanScope:'all'|'selected'|'none';replayNameTags:boolean;
 replayContactMarkers:boolean;replayObjectiveMarkers:boolean;
 replayAnalysis:boolean;viewMode:ViewMode;
};
export function createBreach2DActorRenderer(config:{
 draw:CanvasRenderingContext2D;
 rect:(x:number,y:number,w:number,h:number,color:string)=>void;
 line:(a:Pt,b:Pt,color:string,width:number)=>void;
 circle:(x:number,y:number,r:number,color:string)=>void;
 colorFor:(id:string)=>string;
 worldToScreen:(p:Pt,height?:number)=>Pt;
 getFrame:()=>Actor2DFrame;
 replayKnowledge:ReplayKnowledgeController;
 executionProblemStatus:(a:TeamActor)=>{orderId:number|null}|null;
 executionMarkerPoint:(a:TeamActor,projected:boolean)=>Pt;
}){
 const {draw,rect,line,circle,colorFor,worldToScreen,getFrame,
   replayKnowledge,executionProblemStatus,executionMarkerPoint}=config;
function conical(a:TeamActor,radius=110){
  const {selected}=getFrame();
  const a0=a.heading-.93,a1=a.heading+.93;
  draw.beginPath();draw.moveTo(a.p.x,a.p.y);
  draw.arc(a.p.x,a.p.y,radius,a0,a1);
  draw.closePath();
  draw.fillStyle=a.id===selected?'rgba(172,217,206,.075)':'rgba(178,199,168,.035)';
  draw.fill();
}

function drawExecutionProblem(a:TeamActor,projected:boolean){
  const {selected}=getFrame();
  const status=executionProblemStatus(a);
  if(!status)return;
  const at=executionMarkerPoint(a,projected);
  draw.save();
  if(a.id===selected){
    const node=a.plan.find(n=>n.id===status.orderId);
    if(node){
      const target=projected?worldToScreen(node.p,8):node.p;
      draw.strokeStyle='#e4ac88';draw.globalAlpha=.58;
      draw.lineWidth=1.3;draw.setLineDash([3,5]);
      draw.beginPath();draw.moveTo(at.x,at.y);
      draw.lineTo(target.x,target.y);draw.stroke();draw.setLineDash([]);
    }
  }
  draw.globalAlpha=.98;
  draw.fillStyle='#a65b48';draw.strokeStyle='#e9b28f';draw.lineWidth=1.7;
  draw.beginPath();draw.arc(at.x,at.y,9,0,Math.PI*2);
  draw.fill();draw.stroke();
  draw.fillStyle='#fff0d8';draw.font='800 12px "Saira Condensed",sans-serif';
  draw.textAlign='center';draw.textBaseline='middle';
  draw.fillText('!',at.x,at.y+.25);
  draw.restore();
}

function missionMarkers(){
  const {state,replaying,replayObjectiveMarkers}=getFrame();
  if(replaying&&!replayObjectiveMarkers)return;
  if(state.rescue&&!state.civilians.some(c=>c.rescueTarget)&&
     presentUnrecordedRescueMarker(state,replaying&&replayKnowledge.omniscient,
       replaying?replayKnowledge.disclosure():null)){
    const p=state.rescue.p;
    draw.strokeStyle='#eed9ad';draw.lineWidth=2.2;
    draw.beginPath();draw.arc(p.x,p.y,13,0,Math.PI*2);draw.stroke();
    draw.fillStyle='#ebdfc0';draw.textAlign='center';
    draw.font='700 12px "Saira Condensed",sans-serif';draw.fillText('CIV',p.x,p.y-18);
  }
  const p=state.mission==='extract'?state.scenario.extract:state.scenario.objective;
  if(state.mission==='clear'||state.mission==='done'||
    !liveVisibility(state,p))return;
  draw.strokeStyle='#d8cc98';draw.lineWidth=2;
  draw.beginPath();draw.arc(p.x,p.y,33,0,Math.PI*2);draw.stroke();
  draw.fillStyle='#e1d1a2';draw.font='600 12px "Work Sans",sans-serif';
  draw.textAlign='center';
  draw.fillText(state.mission==='secure'?'SECURE':'EXTRACT',p.x,p.y-39);
}
function civilianSprite(c:import('./breach-civilian-types.ts').CivilianActor){
  const {state,replaying}=getFrame();
  // Personal observation is not shared civilian intel. Old films omit the
  // observer evidence and must fail closed, not re-evaluate future LOS.
  if(replaying&&replayKnowledge.observerId){
    if(!replayCivilianDisclosed(state,c.id,replayKnowledge.disclosure()))return;
  }else if(!civilianPresentationVisible(c,replaying,replayKnowledge.omniscient,
       liveVisibility(state,c.p)))return;
  const coats=['#766e62','#637d75','#82726b','#667985'];
  const trousers=['#454c4b','#61574d','#4e5664'];
  const coat=coats[(c.appearanceSeed>>>0)%coats.length];
  const pants=trousers[(c.appearanceSeed>>>4)%trousers.length];
  draw.save();draw.translate(c.p.x,c.p.y);draw.rotate(c.heading);
  const pose=civilianPose(c);
  if(pose==='down'||pose==='carried'||pose==='dragged'){
    draw.globalAlpha=pose==='carried'?.96:.83;
    rect(-10,-6,23,12,coat);rect(7,-5,8,10,'#ba9880');
  }else{
    rect(-12,-6,7,5,pants);rect(-12,1,7,5,pants);
    rect(-7,-8,16,16,coat);
    rect(7,-4.5,9,9,'#b9997e');
    if(pose==='compliant'){
      rect(2,-16,5,9,'#b9997e');rect(2,7,5,9,'#b9997e');
    }else if(pose==='hide'||pose==='injured'||pose==='seated'){
      rect(-5,-11,7,3,'#b9997e');rect(-5,8,7,3,'#b9997e');
    }else{
      const swing=pose==='run'?
        Math.sin(state.seconds*13+c.appearanceSeed)*3:
        pose==='walk'?Math.sin(state.seconds*8+c.appearanceSeed)*1.5:
        pose==='injured-walk'?
          Math.sin(state.seconds*5+c.appearanceSeed)*.9:0;
      rect(-5+swing,-12,8,4,'#b9997e');
      rect(-5-swing,8,8,4,'#b9997e');
    }
  }
  draw.restore();
}
function sprite(a:TeamActor){
  const {state,replaying,selected,replayPlanScope,replayNameTags,replayContactMarkers}=getFrame();
  if(a.side==='red'&&!(replaying&&replayKnowledge.omniscient)){
    const visible=replaying?replayActorDisclosed(state,a,replayKnowledge.disclosure()):
      a.health>0?isSeen(state,a):liveVisibility(state,a.p);
    if(!visible){
      const memory=lastKnown(state,a.id);
      if(!replayKnowledge.observerId&&memory&&a.health>0&&state.seconds-memory.at<25){
        draw.fillStyle=memory.status==='heard'?'#e6bb828e':'#d19d837e';
        draw.font='700 16px "Saira Condensed",sans-serif';draw.textAlign='center';
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
    draw.fillStyle='#7e363092';draw.beginPath();
    draw.ellipse(a.p.x,a.p.y,13,6,a.heading,0,2*Math.PI);draw.fill();
    return;
  }
  if(friendly&&(a.id===selected)&&
     (!replaying||replayPlanScope!=='none')){
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
  draw.rotate(a.heading+flinch*.14+
    (a.injuryStage===2?.14:a.injuryStage===1?.04:0));
  circle(0,2,11,'#0d1b20af');circle(0,0,9.2,friendly?'#4b756f':'#794a43');
  // Body and alternating leg extension are driven by actual travel.
  const gait=Math.sin(state.seconds*15+Math.floor(a.p.x*.15))*
    Math.min(1,a.velocity/70)*(a.injuryStage===2?2.1:3.5);
  rect(-9,-7+gait,9,5,friendly?'#304842':'#4b3633');
  rect(-9,2-gait,9,5,friendly?'#304842':'#4b3633');
  rect(-7,-5,14,10,c);
  rect(-10,-4,5,8,friendly?'#45625d':'#563e39');
  circle(4,0,3.8,friendly?'#d3dac1':'#d0a58a');
  rect(firing?2:5,-2,
    a.weapon==='smg'?13:a.weapon==='rifle'?23:a.weapon==='shotgun'?20:18,
    a.weapon==='shotgun'?5:4,'#1a2527');
  rect(firing?17:20,-1,6,2,'#a2a9a1');
  draw.restore();
  if(a.traversal){
    // Floor Plan has no vertical axis; retain a small physical crossing
    // indicator instead of making the operator vanish behind low furniture.
    const t=a.traversalElapsed/Math.max(.001,a.traversal.duration);
    draw.save();
    draw.strokeStyle='#e8cc8e';draw.lineWidth=2.2;
    draw.globalAlpha=.75;
    draw.beginPath();draw.arc(a.p.x,a.p.y,15,-Math.PI/2,
      -Math.PI/2+Math.PI*2*Math.max(0,Math.min(1,t)));draw.stroke();
    draw.globalAlpha=1;draw.textAlign='center';
    draw.fillStyle='#f5dca0';
    draw.font='700 10px "Saira Condensed",sans-serif';
    draw.fillText(a.traversal.kind.toUpperCase(),a.p.x,a.p.y-36);
    draw.restore();
  }
  if(friendly){
    draw.textAlign='center';draw.font='700 12px "Saira Condensed",sans-serif';
    draw.fillStyle=c;
    if(!replaying||replayNameTags)draw.fillText(a.name,a.p.x,a.p.y-21);
    if(a.aimInstruction?.mode==='track'&&a.pace!=='run'){
      draw.fillStyle='#f0cd96';draw.font='700 11px "Saira Condensed",sans-serif';
      draw.fillText('PIE ACTIVE',a.p.x,a.p.y-33);
    }
    if(a.suppression>.53){
      draw.fillStyle='#eac69d';draw.font='700 11px "Saira Condensed",sans-serif';
      draw.fillText('SUPP',a.p.x,a.p.y-43);
    }
    if(a.health===1){draw.fillStyle='#e7a886';
      draw.fillRect(a.p.x-8,a.p.y+13,16,2);}
  }else{
    // The enemy is still drawn; only the optional red tactical outline
    // disappears when replay contact markers are disabled.
    if(!replaying||replayContactMarkers){
      draw.strokeStyle='#f0c5a4';draw.lineWidth=1.4;
      draw.strokeRect(a.p.x-12,a.p.y-12,24,24);
    }
    // Enemy names are intentionally never shown.
  }
}
function contacts(){
  const {state,replaying,replayAnalysis,replayContactMarkers,viewMode}=getFrame();
  if(replaying&&replayAnalysis&&replayContactMarkers)
    for(const a of enemies(state)){
    if(a.health<=0)continue;
    const start=viewMode==='plan2d'?a.p:worldToScreen(a.p,22);
    const focus=a.contact??a.watch;
    if(focus){
      const end=viewMode==='plan2d'?focus:worldToScreen(focus,22);
      draw.save();draw.strokeStyle='#e4ae78';draw.lineWidth=1.7;
      draw.setLineDash([5,4]);draw.beginPath();
      draw.moveTo(start.x,start.y);draw.lineTo(end.x,end.y);
      draw.stroke();draw.setLineDash([]);draw.restore();
    }
    if(a.defense){
      const p=viewMode==='plan2d'?a.defense:worldToScreen(a.defense,5);
      draw.strokeStyle='#d6b986';draw.lineWidth=2;
      draw.strokeRect(p.x-8,p.y-8,16,16);
    }
  }
  for(const m of state.dropped){
    rect(m.p.x-3,m.p.y-1,6,2,'#202e2d');
  }
  for(const g of state.grenades){
    circle(g.p.x,g.p.y,3,'#a7b4a0');
  }
  for(const b of state.flashBursts){
    draw.globalAlpha=Math.max(0,1-b.age/.7)*.85;
    circle(b.p.x,b.p.y,13+48*b.age,'#f6edcc');
    draw.globalAlpha=1;
  }
  for(const shot of state.shots){
    // Shot geometry can expose an unconfirmed enemy position in a personal
    // contact review; team-wide ballistic evidence is disabled in this mode.
    if(replaying&&replayKnowledge.observerId)continue;
    const visibility=replaying&&replayKnowledge.omniscient?
      {trace:true,flash:true,impact:true}:shotVisibility(state,shot);
    const fade=contactFade(shot.age,.40);
    draw.globalAlpha=fade;
    if(visibility.trace&&shot.age<.23)
      line(shot.start,shot.end,
        shot.side==='blue'?'#f6db9d':'#f2a087',2.3);
    if(visibility.flash&&shot.age<.12)
      circle(shot.start.x,shot.start.y,4+fade*4,'#f4dbb0');
    if(visibility.impact){
      const color=shot.surface==='blood'?'#b46859':
        shot.surface==='metal'?'#f1cf91':
        shot.surface==='wood'?'#e9ba7e':'#dfc8a4';
      circle(shot.end.x,shot.end.y,shot.hit?5:3.7,color);
      if(shot.hit){
        draw.fillStyle='#efb19c';draw.font='700 12px "Saira Condensed",sans-serif';
        draw.textAlign='center';
        // Physical impacts carry the outcome without a floating DOWN label.
      }
    }
    draw.globalAlpha=1;
  }
}
function endMessage(){
  const {state,replaying}=getFrame();
  if(!replaying&&(state.phase==='won'||state.phase==='lost')){
    // The HTML debrief owns the readable text and restart buttons.
    draw.fillStyle='#101c1f88';draw.fillRect(0,0,W,H);
  }
}

 return {drawExecutionProblem,missionMarkers,civilianSprite,sprite,contacts,endMessage};
}
