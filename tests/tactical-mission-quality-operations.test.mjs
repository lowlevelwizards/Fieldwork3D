import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {newSession,stepSession,team,enemies,missionText} from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';
import {tacticalDefenderRoomScore} from '../src/worldgen/tactical-room-suitability.ts';
import {formatMissionPacing,summarizeMissionPacing} from '../src/breach-mission-pacing.ts';
import {auditTacticalOpportunities} from '../src/worldgen/tactical-opportunity-audit.ts';

const safeSession=(seed,mission)=>{
 const site=generateSite(seed,'small',undefined,{mission});
 const s=newSession(0,seed,'floor-plan','small',mission,site);
 for(const e of enemies(s)){e.health=0;e.velocity=0;e.plan=[];}
 s.phase='running';
 return s;
};
test('capturing targets follows the actual authored encounter target role',()=>{
 try{
  const s=safeSession(16,'capture');
  const index=s.site.encounter.actors.findIndex(a=>a.role==='target');
  assert.ok(index>=0);
  assert.equal(s.captureTarget,enemies(s)[index].id);
  assert.deepEqual(s.scenario.objective,enemies(s)[index].p);
 }finally{activateSite(null);}
});
test('intel carrier must personally extract; if down, item drops and can be recovered',()=>{
 try{
  const s=safeSession(15,'intel'),[a,b]=team(s);
  const objective={...s.scenario.objective};
  a.p={...objective};a.priorP={...objective};a.plan=[];
  for(let i=0;i<42&&s.mission!=='extract';i++)stepSession(s,1/30);
  assert.equal(s.mission,'extract');
  assert.equal(s.intelCarrierId,a.id);
  assert.match(missionText(s),/INTEL CARRIER/);
  b.p={...s.scenario.extract};b.priorP={...b.p};
  stepSession(s,1/60);
  assert.notEqual(s.phase,'won','non-carrier may not teleport documents to exit');
  a.health=0;a.injuryStage=3;
  const where={...a.p};
  stepSession(s,1/60);
  assert.equal(s.intelCarrierId,null);
  assert.equal(s.mission,'secure');
  assert.deepEqual(s.scenario.objective,where);
  assert.ok(s.events.some(e=>e.includes('INTEL DROPPED')));
  // Another operator can carry the recovered item.
  b.p={...where};b.priorP={...where};
  for(let i=0;i<42&&s.mission!=='extract';i++)stepSession(s,1/30);
  assert.equal(s.intelCarrierId,b.id);
  b.p={...s.scenario.extract};b.priorP={...b.p};
  stepSession(s,1/60);
  assert.equal(s.phase,'won');
 }finally{activateSite(null);}
});
test('rescue extraction never completes merely because person and unrelated operator occupy exit radius',()=>{
 try{
  const s=safeSession(18,'rescue');
  s.mission='extract';
  const exit={...s.scenario.extract};
  const [a,b,c,d]=team(s);
  a.p={x:exit.x-35,y:exit.y};a.priorP={...a.p};
  for(const actor of [b,c,d]){
   actor.p={x:exit.x-100,y:exit.y-100};actor.priorP={...actor.p};
  }
  s.rescue={p:{x:exit.x+43,y:exit.y},following:null};
  stepSession(s,1/60);
  assert.notEqual(s.phase,'won','an alive physical escort must be present');
 }finally{activateSite(null);}
});
test('room defense quality values existing thresholds and furniture, never invented cover',()=>{
 const r={id:'office',kind:'room',purpose:'office',x:0,y:0,w:140,h:140};
 const doorway={id:'D',a:{x:70,y:0},b:{x:118,y:0},open:false,openedAt:-1};
 const furniture=[{x:52,y:46,w:32,h:20,low:true,fixture:'desk'}];
 const good=tacticalDefenderRoomScore(r,furniture,[doorway],'prepared');
 assert.ok(good>tacticalDefenderRoomScore(r,[],[],'prepared'));
 assert.ok(tacticalDefenderRoomScore({...r,purpose:'bathroom'},furniture,
   [doorway],'prepared')<good);
});
test('window variety remains real, deterministic and compatible with physical inspection',()=>{
 try{
  for(const seed of [14,25,36]){
   const site=generateSite(seed,'small');
   const copy=generateSite(seed,'small');
   assert.deepEqual(site.windows,copy.windows);
   const inspection=auditTacticalOpportunities(site);
   assert.ok(inspection.entryOptions.every(p=>site.doors.some(d=>d.id===p.id)||
     site.windows?.some(w=>w.id===p.id)));
   assert.ok(site.windows.every(w=>site.cover.some(o=>
     (o.fixture==='window-sill'||o.fixture==='glass-barrier')&&
     Math.hypot(o.x-w.x,o.y-w.y)<1)));
  }
 }finally{activateSite(null);}
});
test('after-action pacing derives only from recorded events',()=>{
 const events=[
  {id:1,t:2.5,kind:'intel',text:'ROOK SPOTTED HOSTILE'},
  {id:2,t:3.7,kind:'shot',text:'ROOK FIRED'},
  {id:3,t:11,kind:'objective',text:'DOCUMENTS RECOVERED'},
  {id:4,t:27,kind:'objective',text:'MISSION COMPLETE'}
 ];
 const p=summarizeMissionPacing(events);
 assert.equal(p.firstContactAt,2.5);
 assert.equal(p.firstShotAt,3.7);
 assert.equal(p.contactToObjective,8.5);
 assert.equal(p.objectiveToExtraction,16);
 assert.match(formatMissionPacing(events),/OBJECTIVE → EXIT/);
 assert.equal(summarizeMissionPacing([]).objectiveAt,null);
});
