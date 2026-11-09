/** Authoritative fixed-step scenario snapshots for extraction equivalence.
 * This is a test harness, not a second game model or render-time simulator.
 * The temporary world scope protects a pre-existing live session on errors.
 */
import {createHash} from 'node:crypto';
import {withTemporarySiteGeometry} from '../../src/breach-core.ts';
import {newSession,stepSession,toggling,team,planMove,planWaitAt}
 from '../../src/breach-game.ts';

const number=value=>Number(Number(value??0).toFixed(5));
const point=p=>[number(p.x),number(p.y)];
const ordered=items=>[...items].sort((a,b)=>String(a.id).localeCompare(String(b.id)));
export function snapshotAuthoritativeSession(s){
 const operators=ordered(s.operators).map(a=>({
  id:a.id,side:a.side,p:point(a.p),health:number(a.health),
  heading:number(a.heading),velocity:number(a.velocity),
  posture:a.posture,pace:a.pace,
  blockedTime:number(a.blockedTime),blocker:a.lastBlocker,
  plan:a.plan.map(n=>[n.id,n.kind,point(n.p)]),
  nav:a.nav.map(point),magazine:a.magazine,reload:number(a.reload),
  shots:a.shots,aim:number(a.aim),alert:a.alert,
  suspicion:a.suspicion?.stage??null,firePolicy:a.firePolicy
 }));
 const doors=ordered(s.doors).map(d=>({
  id:d.id,open:d.open,fraction:number(d.openFraction),
  locked:!!d.locked,wedged:!!d.wedged,broken:!!d.breached
 }));
 const known=[...s.seenGround].sort();
 const events=s.battleEvents.map(e=>[e.id,e.kind,e.actorId??null]);
 return {
  seconds:number(s.seconds),phase:s.phase,rng:s.rng,
  operators,doors,seenGround:known,
  windows:s.windows.map(w=>[w.id,!!w.shattered]),
  shots:s.shots.map(e=>[e.id,point(e.start),point(e.end)]),
  events,
  cover:s.coverState.map(o=>[number(o.x),number(o.y),number(o.w),number(o.h),!!o.toppled]),
  revision:s.objectRevision
 };
}
export function recordAuthoritativeScenario({
 seed=19,site=null,intel='full-view',ticks=180,sampleEvery=30,
 dt=1/60,configure=()=>{}
}={}){
 if(!Number.isInteger(ticks)||ticks<1||ticks>3600)
  throw Error('Scenario tick budget out of range');
 if(!Number.isInteger(sampleEvery)||sampleEvery<1)
  throw Error('Scenario sampling cadence out of range');
 if(dt!==1/60)throw Error('Scenario clock must remain authoritative 60 Hz');
 return withTemporarySiteGeometry(null,()=>{
  const s=newSession(0,site?undefined:seed,intel,'small',
   site?'hold':undefined,site??undefined);
  configure(s,{team,planMove,planWaitAt});
  toggling(s);
  const samples=[snapshotAuthoritativeSession(s)];
  for(let tick=1;tick<=ticks;tick++){
   if(s.phase==='running')stepSession(s,dt);
   if(tick%sampleEvery===0||tick===ticks)
    samples.push(snapshotAuthoritativeSession(s));
  }
  for(const frame of samples){
   for(const a of frame.operators){
    if(!a.p.every(Number.isFinite)||!Number.isFinite(a.health)||
       !Number.isFinite(a.blockedTime))
     throw Error('Non-finite authoritative actor state: '+a.id);
   }
  }
  const fingerprint=createHash('sha256').update(JSON.stringify(samples))
   .digest('hex');
  return {seed,ticks,samples,fingerprint};
 });
}
