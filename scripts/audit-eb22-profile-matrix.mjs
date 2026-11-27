/** EB22 acceptance: ordinary generation, real fixed-tick simulation,
 * same starting site across profiles/tiers. Measurements are CPU samples,
 * not device FPS or a proof of experiential balance. */
import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {newSession,enemies,stepSession,toggling,team,planMove} from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';
import {AI_GROUP_KINDS,AI_COMPETENCE} from '../src/breach-ai-group-profiles.ts';
import {compileMissionFacts} from '../src/briefing/mission-facts.ts';
import {createOperationDossier} from '../src/briefing/briefing-composer.ts';
import {resolvedWardrobe} from '../src/operator-wardrobe-data.ts';
const rows=[],ticks=180;
const original=generateSite(17,'small',undefined,{mission:'capture',enableIncidentIntent:true});
assert.ok(original.encounter?.groups.length);
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const quantile=(xs,p)=>[...xs].sort((a,b)=>a-b)[Math.floor((xs.length-1)*p)]??0;
function run(kind,tier){
 const site=structuredClone(original);
 site.encounter.groups=site.encounter.groups.map(g=>({...g,behaviorProfile:kind,competenceOverride:tier}));
 const s=newSession(0,17,'floor-plan','small','capture',site,{enableCivilians:true});
 try{
  const foes=enemies(s),truth=compileMissionFacts(s);
  assert.ok(foes.length&&foes.every(a=>a.npcIdentity?.groupKind===kind&&a.npcIdentity?.competence===tier));
  assert.ok(truth.threatGroups?.length===1);
  const low=createOperationDossier(truth,{quality:'low'}),high=createOperationDossier(truth,{quality:'high'});
  assert.ok(!low.claims.some(c=>c.id.startsWith('threat-group-')));
  assert.ok(high.claims.some(c=>c.id==='threat-kit-'+kind));
  const initial=foes.map(a=>({id:a.id,p:{...a.p},health:a.health,kit:resolvedWardrobe(a.wardrobe,a.equipment),weapon:a.weaponConfiguration,gear:a.equipment?.slots}));
  const scout=team(s)[0],rooms=site.rooms.filter(r=>r.kind==='room').map(r=>({x:r.x+r.w/2,y:r.y+r.h/2}))
   .sort((a,b)=>Math.hypot(a.x-scout.p.x,a.y-scout.p.y)-Math.hypot(b.x-scout.p.x,b.y-scout.p.y));
  const accepted=rooms.slice(0,5).some(p=>planMove(s,scout.id,p));
  const samples=[],trace=[];
  toggling(s);
  for(let i=0;i<ticks&&s.phase==='running';i++){
   const t=performance.now();stepSession(s,1/60);samples.push(performance.now()-t);
   if(i%15===0)trace.push(foes.map(a=>[a.id,a.p.x,a.p.y,a.health,a.alert,a.intent?.kind,a.surrendered,a.coordinationRole]));
  }
  assert.ok(samples.length>0);
  assert.ok(foes.every(a=>Number.isFinite(a.p.x)&&Number.isFinite(a.p.y)&&Number.isFinite(a.health)));
  return {kind,tier,initial,accepted,ticks:samples.length,phase:s.phase,shots:s.nextShotId-1,
   contacted:foes.filter(a=>a.contacted).length,surrendered:foes.filter(a=>a.surrendered).length,
   fingerprint:digest(trace),p50:quantile(samples,.5),p95:quantile(samples,.95),p99:quantile(samples,.99),max:Math.max(...samples)};
 }finally{activateSite(null);}
}
for(const kind of AI_GROUP_KINDS){
 let prior;
 for(const tier of AI_COMPETENCE){
  const a=run(kind,tier),b=run(kind,tier);
  for(const key of ['initial','accepted','ticks','phase','shots','contacted','surrendered','fingerprint'])assert.deepEqual(a[key],b[key],kind+'/'+tier+' '+key);
  if(prior)assert.deepEqual(a.initial,prior.initial,'experience must not change starting issue or physical health');
  prior=a;rows.push(a);
  console.log('EB22 PROFILE',JSON.stringify({kind,tier,accepted:a.accepted,ticks:a.ticks,contacted:a.contacted,shots:a.shots,p50:a.p50,p95:a.p95,p99:a.p99,max:a.max,fingerprint:a.fingerprint}));
 }
}
assert.equal(rows.length,28);
writeFileSync(process.argv[2],JSON.stringify({method:'matched generated site / 180 ticks, repeat each configuration; no FPS or human playability inference',rows},null,2));
