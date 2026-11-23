/** EQA3.3 CURRENT MAIN first-contact and entrance-choice quality witness.
 * Real generated 60-Hz actors, known blueprint, explicitly authored OPEN.
 * Never reads hidden target coordinates for pathing, never changes AI/game.
 * Not a human player/4-person coordinated plan.
 * Usage: node --experimental-strip-types scripts/audit-eqa3-first-contact.mjs
 */
import {writeFileSync,mkdirSync} from 'node:fs';
import {generateSite} from '../src/breach-site.ts';
import {newSession,availableDeployments,selectDeployment,team,enemies,
  planDoor,planMove,toggling,stepSession,inSight} from '../src/breach-game.ts';
import {doorCenter,doorOpticalSegment,activateSite} from '../src/breach-core.ts';
import {exposure} from '../src/breach-combat.ts';
import {effectiveEyeHeight,effectiveAimHeight} from '../src/breach-cover-height.ts';
import {sessionWorldGeometry} from '../src/breach-world-context.ts';
import {segmentImpact} from '../src/breach-ballistic-resolution.ts';
import {windowPaneSegment} from '../src/breach-windows.ts';
import {doorKnown} from '../src/breach-intel.ts';
const cases=[
 [12,'intel'],[13,'rescue'],[14,'hold'],[17,'rescue'],
 [18,'rescue'],[20,'capture'],[23,'rescue'],[25,'capture']
];
const sec=process.argv.includes('--quick')?7:18;
const forensic=process.argv.includes('--forensic');
const d=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const center=r=>({x:r.x+r.w/2,y:r.y+r.h/2});
const round=n=>Math.round(n*100)/100;
const records=[],errors=[];
for(const [seed,mission] of cases){
 const site=generateSite(seed,'small',undefined,
   {mission,enableIncidentIntent:true});
 const discovery=newSession(0,seed,'floor-plan','small',mission,site,
   {enableCivilians:true});
 const alternate=availableDeployments(discovery).find(x=>
   x.id!=='FRONT'&&x.kind!=='window');
 activateSite(null);
 for(const entry of ['FRONT',alternate?.id].filter(Boolean)){
  const s=newSession(0,seed,'floor-plan','small',mission,site,
   {enableCivilians:true});
  try{
   if(entry!=='FRONT'&&!selectDeployment(s,entry))
     throw Error('rejected deployment '+entry);
   const scout=team(s)[0],foes=enemies(s);
   const origin={...scout.p};
   const chosenRooms=[...site.rooms.filter(r=>r.kind==='room')]
     .sort((a,b)=>d(origin,center(a))-d(origin,center(b))||
       a.id.localeCompare(b.id));
   // Player knows the architectural map in this cohort, NOT hidden
   // objective truth, defenders, civilian locations or event timelines.
   const knownClosed=s.doors.filter(door=>doorKnown(s.intel,door.id)&&
     !door.open&&!door.locked&&!door.jammed&&!door.wedged&&
     d(origin,doorCenter(door))<78)
     .sort((a,b)=>d(origin,doorCenter(a))-d(origin,doorCenter(b))||
       a.id.localeCompare(b.id));
   let doorAuthored=null,doorOpensAt=null,roomOrderAuthored=false;
   for(const door of knownClosed){
    if(planDoor(s,scout.id,door.id,'open')){
     doorAuthored=door.id;break;
    }
   }
   let roomOrderAccepted=null,firstContact=null,firstShot=null;
   let firstPlayerSight=null,firstEnemySight=null;
   let firstCivilianSight=null;
   const firstFoeSnapshots=new Map();
   const startFoes=foes.map(a=>({id:a.id,p:{...a.p},
     role:a.encounterRole,readiness:a.encounterReadiness,
     activity:a.encounterActivity,health:a.health}));
   const startCivilians=s.civilians.map(c=>({id:c.id,p:{...c.p},
     state:c.state,rescueTarget:c.rescueTarget}));
   let roomProbes=0;
   const tryRoom=()=>{
    if(roomOrderAuthored)return;
    roomOrderAuthored=true;
    if(s.phase==='running')toggling(s);
    // Actual player command, with no direct movement, forbidden
    // placement or private mission/hostile position reading.
    for(const r of chosenRooms.slice(0,5)){
      if(planMove(s,scout.id,center(r))){
        roomOrderAccepted={id:r.id,purpose:r.purpose};
        break;
      }
    }
    if(s.phase==='planning')toggling(s);
   };
   if(!doorAuthored)tryRoom();
   else toggling(s);
   for(let tick=0;tick<sec*60&&s.phase==='running';tick++){
    stepSession(s,1/60);
    if(tick%6!==0)continue;
    const nearDoor=s.doors.find(x=>x.id===doorAuthored);
    if(doorAuthored&&!doorOpensAt&&nearDoor&&
      nearDoor.open&&(nearDoor.openFraction??0)>=.72)
      doorOpensAt=round(s.seconds);
    if(!roomOrderAuthored&&!scout.plan.length&&s.seconds>.2)
      tryRoom();
    const observers=team(s).filter(x=>x.health>0);
    const visibleToSquad=foes.filter(e=>e.health>0&&
      observers.some(a=>inSight(a,e,s)));
    const hostilesSeeingScout=foes.filter(e=>e.health>0&&
      inSight(e,scout,s));
    if(!firstPlayerSight&&visibleToSquad.length)
      firstPlayerSight={t:round(s.seconds),
        ids:visibleToSquad.map(x=>x.id)};
    if(!firstEnemySight&&hostilesSeeingScout.length)
      firstEnemySight={t:round(s.seconds),
        ids:hostilesSeeingScout.map(x=>x.id)};
    if(!firstContact&&(visibleToSquad.length||hostilesSeeingScout.length)){
      // EQA3.5 offline sightline witness. It never supplies target
      // knowledge or alters visibility, weapon selection, or movement.
      // Capture real confirmed actor pairs at the instant of first sight,
      // including the optical door/window geometry before entry opens.
      const world=forensic?sessionWorldGeometry(s):null;
      const confirmedPairs=forensic?[
        ...observers.flatMap(a=>visibleToSquad.filter(e=>inSight(a,e,s))
          .map(e=>({from:a,to:e,side:'blue'}))),
        ...hostilesSeeingScout.map(e=>({from:e,to:scout,side:'red'}))
      ]:[];
      const sightlineWitness=forensic?confirmedPairs.map(({from,to,side})=>{
        const geo=exposure(from.p,to.p,s.doors,
          to.posture==='crouch',from.posture==='crouch',true,
          world.walls,world.cover,effectiveEyeHeight(from),
          effectiveAimHeight(to));
        const intersectedDoors=s.doors.filter(door=>
          segmentImpact(from.p,to.p,doorOpticalSegment(door))!==null)
          .map(door=>({id:door.id,style:door.style??'unspecified',
            open:door.open,fraction:round(door.openFraction??0)}));
        const intersectedWindows=s.windows.filter(w=>
          segmentImpact(from.p,to.p,windowPaneSegment(w))!==null)
          .map(w=>({id:w.id??null,open:w.open,shattered:w.shattered,
            sill:w.sillHeight,head:w.headHeight}));
        return {observer:from.id,target:to.id,side,
          from:{...from.p},to:{...to.p},
          gap:round(d(from.p,to.p)),observerHeading:round(from.heading),
          targetHeading:round(to.heading),
          visualProgress:round(from.awareness.visualProgress[to.id]??0),
          opticalExposure:geo,
          intersectedDoors,intersectedWindows};
      }):undefined;
      const active=[...new Set([...visibleToSquad,...hostilesSeeingScout])];
      firstContact={at:round(s.seconds),
        scoutP:{...scout.p},
        scoutRoom:site.rooms.find(r=>r.kind==='room'&&
          scout.p.x>=r.x&&scout.p.x<=r.x+r.w&&
          scout.p.y>=r.y&&scout.p.y<=r.y+r.h)?.id??null,
        playerSaw:visibleToSquad.map(a=>a.id),
        enemySawScout:hostilesSeeingScout.map(a=>a.id),
        scoutsDistanceFromEntry:round(d(scout.p,origin)),
        people:active.map(a=>({id:a.id,p:{...a.p},
          gap:round(d(a.p,scout.p)),
          role:a.encounterRole,readiness:a.encounterReadiness,
          activity:a.encounterActivity,alert:a.alert,
          state:a.encounterReactionUntil})),
        firstOpenOrderDoor:doorAuthored?(()=>{
          const door=s.doors.find(x=>x.id===doorAuthored);
          return door?{id:door.id,open:door.open,
            fraction:round(door.openFraction??0),style:door.style}:null;
        })():null,
        sightlineWitness,
        nearbyCivilians:s.civilians.filter(c=>c.health>0&&
          d(c.p,scout.p)<=90).map(c=>({
            id:c.id,state:c.state,gap:round(d(c.p,scout.p)),
            rescueTarget:c.rescueTarget}))
      };
    }
    if(!firstShot&&s.nextShotId>1)
      firstShot={at:round(s.seconds),shots:s.nextShotId-1};
    if(!firstCivilianSight&&s.civilians.some(c=>c.health>0&&
      // This is actual sight-filtered subject exposure, not omniscient
      // civilian positions fed back into player movement.
      observers.some(a=>d(a.p,c.p)<90))){
      firstCivilianSight={at:round(s.seconds)};
    }
    if(firstContact&&s.seconds-firstContact.at<=7){
      for(const e of foes)if(e.health>0&&
        !firstFoeSnapshots.has(e.id)&&s.seconds-firstContact.at>=5){
        const before=startFoes.find(x=>x.id===e.id);
        firstFoeSnapshots.set(e.id,{
          role:e.encounterRole,readiness:e.encounterReadiness,
          movedFromSpawn:round(d(e.p,before?.p??e.p)),
          alert:e.alert,activity:e.encounterActivity,
          health:e.health,hasCombatChoice:!!e.combatChoice,
          p:{...e.p}});
      }
    }
    roomProbes++;
   }
   const record={seed,mission,archetype:site.archetype,
      profile:site.encounter?.profile,entry,
      initialSquadPosition:origin,
      doorAuthored,doorOpensAt,roomOrderAccepted,
      firstContact,firstPlayerSight,firstEnemySight,
      firstShot,firstCivilianSight,roomProbes,
      currentStage:s.mission,phase:s.phase,
      duration:round(s.seconds),
      actualShots:s.nextShotId-1,
      operatorHealth:scout.health,
      playerDisplacement:round(d(origin,scout.p)),
      firstFoeSnapshots:[...firstFoeSnapshots.entries()].map(([id,value])=>({
        id,...value})),
      initialHostiles:startFoes,
      initialCivilians:startCivilians,
      violations:!Number.isFinite(scout.p.x)||!Number.isFinite(scout.p.y)
        ?['nonfinite-scout']:[]};
   records.push(record);
  }catch(error){
   errors.push({seed,mission,entry,error:String(error)});
  }finally{activateSite(null);}
 }
}
const pairs=[];
for(const [seed,mission] of cases){
 const entries=records.filter(x=>x.seed===seed&&x.mission===mission);
 if(entries.length!==2)continue;
 const [a,b]=entries;
 pairs.push({seed,mission,archetype:a.archetype,
  frontEntry:a.entry,alternateEntry:b.entry,
  frontContact:a.firstContact?.at??null,
  alternateContact:b.firstContact?.at??null,
  frontDoorOpened:a.doorOpensAt!==null,
  alternateDoorOpened:b.doorOpensAt!==null,
  frontShots:a.actualShots,alternateShots:b.actualShots,
  firstContactGap:a.firstContact&&b.firstContact?
    round(b.firstContact.at-a.firstContact.at):null,
  differentFirstContactPeople:JSON.stringify(a.firstContact?.people.map(x=>x.id))!==
    JSON.stringify(b.firstContact?.people.map(x=>x.id))});
}
const summary={trials:records.length,paired:pairs.length,exceptions:errors.length,
 contacts:records.filter(x=>x.firstContact).length,
 contactWithin2:records.filter(x=>x.firstContact?.at<=2).length,
 firstEnemySight:records.filter(x=>x.firstEnemySight).length,
 firstSquadSight:records.filter(x=>x.firstPlayerSight).length,
 doorsAuthored:records.filter(x=>x.doorAuthored).length,
 doorsOpened:records.filter(x=>x.doorOpensAt!==null).length,
 withShot:records.filter(x=>x.actualShots>0).length,
 unreasonablyStationary:records.filter(x=>x.doorAuthored&&x.doorOpensAt===null&&
   x.playerDisplacement<27).length,
 emptyRoutes:records.filter(x=>!x.doorAuthored&&!x.roomOrderAccepted).length};
const report={schema:'EQA3.3/actual-first-contact-v1',
 method:'18s existing real 60Hz Session, actual player-legal physical OPEN + first briefed room center, frozen paired entrances, no hidden target route and no forced gunshot; not a human full mission',
 base:'0490bba3177e4792e39ab32f6e946ac053cd613f',
 summary,pairs,records,errors};
if(process.env.EQA3_OUTPUT){
 mkdirSync('artifacts/eqa3',{recursive:true});
 writeFileSync(process.env.EQA3_OUTPUT,JSON.stringify(report,null,2)+'\n');
}
console.log(JSON.stringify({summary,pairs,
  contactExamples:records.filter(r=>r.firstContact).map(r=>({
    seed:r.seed,mission:r.mission,entry:r.entry,
    at:r.firstContact.at,saw:r.firstContact.playerSaw,
    enemySaw:r.firstContact.enemySawScout,roles:r.firstContact.people,
    civilian:r.firstContact.nearbyCivilians,
    firstOpenOrderDoor:r.firstContact.firstOpenOrderDoor,
    sightlines:r.firstContact.sightlineWitness,
    doorOpenAt:r.doorOpensAt,shots:r.actualShots,
    followUp:r.firstFoeSnapshots.slice(0,3)})),
  noDoorOpen:records.filter(r=>r.doorAuthored&&r.doorOpensAt===null)
    .map(r=>({seed:r.seed,mission:r.mission,entry:r.entry,
      door:r.doorAuthored,displacement:r.playerDisplacement})) ,
  errors},null,2));
// This CI gate targets the frozen physical interaction contract,
 // not a quota of firefights or enemy kills. Quiet entries are valid.
 if(errors.length||records.some(r=>r.violations.length)||
    summary.doorsOpened!==summary.doorsAuthored||
    summary.unreasonablyStationary>0||
    summary.paired<6)process.exitCode=1;
