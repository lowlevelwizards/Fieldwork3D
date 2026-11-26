import type {Session,TeamActor} from '../breach-game.ts';
import type {Pt} from '../breach-core.ts';
import {captureVitalStatus,FATAL_BLOOD_LOSS} from '../breach-capture-vitals.ts';
import {bleedingRate} from '../breach-medical-wounds.ts';
import {presentActor,presentCivilian} from '../rendering/breach-3d-disclosure-presenter.ts';
import {sessionWorldGeometry} from '../breach-world-context.ts';

export function visibleTacticalPerson(s:Session,id:string){
 const a=s.operators.find(a=>a.id===id&&a.side==='red');
 if(a&&presentActor(s,a,false,null))return a;
 const c=s.civilians.find(c=>c.id===id);
 return c&&presentCivilian(s,c,false,null)?c:null;
}
export function medicalStatusMarker(a:TeamActor):{label:string;color:string;remaining?:number}|null{
 const status=captureVitalStatus(a);
 if(status!=='conscious'&&status!=='critical')return null;
 if(bleedingRate(a.medical)>0)return {label:status==='critical'?'CRITICAL':'BLEEDING',
  color:'#db786c',remaining:Math.max(0,Math.min(1,1-a.medical.bloodLoss/FATAL_BLOOD_LOSS))};
 return null;
}
/** Live, disclosed HUD only. No extra medical simulation or replay inference. */
export function drawTacticalPersonStatus(ctx:CanvasRenderingContext2D,s:Session,
 project:(p:Pt,h:number)=>Pt,plan2d:boolean,dpr:number,focus:string|null){
 const observers=s.operators.filter(a=>a.side==='blue'&&a.health>0);
 const world=sessionWorldGeometry(s);
 const proximity=(p:Pt)=>{let nearest=80;
  for(const a of observers){const d=Math.hypot(a.p.x-p.x,a.p.y-p.y);
   if(d<nearest&&world.isClear(a.p,p,s.doors))nearest=d;}
  return Math.max(0,Math.min(1,(80-nearest)/45));
 };
 ctx.save();ctx.setTransform(dpr,0,0,dpr,0,0);
 function selection(p:Pt,height:number){
  const v=project(p,height);ctx.beginPath();ctx.arc(v.x,v.y,15,0,Math.PI*2);
  ctx.strokeStyle='#f6f0df';ctx.lineWidth=1.5;ctx.stroke();
 }
 function badge(p:Pt,height:number,m:{label:string;color:string;remaining?:number},opacity:number){
  ctx.save();ctx.globalAlpha*=opacity*.65;
  const v=project(p,height),x=v.x+17,y=v.y-23;
  ctx.beginPath();ctx.arc(x,y,11,0,Math.PI*2);ctx.fillStyle='#202627';ctx.fill();
  ctx.lineWidth=2.5;ctx.strokeStyle='#606367';ctx.stroke();
  ctx.beginPath();ctx.arc(x,y,11,-Math.PI/2,-Math.PI/2+Math.PI*2*(m.remaining??1));ctx.strokeStyle=m.color;ctx.stroke();
  ctx.fillStyle=m.color;ctx.fillRect(x-5,y-1.5,10,3);ctx.fillRect(x-1.5,y-5,3,10);
  ctx.font='bold 9px sans-serif';ctx.textAlign='center';ctx.textBaseline='bottom';
  ctx.lineWidth=3;ctx.strokeStyle='#202627';ctx.strokeText(m.label,x,y-14);
  ctx.fillText(m.label,x,y-14);
  ctx.restore();
 }
 for(const a of s.operators){
  const marker=medicalStatusMarker(a),chosen=focus===a.id&&a.side==='red';
  if(!marker&&!chosen)continue;
  if(!presentActor(s,a,false,null))continue;
  const height=plan2d?0:a.health>0?24:4;
  if(chosen)selection(a.p,height);
  const opacity=marker?proximity(a.p):0;
  if(marker&&opacity>0)badge(a.p,height,marker,opacity);
 }
 for(const c of s.civilians){
  const chosen=focus===c.id;
  if(!chosen)continue;
  if(!presentCivilian(s,c,false,null))continue;
  const height=plan2d?0:c.health>0?18:4;
  if(chosen)selection(c.p,height);
 }
 ctx.restore();
}
