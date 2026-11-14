/** Read-only D3.9C motel squad-entry oscillation trace, production Session. */
import {generateSite} from '../src/breach-site.ts';
import {newSession,team,planSquadEntry,stepSession,toggling} from '../src/breach-game.ts';
import {activateSite,doorLeafSegment,pointToSegment} from '../src/breach-core.ts';
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
 toggling(s);const rows=[];
 for(let t=0;t<2100;t++){
  stepSession(s,1/60);
  if((t+1)%30!==0)continue;
  rows.push({t:r((t+1)/60),actors:actors.filter(a=>a.id==='ash'||a.id==='vale').map(a=>{
   const nearby=s.doors.map(d=>({id:d.id,g:r(pointToSegment(a.p,doorLeafSegment(d))),
    open:d.open,f:r(d.openFraction??0)})).sort((a,b)=>a.g-b.g).slice(0,3);
   return {id:a.id,p:{x:r(a.p.x),y:r(a.p.y)},heading:r(a.heading),
    velocity:r(a.velocity),goalDistance:goal.get(a.id)?r(dist(a.p,goal.get(a.id))):null,
    nav:a.nav.slice(0,3),plan:a.plan[0]?.kind??null,
    activeNode:a.activeNode,blocked:r(a.blockedTime),squeeze:a.squeeze,
    motorPause:a.motorPause,retry:a.recoveryAttempts,episode:a.doorTraversal?.doorId??null,
    near:nearby};
  })});
 }
 console.log(JSON.stringify({seed,entry:entry.id,goals:[...goal],rows}));
}finally{activateSite(null);}
