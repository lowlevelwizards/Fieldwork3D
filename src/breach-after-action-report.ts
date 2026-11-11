/** After Action V2: immutable retrospective evidence projections.
 * No simulation changes, no invented ballistic coordinates or mission rewards.
 * Read-only post-mission use only; never consulted by live AI/intelligence.
 */
import type {MissionRecorder} from './breach-replay.ts';
import type {RecordedShot} from './breach-replay-ballistics.ts';

export type ForensicPrecision='physical-hitbox'|'proxy'|'region-only'|'unknown';
export type ContactResolution='incapacitated'|'surrendered'|'unresolved';
export type ShotOutcome='miss'|'armor-stopped'|'non-damaging'|'damaging'|'hit-unknown';
export type ReportShot={
  id:number;at:number;shooterId:string;targetId:string|null;
  outcome:ShotOutcome;down:boolean;region:string|null;
  precision:ForensicPrecision;damage:number|null;
  weapon:string|null;caliber:string|null;receiver:string|null;
};
export type OperatorAfterAction={
  id:string;name:string;rank:number;contribution:number;
  status:'active'|'wounded'|'heavy'|'incapacitated'|'unknown';
  shots:number;hits:number;damagingHits:number;armorStops:number;
  incapacitations:number;contactReports:number;
  doorsOpened:number|null;doorsForced:number|null;windowsTraversed:number|null;
  categories:{combat:number;recon:number;support:number;objective:number};
};
export type ContactAfterAction={
  id:string;name:string;side:'red'|'blue';
  resolution:ContactResolution;resolvedAt:number|null;
  firstSeenAt:number|null;shots:ReportShot[];finalShotId:number|null;
};
export type AfterActionReport={
  schemaVersion:2;duration:number;complete:boolean;
  limitations:readonly string[];shots:ReportShot[];
  operators:OperatorAfterAction[];hostiles:ContactAfterAction[];
  friendlyCasualties:ContactAfterAction[];
};
const byTime=(a:ReportShot,b:ReportShot)=>a.at-b.at||a.id-b.id;
const finite=(n:unknown):n is number=>typeof n==='number'&&Number.isFinite(n);
export const canonicalDistanceMeters=(worldUnits:number):number|null=>
  finite(worldUnits)&&worldUnits>=0?worldUnits/20:null;
/** The canonical geometry scale is 20 simulation units per metre.
 * Legacy report-only exports may lack a reliable distance metric; show —.
 */
export function shotOutcome(s:Pick<RecordedShot,
  'hit'|'healthBefore'|'healthAfter'|'surface'>):ShotOutcome{
  if(!s.hit)return 'miss';
  if(!finite(s.healthBefore)||!finite(s.healthAfter))return 'hit-unknown';
  if(s.healthAfter<s.healthBefore)return 'damaging';
  // A zero-health-change result alone does not prove armor protection.
  return s.surface==='metal'?'armor-stopped':'non-damaging';
}
export function viewShot(s:RecordedShot):ReportShot{
  const outcome=shotOutcome(s);
  return {
    id:s.id,at:s.recordedAt,shooterId:s.shooterId,targetId:s.targetId,
    outcome,down:s.down,region:s.hit?s.hitRegion??null:null,
    precision:s.hit&&s.hitRegion?'region-only':'unknown',
    damage:finite(s.healthBefore)&&finite(s.healthAfter)?
      Math.max(0,s.healthBefore-s.healthAfter):null,
    weapon:s.weaponAtFire??null,caliber:s.nominalCaliberAtFire??null,
    receiver:s.receiverAtFire??null
  };
}
function contactReviews(rec:MissionRecorder,side:'red'|'blue',shots:ReportShot[]):ContactAfterAction[]{
  const actors=(rec.manifest?.actors??[]).filter(a=>a.side===side);
  return actors.map(a=>{
    const resolved=rec.events.filter(e=>e.actor===a.id&&
      (e.kind==='down'||e.kind==='surrender')).slice()
      .sort((x,y)=>x.t-y.t||x.id-y.id)[0];
    const targetShots=shots.filter(s=>s.targetId===a.id);
    const finalShot=resolved?.kind==='down'?
      targetShots.filter(s=>s.down).at(-1)??null:null;
    return {
      id:a.id,name:a.name,side,
      resolution:resolved?.kind==='down'?'incapacitated':
        resolved?.kind==='surrender'?'surrendered':'unresolved',
      resolvedAt:resolved?.t??null,
      firstSeenAt:rec.events.filter(e=>e.kind==='intel'&&
        e.meta?.action==='spot'&&e.meta.targetId===a.id)
        .sort((x,y)=>x.t-y.t||x.id-y.id)[0]?.t??null,
      shots:targetShots,finalShotId:finalShot?.id??null
    } satisfies ContactAfterAction;
  }).sort((a,b)=>
    (a.resolvedAt??Infinity)-(b.resolvedAt??Infinity)||
    a.id.localeCompare(b.id));
}
export function buildAfterActionReport(rec:MissionRecorder):AfterActionReport{
  const shots=rec.ballistics.shots.map(viewShot).sort(byTime);
  const hostiles=contactReviews(rec,'red',shots);
  const allFriendly=contactReviews(rec,'blue',shots);
  const friendlyCasualties=allFriendly.filter(c=>c.resolution==='incapacitated');
  const finalById=new Map((rec.frames.at(-1)?.actors??[]).map(a=>[a.id,a]));
  const operators=(rec.manifest?.actors??[])
    .filter(a=>a.side==='blue').map(a=>{
      const fired=shots.filter(s=>s.shooterId===a.id);
      const status=finalById.get(a.id);
      const downed=fired.filter(s=>s.down&&s.targetId&&hostiles.some(c=>c.id===s.targetId));
      const notices=rec.events.filter(e=>e.actor===a.id&&e.kind==='intel');
      // Never score the same identified contact repeatedly for spot flicker.
      const targets=new Set(notices.filter(e=>e.meta?.action==='spot'&&
        e.meta.targetId).map(e=>e.meta!.targetId));
      const intel=targets.size+notices.filter(e=>!e.meta?.targetId).length;
      const damaging=fired.filter(s=>s.outcome==='damaging').length;
      const armor=fired.filter(s=>s.outcome==='armor-stopped').length;
      const combat=downed.length*12+damaging*2+armor;
      const recon=intel*2;
      // Do not infer successful interactions from prose-only legacy door events.
      const actions=rec.events.filter(e=>e.meta?.action&&
        (e.actor===a.id||e.meta.contributorId===a.id));
      const count=(kind:string)=>actions.filter(e=>e.meta?.action===kind).length;
      const doorsOpened=count('door-open'),doorsForced=count('door-forced');
      const windowsTraversed=count('window-traverse');
      const support=doorsOpened*2+doorsForced*4+windowsTraversed*3;
      const objective=count('objective-secure')*8;
      const categories={combat,recon,support,objective};
      const injury=status?.injuryStage;
      return {
        id:a.id,name:a.name,rank:0,contribution:combat+recon+support+objective,
        status:!status?'unknown':status.health<=0?'incapacitated':
          injury===2?'heavy':injury===1?'wounded':'active',
        shots:fired.length,hits:fired.filter(s=>
          s.outcome==='damaging'||s.outcome==='armor-stopped'||
          s.outcome==='non-damaging').length,
        damagingHits:damaging,armorStops:armor,incapacitations:downed.length,
        contactReports:intel,doorsOpened:rec.events.some(e=>!!e.meta)?doorsOpened:null,
        doorsForced:rec.events.some(e=>!!e.meta)?doorsForced:null,
        windowsTraversed:rec.events.some(e=>!!e.meta)?windowsTraversed:null,
        categories
      } satisfies OperatorAfterAction;
    }).sort((a,b)=>b.contribution-a.contribution||a.id.localeCompare(b.id));
  operators.forEach((op,i)=>op.rank=i+1);
  return {
    schemaVersion:2,duration:rec.duration,complete:rec.completeness.complete,
    limitations:[
      'Legacy hit regions are categorical, not physically localized.',
      'Exact caliber and body-side impact are not available in legacy shots.',
      'Door and window successes require structured events for reliable attribution.'
    ],
    shots,operators,hostiles,friendlyCasualties
  };
}
