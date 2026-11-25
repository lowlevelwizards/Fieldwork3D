import {publishSessionCoverToActiveSite} from './breach-world-context.ts';
import {recordTrainingCoverStrike} from './training/training-targets.ts';
/** Stage 10: physical environmental damage & evidence after real fired rays.
 * Not a sight/aim evaluator. All mutations are authoritative Session state.
 */
import type {Session,TeamActor,MaterialImpactCue} from './breach-game.ts';
import {MAX_MATERIAL_CUES} from './breach-material-cues.ts';
import type {BattleEvent} from './breach-combat.ts';
import {type Pt,doorCenter} from './breach-core.ts';
import {length} from './breach-plan.ts';
import {damageCover} from './breach-reactive-cover.ts';
import {retainCollapsePuff} from './breach-atmosphere-evidence.ts';
import {materialResponse} from './breach-impact-responses.ts';
import {damageWindow} from './breach-windows.ts';
import {GLASS_INTEGRITY} from './breach-glass-damage.ts';
import {recordDoorFracture} from './breach-fracture-record.ts';
import {retainImpactMark} from './breach-impact-evidence-buffer.ts';

type ShotEnvironmentPorts={
 enemies:(session:Session)=>TeamActor[];
 hear:(session:Session,p:Pt,radius:number,kind:string)=>void;
 battleEvent:(session:Session,kind:BattleEvent['kind'],
  actor:TeamActor|null,p:Pt,message:string)=>void;
};
const d=(a:Pt,b:Pt)=>length(a,b);

/** Construct once within the combat pipeline; no per-tick allocations. */
export function createShotEnvironmentCommitter(
 {enemies,hear,battleEvent}:ShotEnvironmentPorts){
/** Distinct pre-target penetration events leave physical evidence. */
function emitMaterialEvents(s:Session,from:Pt,to:Pt,
 hits:readonly import('./breach-ballistic-resolution.ts').MaterialHitEvidence[],
 maximum=1):MaterialImpactCue[]{
 const unique=new Set<string>();
 const cues:MaterialImpactCue[]=[];
 for(const hit of hits){
  if(hit.fraction>maximum+.00001||hit.fraction>=.9999)continue;
  const p={x:from.x+(to.x-from.x)*hit.fraction,
    y:from.y+(to.y-from.y)*hit.fraction};
  const key=Math.round(p.x/3)+','+Math.round(p.y/3);
  if(unique.has(key))continue;unique.add(key);
  const response=materialResponse(hit.material);
  const id=s.nextEffectId++,height=hit.height??20;
  retainImpactMark(s,{id,p,surface:response.visual,age:0,height,
    shotId:s.nextShotId,surfaceRef:hit.surfaceRef});
  const fixture=hit.surfaceRef?.kind==='cover'?s.coverState[hit.surfaceRef.index]?.fixture:undefined;
  if(cues.length<MAX_MATERIAL_CUES)cues.push({id,p:{...p},height,surface:response.visual,...(fixture?{fixture}:{})});
  if(response.sound!=='glass')
    hear(s,p,response.radius,'impact-'+response.sound);
 }
 return cues;
}
/** Mutate only struck cover, never the planning ray or visual renderer. */
function damageStruckCover(s:Session,hits:readonly {index:number;fraction:number}[],
 force:number,maxFraction=1,shooterId?:string){
 const touched=new Set<number>();
 for(const h of hits){
  if(h.fraction>maxFraction+.00001||touched.has(h.index))continue;
  touched.add(h.index);
  const piece=s.coverState[h.index];if(!piece)continue;
  if(shooterId&&recordTrainingCoverStrike(s,piece,shooterId,s.nextShotId)){
   const actor=s.operators.find(a=>a.id===shooterId)??null;
   battleEvent(s,'impact',actor,{x:piece.x,y:piece.y},
    (piece.fixture==='target-no-shoot'?'NO-SHOOT':'TRAINING')+
    ' TARGET STRUCK · '+piece.id);
  }
  const result=damageCover(piece,force,s.seconds);
  if(result==='immune')continue;
  s.objectRevision++;
  if(result==='collapsed'){
    retainCollapsePuff(s,piece);
    battleEvent(s,'impact',null,{x:piece.x,y:piece.y},
      (piece.fixture??'FURNITURE').toUpperCase()+' COLLAPSED');
    // Nearby defenders perceive their own cover crumbling. Uninformed
    // distant guards are not globally told the new geometry.
    for(const defender of enemies(s)){
      if(defender.health<=0)continue;
      const near=d(defender.p,{x:piece.x,y:piece.y})<
        Math.max(piece.w,piece.h)+34;
      if(near){
        defender.defense=null;defender.defenseUntil=s.seconds;
        defender.nav=[];defender.suppression=Math.min(1,
          defender.suppression+.12);
      }
    }
  }
 }
 if(touched.size)publishSessionCoverToActiveSite(s);
}
/** Persist actual glass-door damage only after a fired projectile. The metal
 * frame and physical leaf remain operational; only glazing shatters. */
function shatterStruckDoorGlass(s:Session,
 hits:readonly {index:number;fraction:number}[],maxFraction=1,force=1){
 const touched=new Set<number>();
 for(const hit of hits){
  if(hit.fraction>maxFraction+.00001||touched.has(hit.index))continue;
  touched.add(hit.index);
  const door=s.doors[hit.index];
  if(!door||door.glassShattered||
     !['glazed','french'].includes(door.style??''))continue;
  door.glassIntegrity=Math.max(0,(door.glassIntegrity??GLASS_INTEGRITY)-force);
  s.objectRevision++;
  const at=doorCenter(door);
  hear(s,at,175,'glass');
  if(door.glassIntegrity===0){door.glassShattered=true;recordDoorFracture(door,s.seconds);
   battleEvent(s,'impact',null,at,'GLASS DOOR SHATTERED');}
 }
}
/** Keep decorative evidence bounded separately from authoritative hits.
 * Nearby blood spatters merge rather than creating dozens of overlapping
 * translucent meshes during sustained automatic fire. */
/** Commit impacts only for the actual shot path, never aim/LOS queries. */
function shatterStruckWindows(s:Session,paneHits:readonly number[],force:number){
 for(const index of new Set(paneHits)){
  const window=s.windows[index];
  if(!window||!damageWindow(window,force))continue;
  s.objectRevision++;
  hear(s,{x:window.x,y:window.y},170,'glass');
  if(window.shattered&&window.shatteredAt===undefined)
    window.shatteredAt=s.seconds;
  if(window.shattered)battleEvent(s,'impact',null,
    {x:window.x,y:window.y},'GLASS SHATTERED');
 }
}

 return {emitMaterialEvents,damageStruckCover,shatterStruckDoorGlass,shatterStruckWindows};
}
