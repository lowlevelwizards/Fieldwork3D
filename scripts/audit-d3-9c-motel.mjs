/** Read-only D3.9C motel squad-entry oscillation trace, production Session. */
import {generateSite} from '../src/breach-site.ts';
import {newSession,team,planSquadEntry,stepSession,toggling} from '../src/breach-game.ts';
import {activateSite,doorLeafSegment,pointToSegment,OPERATOR_RADIUS} from '../src/breach-core.ts';
import {sessionWorldGeometry} from '../src/breach-world-context.ts';
import {sweptBodyClear,glideAlongStaticWall} from '../src/breach-navigation.ts';
import {diagnoseMovement} from '../src/breach-nav-diagnostics.ts';
const seed=31149,site=generateSite(seed,'small',undefined,{mission:'intel'},{archetype:'motel'});
const quiet={...site,training:true,enemies:[],encounter:undefined};
const s=newSession(0,seed,'full-view',site.scale??'small','intel',quiet,{enableCivilians:false});
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),r=n=>Math.round(n*100)/100;
try{
 const actors=team(s).slice(0,4),start=actors[0].p;
 const doors=[...s.doors].filter(d=>d.kind!=='sliding'&&d.kind!=='shutter')
  .sort((a,b)=>dist(start,{x:(a.a.x+a.b.x)/2,y:(a.a.y+a.b.y)/2})-
   dist(start,{x:(b.a.x+b.b.x)/2,y:(b.a.y+b.b.y)/2})||a.id.localeCompare(b.id));
 const entry=doors.slice(0,12).find(d=>planSquadEntry(s,d.id));
 if(!entry)throw Error('motel failed to select ENTRY');
 const goal=new Map(actors.map(a=>[a.id,a.plan.find(n=>n.entryDoorId===entry.id)?.p]));
 toggling(s);const rows=[],micro=[];
 const prev=actors.map(a=>({...a.p}));
 for(let t=0;t<2100;t++){
  stepSession(s,1/60);
  if(t>=1200&&t<1380){
   micro.push({tick:t+1,sec:r(s.seconds),actors:actors.filter(a=>a.id==='ash'||a.id==='vale').map(a=>({
    id:a.id,p:{x:r(a.p.x),y:r(a.p.y)},
    v:r(a.velocity),blocked:r(a.blockedTime),
    retry:a.recoveryAttempts,nav:a.nav[0]?{x:r(a.nav[0].x),y:r(a.nav[0].y)}:null,
    navLength:a.nav.length,last:a.lastBlocker,
    repairAt:r(a.lastNavRepairAt),retryAt:r(a.retryRouteAt),
    squeeze:a.squeeze
   }))});
  }
  if((t+1)%30!==0)continue;
  rows.push({t:r((t+1)/60),actors:actors.filter(a=>a.id==='ash'||a.id==='vale').map(a=>{
   const nearby=s.doors.map(d=>({id:d.id,g:r(pointToSegment(a.p,doorLeafSegment(d))),
    open:d.open,f:r(d.openFraction??0)})).sort((a,b)=>a.g-b.g).slice(0,3);
   const next=a.nav[0],world=sessionWorldGeometry(s);
   const distance=next?dist(a.p,next):0;
   const probe=next&&distance>.001?{
    x:a.p.x+(next.x-a.p.x)/distance*.5,
    y:a.p.y+(next.y-a.p.y)/distance*.5}:a.p;
   const block=next?diagnoseMovement(a.p,probe,s.doors,[],OPERATOR_RADIUS,world):null;
   const glide=next?glideAlongStaticWall(a.p,probe,s.doors,world):null;
   return {id:a.id,p:{x:r(a.p.x),y:r(a.p.y)},heading:r(a.heading),
    probe:{clear:next?sweptBodyClear(a.p,probe,s.doors,OPERATOR_RADIUS,world):null,
     blocker:block?.blocker??null,point:block?.point??null,
     glide:glide?{x:r(glide.x),y:r(glide.y)}:null},
    velocity:r(a.velocity),goalDistance:goal.get(a.id)?r(dist(a.p,goal.get(a.id))):null,
    nav:a.nav.slice(0,3),plan:a.plan[0]?.kind??null,
    activeNode:a.activeNode,blocked:r(a.blockedTime),squeeze:a.squeeze,
    motorPause:a.motorPause,retry:a.recoveryAttempts,episode:a.doorTraversal?.doorId??null,
    near:nearby};
  })});
 }
 console.log(JSON.stringify({seed,entry:entry.id,goals:[...goal],rows,micro}));
}finally{activateSite(null);}
