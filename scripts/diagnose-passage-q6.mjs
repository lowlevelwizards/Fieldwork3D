/** Q6 opt-in timeline: real 60Hz session, no instrumented motor or
 * path substitutions. Quantifies where four-operator entry seconds go. */
import {newSession,team,planSquadEntry,stepSession,toggling} from '../src/breach-game.ts';
import {doorRangeSite,prepareDoorRangeCase} from '../src/breach-door-test-cases.ts';
import {activateSite} from '../src/breach-core.ts';

const scenarios=process.argv.includes('--all')?
 ['inward-left','inward-right','outward-left','outward-right'].flatMap(door=>
  ['straight','left','right','split','angle45'].map(approach=>[door,approach])):
 [['outward-left','right'],['outward-right','angle45'],
  ['outward-right','straight'],['inward-left','straight'],
  ['ajar-outward','left'],['ajar-outward','angle45']];
const round=n=>+n.toFixed(3);
function stage(n){
 if(!n)return 'done';
 if(n.stackDoorId)return 'stack';
 if(n.kind==='sync')return 'sync';
 if(n.kind==='door')return 'door-'+(n.method??'open');
 if(n.kind==='wait'&&n.doorId)return 'gate';
 if(n.entryDoorId)return 'entry';
 return n.kind;
}
for(const [door,approach] of scenarios){
 const s=newSession(0,undefined,'full-view','small','hold',
  doorRangeSite(door,approach),{enableCivilians:false});
 try{
  prepareDoorRangeCase(s,door);
  const actors=team(s).slice(0,4);
  if(!planSquadEntry(s,'ENTRY'))throw Error('plan rejected '+door+'/'+approach);
  const initial=actors.map(a=>({id:a.id,x:round(a.p.x),y:round(a.p.y),
   stack:a.plan.find(n=>n.stackDoorId)?.p,
   plan:a.plan.map(n=>({kind:stage(n),p:n.p}))}));
  const stats=new Map(actors.map(a=>[a.id,{
   lastStage:stage(a.plan[0]),stageTime:{},paused:{},still:{},moving:{},
   cross:null,finish:null,stageChanges:[],lastP:{...a.p},
   entryDistance:0,entryBacktrack:0,stalledBy:{},stallRun:null,longestStall:null}]));
  const fracEvents=[];
  let maxFraction=0;
  toggling(s);
  for(let tick=0;tick<1800;tick++){
   stepSession(s,1/60);
   const f=s.doors[0].openFraction??0;
   for(const threshold of [.10,.30,.60,.72,.90,1.0,1.30,1.54]){
    if(f>=threshold&&maxFraction<threshold)fracEvents.push({
     t:round(s.seconds),fraction:threshold
    });
   }
   maxFraction=Math.max(maxFraction,f);
   for(const a of actors){
    const st=stats.get(a.id);
    const now=stage(a.plan[0]);
    const moved=Math.hypot(a.p.x-st.lastP.x,a.p.y-st.lastP.y);
    st.stageTime[now]=(st.stageTime[now]??0)+1/60;
    if(now==='entry'){
     st.entryDistance+=moved;
     const objective=a.plan[0]?.p;
     if(objective&&moved>.02&&
       (a.p.x-st.lastP.x)*(objective.x-st.lastP.x)+
       (a.p.y-st.lastP.y)*(objective.y-st.lastP.y)<0)
       st.entryBacktrack+=moved;
     const cause=[a.lastBlocker??'none',
       a.nav.length?'route':'no-nav',a.doorTraversal?.phase??'no-episode',
       a.doorTraversal?.maneuver??'none',
       a.traversalPending?'pending':'free',
       a.squeeze?'squeeze':'normal'].join('/');
     if(moved<.10){
       st.stalledBy[cause]=(st.stalledBy[cause]??0)+1/60;
       if(!st.stallRun)st.stallRun={start:round(s.seconds),cause,
         at:{x:round(a.p.x),y:round(a.p.y)},
         target:a.nav[0]??null,
         nextRetry:round(Math.max(0,a.retryRouteAt-s.seconds)),
         lastManeuver:a.doorTraversal?.maneuver??null};
     }else if(st.stallRun){
       const segment={...st.stallRun,end:round(s.seconds),
        duration:round(s.seconds-st.stallRun.start)};
       if(!st.longestStall||segment.duration>st.longestStall.duration)
        st.longestStall=segment;
       st.stallRun=null;
     }
    }
    const pause=a.motorPause??'none';
    const key=now+':'+pause;
    st.paused[key]=(st.paused[key]??0)+1/60;
    const bucket=moved<.10?st.still:st.moving;
    bucket[now]=(bucket[now]??0)+1/60;
    if(now!==st.lastStage){
     st.stageChanges.push({t:round(s.seconds),from:st.lastStage,to:now,
      x:round(a.p.x),y:round(a.p.y),
      pause,blocker:a.lastBlocker,blocked:round(a.blockedTime)});
     st.lastStage=now;
    }
    if(a.p.y>278&&st.cross===null){
     st.cross=round(s.seconds);
     st.stageChanges.push({t:st.cross,from:now,to:'CROSSED',
      x:round(a.p.x),y:round(a.p.y)});
    }
    if(!a.plan.length&&st.finish===null)st.finish=round(s.seconds);
    st.lastP={...a.p};
   }
   if(actors.every(a=>!a.plan.length))break;
  }
  const results=actors.map(a=>{
   const st=stats.get(a.id);
   const sorted=Object.entries(st.paused).sort((a,b)=>b[1]-a[1]);
   return {id:a.id,cross:st.cross,finished:st.finish,
    stageTime:Object.fromEntries(Object.entries(st.stageTime).map(([k,v])=>[k,round(v)])),
    still:Object.fromEntries(Object.entries(st.still).map(([k,v])=>[k,round(v)])),
    topPauses:sorted.slice(0,8).map(([key,v])=>[key,round(v)]),
    entryDistance:round(st.entryDistance),
    entryBacktrack:round(st.entryBacktrack),
    stallCauses:Object.entries(st.stalledBy).sort((a,b)=>b[1]-a[1])
      .slice(0,8).map(([k,v])=>[k,round(v)]),
    longestStall:st.longestStall,changes:st.stageChanges};
  });
  console.log('Q6_TIMELINE '+JSON.stringify({door,approach,
   initial,hinge:fracEvents,operators:results}));
 }finally{activateSite(null);}
}
