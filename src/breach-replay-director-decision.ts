/** R9.6: the camera's *decision utility*, not the independent final grade.
 * Every candidate uses the same historical, disclosed geometric evidence.
 * No future hostile positions, render sampling, simulation mutations or
 * S-F grade feedback enter this selection path.
 */
import type {DirectorShot} from './breach-replay-director-shots.ts';
import {directorCompositionQuality,directorAttentionVisible,
  type DirectorSafeFrame} from './breach-replay-director-projection.ts';
import {directorCameraLegal,directorLineBlocked,directorSubjectVisibility,
  type PhysicalDirectorScene} from './breach-replay-director-physical.ts';

const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
const dist=(a:{x:number;y:number},b:{x:number;y:number})=>
  Math.hypot(a.x-b.x,a.y-b.y);
export type DirectorDecisionContext={
  scene:PhysicalDirectorScene;aspect:number;baseSpan:number;
  safeFrame?:DirectorSafeFrame;lens?:'ortho'|'wide';
};
export type DirectorDecisionScore={
  score:number;story:number;readability:number;composition:number;
  continuity:number;legal:boolean;reason:string;
  heroVisible:boolean;attentionVisible:boolean;targetVisible:boolean;
};
export function scoreDirectorCandidate(
  shot:DirectorShot,ctx:DirectorDecisionContext,
  prior:DirectorShot|null=null
):DirectorDecisionScore{
  const room=ctx.scene.rooms.find(r=>r.id===shot.roomId)??null;
  const legal=directorCameraLegal(shot.cameraAnchor,room,ctx.scene);
  const hero=shot.operatorPoint??shot.cameraAnchor;
  const target=shot.contactTargetPoint??null;
  const lens=ctx.lens??'ortho';
  const quality=directorCompositionQuality(shot.cameraAnchor,
    shot.focus,hero,target,shot.actionAxis??{x:1,y:0},
    shot.editorialKind??'follow',lens,ctx.aspect,ctx.baseSpan,
    shot.zoom,shot.fov??108,.78,.76,ctx.safeFrame,
    shot.foregroundOperatorPoints??[]);
  const heroVisible=quality.primaryReadable&&
    directorSubjectVisibility(shot.cameraAnchor,hero,ctx.scene).readable;
  const targetVisible=!!target&&quality.targetReadable&&
    directorSubjectVisibility(shot.cameraAnchor,target,ctx.scene).readable&&
    !directorLineBlocked(shot.cameraAnchor,target,ctx.scene);
  const attention=shot.attentionPoint??null;
  const attentionVisible=!!attention&&directorAttentionVisible(
    shot.cameraAnchor,shot.focus,attention,lens,ctx.aspect,ctx.baseSpan,
    shot.zoom,shot.fov??108,ctx.safeFrame)&&
    !directorLineBlocked(shot.cameraAnchor,attention,ctx.scene);
  const wantsTarget=!!target;
  const wantsAttention=!!attention&&
    ((shot.discoveryStrength??0)>.1||
      ['entry','breach','approach'].includes(shot.shotType));
  let readability=heroVisible?68:0;
  if(wantsTarget)readability+=targetVisible?32:0;
  else if(wantsAttention)readability+=attentionVisible?32:0;
  else {
    // A readable subject can form an effective quiet or travel image.
    readability+=heroVisible?22:0;
    const supports=(shot.foregroundOperatorPoints??[]).filter(p=>
      dist(p,hero)>5&&
      directorSubjectVisibility(shot.cameraAnchor,p,ctx.scene).readable);
    readability+=Math.min(10,supports.length*5);
  }
  if(wantsTarget&&!targetVisible)readability=Math.min(readability,30);
  if(wantsAttention&&!attentionVisible)
    readability=Math.min(readability,40);
  const story=clamp((shot.editorialPriority??1)*16,15,100);
  const composition=clamp(quality.score,0,100);
  let continuity=100;
  let cutCost=0;
  if(prior){
    const move=dist(prior.cameraAnchor,shot.cameraAnchor);
    const sameStory=prior.editorialId===shot.editorialId;
    // A change of camera setup is expensive when the current story
    // is still worth watching. New action can justify a deliberate cut.
    cutCost=move>46?(sameStory?14:7):move>20?6:0;
    continuity-=cutCost;
    const old=prior.actionAxis,now=shot.actionAxis;
    if(old&&now&&prior.operatorPoint&&shot.operatorPoint){
      const cross=(axis:{x:number;y:number},
        point:{x:number;y:number},anchor:{x:number;y:number})=>
        axis.x*(anchor.y-point.y)-axis.y*(anchor.x-point.x);
      const a=cross(old,prior.operatorPoint,prior.cameraAnchor);
      const b=cross(now,shot.operatorPoint,shot.cameraAnchor);
      if(sameStory&&Math.abs(a)>12&&Math.abs(b)>12&&a*b<0)
        continuity-=35;
    }
    if(sameStory&&move<18)continuity+=6;
  }
  continuity=clamp(continuity,0,100);
  let score=story*.34+readability*.38+
    composition*.20+continuity*.08;
  // Serious optical failures must not be disguised by narrative priority.
  if(!heroVisible&&!targetVisible&&!attentionVisible)
    score=Math.min(score,28);
  if(wantsTarget&&!targetVisible)score=Math.min(score,47);
  if(wantsAttention&&!attentionVisible)score=Math.min(score,52);
  if(!legal)score=-Infinity;
  const reason=!legal?'illegal camera placement':
    wantsTarget&&!targetVisible?'disclosed contact is not readable':
    wantsAttention&&!attentionVisible?'attention falls outside useful image':
    !heroVisible?'featured operator is obscured or cropped':
    prior&&cutCost>0?'readable scene with camera-change cost':
    'readable story with spatial continuity';
  return {score:Math.round(score*10)/10,story,readability,
    composition,continuity,legal,reason,
    heroVisible,attentionVisible,targetVisible};
}
