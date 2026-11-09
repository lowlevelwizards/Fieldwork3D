/** R9.5: independently assess the shot ACTUALLY on screen.
 * This does NOT select, cut, move or alter the Director's historical film.
 * Imperfect geometric estimator; the point is to make disagreement with
 * human screenshot feedback explicit and reproducible. */
import type {ReplayFrame} from './breach-replay.ts';
import type {DirectorShot} from './breach-replay-director-shots.ts';
import type {DirectorRoom,DirectorWall}
  from './breach-replay-cinematic-director.ts';
import {directorCompositionQuality,directorAttentionVisible,
  type DirectorSafeFrame} from './breach-replay-director-projection.ts';
import {directorLineBlocked,directorSubjectVisibility,
  type PhysicalDirectorScene} from './breach-replay-director-physical.ts';
import {directorRecordedDiscovery,type DirectorDiscovery}
  from './breach-replay-director-discovery.ts';

type Pt={x:number;y:number};
export type DirectorGradeLetter='S'|'A'|'B'|'C'|'D'|'E'|'F';
export type DirectorShotGrade={
  grade:DirectorGradeLetter;score:number;summary:string;
  confidence:'high'|'limited';
  subjectVisible:boolean;targetVisible:boolean;
  attentionVisible:boolean;supportVisible:number;
  discovery:DirectorDiscovery;
  /** Exact candidate decision, never confused with actual image grade. */
  decision:string;
};
export type DirectorGradeContext={
  shot:DirectorShot;current:ReplayFrame;previous:ReplayFrame|null;
  friendlies:ReadonlySet<string>;
  rooms:readonly DirectorRoom[];walls:readonly DirectorWall[];
  lens:'ortho'|'wide';aspect:number;baseSpan:number;
  safeFrame?:DirectorSafeFrame;
  /** Caller applies recorded team/full/operator disclosure policy. */
  visibleHostiles:ReadonlySet<string>;
};
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
const dist=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
export function directorGradeLetter(score:number):DirectorGradeLetter{
  if(score>=92)return 'S';
  if(score>=82)return 'A';
  if(score>=72)return 'B';
  if(score>=60)return 'C';
  if(score>=46)return 'D';
  if(score>=26)return 'E';
  return 'F';
}
export function gradeActualDirectorShot(ctx:DirectorGradeContext):DirectorShotGrade{
  const {shot,current,previous,friendlies,visibleHostiles}=ctx;
  const discovery=directorRecordedDiscovery(current,previous,friendlies);
  const scene:PhysicalDirectorScene={rooms:ctx.rooms,walls:ctx.walls,
    doors:current.doors,cover:current.coverState};
  // Do not call a frame empty just because the nominated hero is down or
  // no longer photographed. A visible supporting actor is still content.
  const hero=current.actors.find(a=>a.id===shot.primaryActorId&&a.health>0)
    ??current.actors.find(a=>shot.subjects.includes(a.id)&&a.health>0)
    ??current.actors.find(a=>friendlies.has(a.id)&&a.health>0);
  const operator=hero?.p??shot.operatorPoint??shot.cameraAnchor;
  const enemies=current.actors.filter(a=>!friendlies.has(a.id)&&
    visibleHostiles.has(a.id)&&(
      a.health>0||current.t-(a.lastDownAt??-Infinity)<1.5));
  const target=shot.contactTargetPoint?
    enemies.slice().sort((a,b)=>
      dist(a.p,shot.contactTargetPoint!)-dist(b.p,shot.contactTargetPoint!))[0]:
    null;
  const reliableTarget=!!target&&
    dist(target.p,shot.contactTargetPoint!)<75;
  const enemyPoint=reliableTarget?target!.p:null;
  const quality=directorCompositionQuality(shot.cameraAnchor,
    shot.focus,operator,enemyPoint,
    shot.actionAxis??{x:1,y:0},shot.editorialKind??'follow',
    ctx.lens,ctx.aspect,ctx.baseSpan,shot.zoom,shot.fov??108,
    .78,.76,ctx.safeFrame,
    current.actors.filter(a=>friendlies.has(a.id)&&a.id!==hero?.id)
      .map(a=>a.p));
  const opticalHero=hero?directorSubjectVisibility(
    shot.cameraAnchor,operator,scene):null;
  const subjectVisible=!!hero&&quality.primaryCoverage>=.48&&
    !!opticalHero?.readable;
  // The renderer can cut walls away while this cheap model still treats
  // their original plan-segments as opaque. A projected on-screen actor
  // rejected solely by geometric rays must not be reported as a certain F.
  const confidence:DirectorShotGrade['confidence']=
    !!hero&&quality.primaryCoverage>=.48&&!opticalHero?.readable?
      'limited':'high';
  const wantsEnemy=shot.shotType==='contact'&&!!shot.contactTargetPoint;
  const targetVisible=!!enemyPoint&&quality.targetReadable&&
    directorSubjectVisibility(shot.cameraAnchor,enemyPoint,scene).readable&&
    !directorLineBlocked(shot.cameraAnchor,enemyPoint,scene)||
    // A non-contact shot can still show a currently disclosed suspect.
    // No future coordinates or actors outside historical knowledge enter.
    !shot.contactTargetPoint&&enemies.slice(0,5).some(enemy=>{
      const q=directorCompositionQuality(shot.cameraAnchor,shot.focus,
        operator,enemy.p,shot.actionAxis??{x:1,y:0},
        shot.editorialKind??'follow',ctx.lens,ctx.aspect,ctx.baseSpan,
        shot.zoom,shot.fov??108,.78,.76,ctx.safeFrame);
      return q.targetReadable&&
        directorSubjectVisibility(shot.cameraAnchor,enemy.p,scene).readable&&
        !directorLineBlocked(shot.cameraAnchor,enemy.p,scene);
    });
  const attention=shot.attentionPoint??(shot.discoveryStrength?
    {x:operator.x+(shot.actionAxis?.x??1)*65,
     y:operator.y+(shot.actionAxis?.y??0)*65}:null);
  const attentionVisible=!!attention&&
    directorAttentionVisible(shot.cameraAnchor,shot.focus,attention,
      ctx.lens,ctx.aspect,ctx.baseSpan,shot.zoom,shot.fov??108,
      ctx.safeFrame)&&
    !directorLineBlocked(shot.cameraAnchor,attention,scene);
  let supportVisible=0;
  for(const actor of current.actors){
    if(!friendlies.has(actor.id)||actor.id===hero?.id||actor.health<=0)
      continue;
    const q=directorCompositionQuality(shot.cameraAnchor,shot.focus,
      actor.p,null,shot.actionAxis??{x:1,y:0},
      shot.editorialKind??'follow',ctx.lens,ctx.aspect,ctx.baseSpan,
      shot.zoom,shot.fov??108,.78,.76,ctx.safeFrame);
    if(q.primaryCoverage>=.52&&directorSubjectVisibility(
      shot.cameraAnchor,actor.p,scene).readable)supportVisible++;
  }
  const opening=shot.shotType==='entry'||shot.shotType==='breach'||
    shot.shotType==='approach';
  const newInformation=discovery.newHostiles>0||
    discovery.newCivilians>0||discovery.newGround>=3;
  let score=34;
  score+=subjectVisible?30:-32;
  if(targetVisible)score+=28;
  else if(wantsEnemy)score-=24;
  if(opening||shot.discoveryStrength){
    score+=attentionVisible?12:-14;
  }else if(shot.shotType==='travel'){
    score+=attentionVisible?7:0;
  }
  if(newInformation){
    if(targetVisible||attentionVisible)
      score+=Math.round(18*discovery.strength);
    else score-=22;
  }
  score+=clamp((quality.score-75)*.20,-12,11);
  score+=Math.min(supportVisible,2)*(newInformation?1:5);
  if(shot.shotType==='contact'&&targetVisible&&
    quality.targetHorizontalGap>=.045)score+=8;
  // Grade what is actually visible, not just the nominated protagonist.
  // True empty frames still fail; readable supporting cast and relevant
  // POV/discovery views cannot automatically collapse to an F.
  if(!subjectVisible&&supportVisible>0)
    score+=Math.min(2,supportVisible)*13;
  if(!subjectVisible&&!targetVisible&&!attentionVisible&&
    supportVisible===0)score=Math.min(score,18);
  else if(!subjectVisible&&supportVisible===0&&!targetVisible)
    score=Math.min(score,43);
  else if(!subjectVisible&&!targetVisible)
    score=Math.min(score,73);
  if(wantsEnemy&&!targetVisible)score=Math.min(score,55);
  if(newInformation&&!targetVisible&&!attentionVisible)
    score=Math.min(score,40);
  score=clamp(Math.round(score),0,100);
  const grade=directorGradeLetter(score);
  let summary:string;
  if(confidence==='limited'&&!subjectVisible)
    summary='Visibility-model disagreement; verify actual image';
  else if(!subjectVisible&&!targetVisible&&supportVisible===0&&
    !attentionVisible)summary='No readable subject';
  else if(!subjectVisible&&supportVisible>0)
    summary='Supporting cast readable; featured subject missing';
  else if(wantsEnemy&&!targetVisible)summary='Enemy obscured or outside frame';
  else if(newInformation&&!targetVisible&&!attentionVisible)
    summary='Discovery happening outside the frame';
  else if(newInformation&&(targetVisible||attentionVisible))
    summary='New information visible';
  else if(targetVisible)summary='Readable contact pair';
  else if(opening&&attentionVisible)summary='Readable doorway and action direction';
  else if(supportVisible>0)summary='Readable squad geography';
  else summary='Subject framed; limited action context';
  return {grade,score,summary,confidence,subjectVisible,targetVisible,
    attentionVisible,supportVisible,discovery,
    decision:shot.cameraDecision??'establish'};
}
