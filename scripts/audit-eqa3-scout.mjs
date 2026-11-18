/** EQA3.0: offline, deterministic, player-knowledge-respecting
 * scripted SCOUT from real available insertions through actual 30-Hz
 * (60-Hz internal fixed) motor, AI, civilians, mission states and extraction.
 * NOT a human playthrough, not tactical squad execution, not proof of fun.
 * Floor plan is BRIEFED geometry; target truth is used ONLY after intel
 * confirms/discovers it. --intel=unknown|approximate|confirmed
 * --smoke limits to 3 cases; --seconds=N may shorten the witness.
 */
import {writeFileSync,mkdirSync} from 'node:fs';
import {generateSite} from '../src/breach-site.ts';
import {newSession,team,enemies,toggling,stepSession,planMove,
 clearPlan,selectDeployment,availableDeployments,liveVisibility,
 inSight,planCivilianInteraction} from '../src/breach-game.ts';
import {setObjectiveIntelLevel,objectiveLocationKnown}
 from '../src/breach-objective-intel.ts';
import {MissionRecorder} from '../src/breach-replay.ts';
import {assessMissionFilm} from '../src/breach-mission-quality.ts';
import {analyzeContactPacing} from '../src/breach-contact-pacing-audit.ts';
import {activateSite} from '../src/breach-core.ts';
const params=new Map(process.argv.slice(2).filter(x=>x.includes('='))
 .map(x=>x.replace(/^--/,'').split('=')));
const intel=params.get('intel')??'unknown';
if(!['unknown','approximate','confirmed'].includes(intel))
 throw Error('Invalid intel '+intel);
const seconds=Number(params.get('seconds')??'45');
if(!Number.isFinite(seconds)||seconds<8||seconds>120)throw Error('bad seconds');
const cases=[
 [11,'clear'],[12,'intel'],[13,'rescue'],[14,'hold'],[15,'capture'],
 [16,'clear'],[17,'intel'],[18,'rescue'],[19,'hold'],[20,'capture'],
 [21,'clear'],[14,'hold'],[17,'rescue'],[25,'capture'],[23,'rescue']
];
const chosen=process.argv.includes('--smoke')?
 [[14,'hold'],[17,'rescue'],[25,'capture']]:cases;
const round=n=>Math.round(n*100)/100;
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const center=r=>({x:r.x+r.w/2,y:r.y+r.h/2});
const rows=[],exceptions=[];
for(const [seed,mission] of chosen){
 let site;
 try{
  site=generateSite(seed,'small',undefined,{mission,
   enableIncidentIntent:true});
  const source=newSession(0,seed,'floor-plan','small',mission,site,
   {enableCivilians:true});
  const alternate=availableDeployments(source)
   .find(x=>x.id!=='FRONT'&&x.kind!=='window')??null;
  activateSite(null);
  for(const insertion of ['FRONT',alternate?.id].filter(Boolean)){
   const s=newSession(0,seed,'floor-plan','small',mission,site,
    {enableCivilians:true});
   try{
    const preKnowledge=s.objectiveIntel?.discovered;
    const assigned=insertion==='FRONT'?true:selectDeployment(s,insertion);
    if(!assigned){rows.push({seed,mission,intel,insertion,
      invalid:['rejected-deployment'],duration:0});continue;}
    setObjectiveIntelLevel(s,intel);
    const initialKnown=objectiveLocationKnown(s);
    const initialDisclosure=s.objectiveIntel?.level??null;
    const scout=team(s)[0];
    const original=scout.p;
    const roomList=site.rooms.filter(r=>r.kind==='room');
    const area=new Set(s.objectiveIntel?.area?.roomIds??[]);
    // Approximate intel is a permitted area clue: prioritize its
    // reported 3–5 rooms. Unknown searches nearest first without target
    // point or objective room identity. Geometry comes only from plan.
    const ordered=[...roomList].sort((a,b)=>{
      const hint=intel==='approximate'?
       Number(area.has(b.id))-Number(area.has(a.id)):0;
      return hint||dist(original,center(a))-dist(original,center(b))||
       a.id.localeCompare(b.id);
    });
    const visited=new Set(),failed=new Set(),attempted=new Set();
    const decisions=[],stages=[],civilianStates=[],firstViews=[];
    let current=null,issuedAt=-1,issueDistance=0,accepted=0,
     rejected=0,routeAbort=0,firstContactAt=null,firstShotAt=null,
     firstCivilianAt=null,discoveredAt=null,firstRoomAt=null,
     objectiveAt=null,atExtraction=null,firstPlanAt=null;
    const initialHostiles=enemies(s).map(a=>a.id);
    const film=new MissionRecorder();film.capture(s,true);
    const tickFrames=Math.round(seconds*30);
    let previousStage=s.mission,lastDecisionAt=-1;
    const recordAction=(name,point,result)=>{
      if(decisions.length<80)decisions.push({at:round(s.seconds),action:name,
       target:point?{x:round(point.x),y:round(point.y)}:null,ok:result});
      if(result)accepted++;else rejected++;
      return result;
    };
    const executeOrder=()=>{
      if(s.phase!=='planning')toggling(s);
      let issued=false,action='idle',target=null;
      const rescuer=team(s)[0];
      const seenPerson=s.civilians.find(c=>c.rescueTarget&&c.health>0&&
       liveVisibility(s,c.p));
      if(s.mission==='extract'&&seenPerson&&
         seenPerson.following!==rescuer.id&&!seenPerson.carriedById&&
         dist(rescuer.p,seenPerson.p)<=27){
        action='follow-civilian';
        issued=recordAction(action,seenPerson.p,
         planCivilianInteraction(s,rescuer.id,seenPerson.id,'follow'));
      }else if(s.mission==='secure'&&seenPerson&&
          seenPerson.state!=='compliant'&&!seenPerson.carriedById&&
          dist(rescuer.p,seenPerson.p)<=27){
        action='secure-civilian';
        issued=recordAction(action,seenPerson.p,
          planCivilianInteraction(s,rescuer.id,seenPerson.id,'secure'));
      }
      if(!issued){
       if(s.mission==='extract'){
        action='return-to-extraction';target=s.scenario.extract;
       }else if(seenPerson&&s.missionType==='rescue'){
        action='approach-visible-civilian';target=seenPerson.p;
       }else if(objectiveLocationKnown(s)&&s.mission!=='clear'){
        action='approach-disclosed-objective';target=s.scenario.objective;
       }else{
        // No world-secret objective, hostile position or target room read.
        const next=ordered.find(r=>!visited.has(r.id)&&!failed.has(r.id));
        if(next){action='explore-briefed-room';target=center(next);
          attempted.add(next.id);}
       }
       if(target){
        const gap=dist(rescuer.p,target);
        // A reached disclosed point is not itself success; the
        // mission state machine must independently acknowledge SECURE.
        if(gap>14){
         issued=recordAction(action,target,planMove(s,rescuer.id,target));
         if(issued){current={name:action,p:{...target}};
          issuedAt=s.seconds;issueDistance=gap;
          if(firstPlanAt===null)firstPlanAt=s.seconds;
         }else if(action==='explore-briefed-room'){
          const room=ordered.find(r=>dist(center(r),target)<1);
          if(room)failed.add(room.id);
         }
        }else{
         if(action==='explore-briefed-room'){
          const room=ordered.find(r=>dist(center(r),target)<1);
          if(room)visited.add(room.id);
         }
         current=null;
        }
       }
      }
      // Never pause forever while a legitimate objective hold clock runs.
      if(s.phase==='planning')toggling(s);
      lastDecisionAt=s.seconds;
    };
    executeOrder();
    for(let tick=0;tick<tickFrames&&s.phase==='running';tick++){
      stepSession(s,1/30);
      if(tick%6===0){
        film.capture(s);
        if(firstContactAt===null&&film.events.some(e=>e.kind==='intel'&&
            e.text.includes('SPOTTED')))firstContactAt=s.seconds;
        if(firstShotAt===null&&s.nextShotId>1)firstShotAt=s.seconds;
        if(firstCivilianAt===null&&s.civilians.some(c=>
           liveVisibility(s,c.p)))firstCivilianAt=s.seconds;
        if(discoveredAt===null&&s.objectiveIntel?.discovered===true)
          discoveredAt=s.seconds;
        if(objectiveAt===null&&s.mission==='extract')objectiveAt=s.seconds;
        if(atExtraction===null&&s.mission==='done')atExtraction=s.seconds;
        for(const c of s.civilians){
          if(civilianStates.length<80&&!civilianStates.some(x=>
             x.id===c.id&&x.state===c.state))
            civilianStates.push({id:c.id,state:c.state,at:round(s.seconds)});
        }
        for(const room of roomList){
          if(dist(scout.p,center(room))<33){
           if(!visited.has(room.id)&&firstViews.length<50){
            firstViews.push({roomId:room.id,purpose:room.purpose,
             at:round(s.seconds)});
            if(firstRoomAt===null)firstRoomAt=s.seconds;
           }
           visited.add(room.id);
          }
        }
        if(previousStage!==s.mission){
          stages.push({from:previousStage,to:s.mission,at:round(s.seconds)});
          previousStage=s.mission;
        }
      }
      if(tick%15===0&&s.phase==='running'){
        // Short route failure is measured and recorded; no teleport,
        // automatic collision bypass, goal truth or script-owned movement.
        const noProgress=!!current&&
          (s.seconds-issuedAt>7&&
           dist(scout.p,current.p)>20&&
           dist(scout.p,current.p)>issueDistance-14);
        if(noProgress&&scout.plan.length){
          toggling(s);
          clearPlan(s,scout.id);
          routeAbort++;
          if(current.name==='explore-briefed-room'){
           const r=ordered.find(r=>dist(center(r),current.p)<1);
           if(r)failed.add(r.id);
          }
          current=null;lastDecisionAt=-1;
          executeOrder();
        }else if(!scout.plan.length&&
          (s.seconds-lastDecisionAt>=.6)){
          current=null;
          executeOrder();
        }
      }
    }
    film.capture(s,true);
    const integrity=assessMissionFilm(film.frames,film.events,s.operators.length);
    const contact=analyzeContactPacing(film.frames,film.events,initialHostiles,
      accepted,site.encounter?.profile==='quiet-approach');
    const failures=[
     ...integrity.issues,
     ...(s.operators.some(a=>!Number.isFinite(a.p.x)||!Number.isFinite(a.p.y))?
        ['nonfinite-actor-position']:[])
    ];
    rows.push({seed,mission,intel,insertion,alternativeAvailable:!!alternate,
      assigned,initialIntel:initialDisclosure,initialObjectiveKnown:initialKnown,
      preSessionObjectiveDiscovered:preKnowledge,
      profile:site.encounter?.profile,archetype:site.archetype,
      activeCivilians:s.civilians.length,activeHostiles:initialHostiles.length,
      timeLimit:seconds,duration:round(s.seconds),phase:s.phase,
      missionStage:s.mission,accepted,rejected,routeAbort,
      firstRoomAt: firstRoomAt===null?null:round(firstRoomAt),
      firstContactAt:contact.firstContactAt,
      firstShotAt:contact.firstShotAt,
      firstCivilianAt:firstCivilianAt===null?null:round(firstCivilianAt),
      discoveredAt:discoveredAt===null?null:round(discoveredAt),
      objectiveAt:objectiveAt===null?null:round(objectiveAt),
      extractedAt:atExtraction===null?null:round(atExtraction),
      friendTravel:contact.friendlyTravel,hostileTravel:contact.hostileTravel,
      nearestHostile:contact.nearestHostile,
      noContactReason:contact.reason,
      roomsVisited:visited.size,roomVisitOrder:firstViews,
      roomsUnreachable:failed.size,roomsAttempted:attempted.size,
      civilianStates,stages,decisions,
      eventCounts:{battle:film.events.length,shots:s.nextShotId-1,
       objective:film.events.filter(e=>e.kind==='objective').length},
      rescue:{exists:!!s.rescue,
       target:s.civilians.some(c=>c.rescueTarget),
       secured:s.civilians.some(c=>c.rescueTarget&&
        ['compliant','escorted'].includes(c.state)),
       escorted:s.civilians.some(c=>c.rescueTarget&&!!c.following)},
      integrity:failures});
   }finally{activateSite(null);}
  }
 }catch(e){exceptions.push({seed,mission,intel,error:String(e)});
 }finally{activateSite(null);}
}
const valid=rows.filter(r=>Array.isArray(r.integrity));
const observed=valid.filter(x=>x.firstContactAt!==null);
const summary={intel,trials:valid.length,exceptions:exceptions.length,
 invalid:valid.filter(x=>x.integrity.length).length,
 completed:valid.filter(x=>x.missionStage==='done').length,
 objectiveSecured:valid.filter(x=>x.objectiveAt!==null).length,
 firstContact:observed.length,firstShot:valid.filter(x=>x.firstShotAt!==null).length,
 objectiveDiscovered:valid.filter(x=>x.discoveredAt!==null).length,
 civilianFound:valid.filter(x=>x.firstCivilianAt!==null).length,
 rescueSecured:valid.filter(x=>x.rescue.secured).length,
 rescueEscorted:valid.filter(x=>x.rescue.escorted).length,
 routeAborts:valid.reduce((n,x)=>n+x.routeAbort,0),
 rejectedOrders:valid.reduce((n,x)=>n+x.rejected,0),
 roomsVisited:valid.reduce((n,x)=>n+x.roomsVisited,0),
 quietWithoutContact:valid.filter(x=>x.firstContactAt===null&&
  x.noContactReason==='approach-still-distant').length};
const report={schema:'EQA3.0/scripted-scout-v1',
 method:'real paired insertion, floor-plan-known rooms, independent target intel; one deterministic scripted scout; actual motor, civilians, AI and mission stages, not a human complete playthrough; timeout is not a mission failure',
 summary,exceptions,rows};
if(process.env.EQA3_OUTPUT){
 mkdirSync('artifacts/eqa3',{recursive:true});
 writeFileSync(process.env.EQA3_OUTPUT,JSON.stringify(report,null,2)+'\n');
}
console.log(JSON.stringify({summary,errors:exceptions,
 highInterest:valid.filter(x=>x.routeAbort||x.objectiveAt!==null||
  x.integrity.length).slice(0,20).map(x=>({seed:x.seed,
  mission:x.mission,insertion:x.insertion,archetype:x.archetype,
  stage:x.missionStage,contact:x.firstContactAt,objective:x.objectiveAt,
  visits:x.roomsVisited,routeAborts:x.routeAbort,
  issues:x.integrity})),
 paired:valid.filter(x=>x.insertion!=='FRONT').slice(0,15).map(x=>({
 seed:x.seed,mission:x.mission,entry:x.insertion,
 contact:x.firstContactAt,rooms:x.roomsVisited,
 stage:x.missionStage}))},null,2));
if(exceptions.length||summary.invalid)process.exitCode=1;
