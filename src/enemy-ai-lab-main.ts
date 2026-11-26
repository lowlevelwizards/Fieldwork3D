/** Isolated developer lab using ordinary live sessions and the fixed-step motor. */
import {generateSite} from './breach-site.ts';
import type {OperationKind} from './breach-operations.ts';
import type {AiGroupKind,AiCompetence} from './breach-ai-identity.ts';
import {newSession,stepSession,toggling,team,enemies,planMove,type Session} from './breach-game.ts';
import {sessionWorldGeometry} from './breach-world-context.ts';
import {aiSiteIndex} from './breach-ai-site-index.ts';
import {awarenessDebugLine} from './breach-awareness-debug.ts';
import {bestBelief} from './breach-awareness.ts';
import type {Pt} from './breach-core.ts';
const get=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const canvas=get<HTMLCanvasElement>('map'),ctx=canvas.getContext('2d')!;
const actorSelect=get<HTMLSelectElement>('actor');
const status=get<HTMLOutputElement>('status'),perf=get<HTMLOutputElement>('perf');
const detail=get<HTMLPreElement>('details'),history=get<HTMLPreElement>('history');
let session:Session|null=null,running=false,lastFrame=0,accum=0;
let times:number[]=[],events:string[]=[],prior=new Map<string,string>();
let driver='';let tickCount=0;
const dist=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
function reset(){
 running=false;accum=0;times=[];events=[];prior.clear();tickCount=0;
 get<HTMLButtonElement>('play').textContent='Play';
 try{
  const seed=Number(get<HTMLInputElement>('seed').value)>>>0;
  const mission=get<HTMLSelectElement>('mission').value as OperationKind;
  const site=generateSite(seed,'small',undefined,{mission,enableIncidentIntent:true});
  const profile=get<HTMLSelectElement>('group').value as AiGroupKind|'';
  const tier=get<HTMLSelectElement>('tier').value as AiCompetence|'';
  if(site.encounter&&(profile||tier))site.encounter.groups=site.encounter.groups.map(g=>({...g,
    ...(profile?{behaviorProfile:profile}:{}),...(tier?{competenceOverride:tier}:{})}));
  session=newSession(0,seed,'floor-plan','small',mission,site,{enableCivilians:true});
  driver='Quiet observation';
  if(get<HTMLSelectElement>('scenario').value==='entry'){
   const scout=team(session)[0];
   const candidates=site.rooms.filter(r=>r.kind==='room').map(r=>({x:r.x+r.w/2,y:r.y+r.h/2}))
    .sort((a,b)=>dist(a,scout.p)-dist(b,scout.p));
   const accepted=candidates.slice(0,5).some(p=>planMove(session!,scout.id,p));
   driver=accepted?'Authored room move accepted':'No legal room move — quiet observation';
  }
  actorSelect.replaceChildren(...enemies(session).map(a=>new Option(a.name+' · '+(a.npcIdentity?.competence??'legacy'),a.id)));
  draw();inspect();
 }catch(e){session=null;status.textContent=String(e);}
}
function sample(){
 if(!session)return;
 const s=session;
 if(s.phase==='planning')toggling(s);
 if(s.phase!=='running'){running=false;get<HTMLButtonElement>('play').textContent='Play';return;}
 const start=performance.now();stepSession(s,1/60);times.push(performance.now()-start);
 if(times.length>600)times.shift();tickCount++;
 for(const a of enemies(s)){
  const next=[a.alert,a.intent?.kind??'—',a.coordinationRole??'—',a.surrendered?'submitted':'',a.health<=0?'down':''].join(' / ');
  if(prior.get(a.id)!==next){
   prior.set(a.id,next);events.push(s.seconds.toFixed(2)+'  '+a.name+'  '+next);
   if(events.length>40)events.shift();
  }
 }
}
function inspect(){
 const s=session;if(!s)return;
 const a=enemies(s).find(a=>a.id===actorSelect.value);
 status.textContent=s.site?.name+' · '+s.seconds.toFixed(2)+'s · '+s.phase+' · '+driver;
 detail.textContent=a?awarenessDebugLine(a)+'\nGOAL '+(a.defense?'position':a.retreatPoint?'withdrawal':a.searchOrigin?'search':a.nav.length?'route':'none')+
  '\nASSIGNMENT '+(a.coordinationPending?'pending':a.coordinationRole??'none')+
  '\nROUTE '+a.nav.length+' points · SEARCH '+a.searchQueue.length+' remaining'+
  '\nMOTIVATION '+(a.npcIdentity?.motivation??'legacy')+
  (a.npcIdentity?'\nTRAITS '+['composure','discipline','curiosity','patience','loyalty'].map(key=>key+' '+Math.round((a.npcIdentity as unknown as Record<string,number>)[key]*100)).join(' · '):''):'No NPCs';
 history.textContent=events.slice(-18).reverse().join('\n');
 if(times.length){
  const sorted=[...times].sort((a,b)=>a-b);
  const q=(x:number)=>sorted[Math.floor((sorted.length-1)*x)].toFixed(2)+' ms';
  perf.textContent='P50 '+q(.5)+' · P95 '+q(.95)+' · P99 '+q(.99)+' · Max '+q(1)+' · '+tickCount+' ticks';
 }else perf.textContent='No samples';
}
function draw(){
 const s=session;if(!s||!s.site)return;
 const box=canvas.getBoundingClientRect(),ratio=Math.min(2,devicePixelRatio||1);
 const width=Math.max(1,Math.round(box.width*ratio)),height=Math.max(1,Math.round(box.height*ratio));
 if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
 ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,width,height);
 const world=sessionWorldGeometry(s),b=world.bounds,scale=Math.min((width-30)/(b.maxX-b.minX),(height-30)/(b.maxY-b.minY));
 if(!(scale>0))return;
 ctx.setTransform(scale,0,0,scale,(width-(b.maxX-b.minX)*scale)/2-b.minX*scale,(height-(b.maxY-b.minY)*scale)/2-b.minY*scale);
 const line=(points:Pt[],color:string,w=2)=>{if(points.length<2)return;ctx.strokeStyle=color;ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);for(const p of points.slice(1))ctx.lineTo(p.x,p.y);ctx.stroke();};
 for(const r of s.site.rooms){ctx.fillStyle=r.kind==='hall'?'#2c3d35':'#34453d';ctx.fillRect(r.x,r.y,r.w,r.h);}
 for(const r of s.site.exteriorZones??[]){ctx.strokeStyle='#394f44';ctx.strokeRect(r.x,r.y,r.w,r.h);}
 for(const o of world.cover){ctx.fillStyle='#69776a';ctx.fillRect(o.x-o.w/2,o.y-o.h/2,o.w,o.h);}
 for(const wall of world.walls)line([wall.a,wall.b],'#a5a99d',3);
 for(const door of s.doors)line([door.a,door.b],door.open?'#6f9d83':'#c2a16e',3);
 if(get<HTMLInputElement>('geometry').checked){
  const index=aiSiteIndex(world,s.doors);
  for(const a of index.anchors){ctx.fillStyle='#b3c090';ctx.fillRect(a.p.x-1.5,a.p.y-1.5,3,3);}
  for(const p of index.portals){ctx.fillStyle=p.kind==='window'?'#77a6bd':'#d1bd7b';ctx.fillRect(p.center.x-3,p.center.y-3,6,6);}
  for(const o of index.observations){ctx.strokeStyle=o.kind==='window'?'#77a6bd':'#b3c090';ctx.strokeRect(o.p.x-3,o.p.y-3,6,6);}
 }
 const selected=actorSelect.value;
 for(const a of s.operators){
  const chosen=a.id===selected;
  const color=a.health<=0?'#666c65':a.surrendered?'#d8c37d':a.side==='red'?'#cf8b78':'#86adce';
  if(a.side==='red'&&get<HTMLInputElement>('routes').checked)line([a.p,...a.nav],chosen?'#e4d5a4':'#8c7569',chosen?2.5:1.3);
  if(chosen){
   const belief=bestBelief(a.awareness);
   if(belief){ctx.beginPath();ctx.strokeStyle='#d6bc75';ctx.setLineDash([4,4]);ctx.arc(belief.estimate.x,belief.estimate.y,Math.max(5,belief.uncertainty),0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);}
   if(a.contact){ctx.strokeStyle='#dec790';ctx.strokeRect(a.contact.x-5,a.contact.y-5,10,10);}
  }
  ctx.fillStyle=color;ctx.beginPath();ctx.arc(a.p.x,a.p.y,chosen?8:6,0,Math.PI*2);ctx.fill();
  line([a.p,{x:a.p.x+Math.cos(a.heading)*14,y:a.p.y+Math.sin(a.heading)*14}],color,2);
  if(chosen){ctx.strokeStyle='#f0ead7';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(a.p.x,a.p.y,12,0,Math.PI*2);ctx.stroke();}
  ctx.font='10px system-ui';ctx.fillStyle='#e4e4d7';ctx.fillText(a.name,a.p.x+10,a.p.y-8);
 }
 for(const a of s.civilians){ctx.fillStyle=a.health>0?'#e2c991':'#777469';ctx.beginPath();ctx.arc(a.p.x,a.p.y,4,0,Math.PI*2);ctx.fill();}
}
get<HTMLButtonElement>('reset').onclick=reset;
get<HTMLButtonElement>('play').onclick=()=>{if(!session)return;running=!running;accum=0;get<HTMLButtonElement>('play').textContent=running?'Pause':'Play';};
get<HTMLButtonElement>('step').onclick=()=>{running=false;get<HTMLButtonElement>('play').textContent='Play';sample();draw();inspect();};
actorSelect.onchange=()=>{draw();inspect();};
get<HTMLInputElement>('geometry').onchange=draw;get<HTMLInputElement>('routes').onchange=draw;
new ResizeObserver(draw).observe(canvas);
function frame(now:number){
 const elapsed=Math.min(.12,Math.max(0,(now-lastFrame)/1000));lastFrame=now;
 if(running){
  accum+=elapsed*Number(get<HTMLSelectElement>('speed').value);
  let steps=0;while(accum>=1/60&&steps++<8&&running){accum-=1/60;sample();}
  if(steps){draw();inspect();}
 }
 requestAnimationFrame(frame);
}
reset();requestAnimationFrame(frame);
