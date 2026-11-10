/** Replay R2: portable, human-readable report; not the full film format.
 * All claims derive from immutable recorded evidence. Concealed post-action
 * information is explicitly labelled as full reconstruction.
 */
import type {MissionRecorder} from './breach-replay.ts';

export function buildReplayReport(recording:MissionRecorder){
  const final=recording.frames.at(-1);
  const manifest=recording.manifest;
  const shots=recording.ballistics.shots;
  const finalById=new Map(final?.actors.map(a=>[a.id,a])??[]);
  const timeline=[
    ...recording.events.map(e=>({
      id:'battle:'+e.id,t:e.t,kind:e.kind,actorId:e.actor??null,
      position:e.p??null,text:e.text,meta:e.meta??null
    })),
    ...recording.executionEvents.map(e=>({
      id:'execution:'+e.id,t:e.t,kind:e.kind,actorId:e.actor,
      position:e.p,text:e.text,orderId:e.orderId,reason:e.reason
    }))
  ].sort((a,b)=>a.t-b.t||a.id.localeCompare(b.id));
  return {
    format:'fieldwork-breach-report',
    schemaVersion:2,
    disclosure:'full-reconstruction',
    replaySchemaVersion:manifest?.schemaVersion??1,
    mission:{
      siteSeed:manifest?.site?.seed??null,
      siteName:manifest?.site?.name??'UNKNOWN SITE',
      variant:manifest?.variant??null,
      missionType:manifest?.missionType??null,
      result:final?.phase??'unknown',
      recordedDurationSeconds:recording.duration
    },
    completeness:{...recording.completeness},
    operators:(manifest?.actors??[]).map(a=>{
      const outcome=finalById.get(a.id);
      const fired=shots.filter(shot=>shot.shooterId===a.id);
      return {
        id:a.id,name:a.name,side:a.side,initialWeapon:a.weapon,
        shotsFired:fired.length,verifiedHits:fired.filter(x=>x.hit).length,
        finalHealth:outcome?.health??null,
        finalInjuryStage:outcome?.injuryStage??null
      };
    }),
    shots:shots.map(s=>({
      id:s.id,t:s.recordedAt,shooterId:s.shooterId,
      targetId:s.targetId,side:s.side,
      start:{...s.start,height:s.muzzleHeight??null},
      end:{...s.end,height:s.impactHeight??null},
      hit:s.hit,down:s.down,surface:s.surface??null,
      healthBefore:s.healthBefore,healthAfter:s.healthAfter,
      hitRegion:s.hitRegion??null,mode:s.mode??null,
      weaponAtFire:s.weaponAtFire??null,
      receiverAtFire:s.receiverAtFire??null,familyAtFire:s.familyAtFire??null,
      nominalCaliberAtFire:s.nominalCaliberAtFire??null,
      caliberEvidence:s.nominalCaliberAtFire?'visual-preset':'unavailable',
      precision:'region-only' as const
    })),
    planRevisions:recording.plans.revisions,
    events:timeline
  };
}

export function serializeReplayReport(recording:MissionRecorder):string{
  return JSON.stringify(buildReplayReport(recording),null,2);
}
