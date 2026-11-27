/** WR1: pure requested retention contract, not achieved custody or a pose writer.
 * A later fixed-step owner must acknowledge support before freeing a hand.
 * No inventory, world, combat or simulation mutation. */
export type SlingKind='none'|'single'|'two';
export type RetentionLocation='held-two'|'held-one'|'front-slung'|'side-slung'|
 'back-slung'|'holstered'|'grounded'|'relinquished'|'absent';
export type BodyRegion='front'|'side'|'back';
export type ActionHands='none'|'one'|'both';
export type RetentionAction='ordinary'|'reload'|'one-hand'|'hands-free'|
 'switch-secondary'|'surrender'|'down';
export type RetentionFacts=Readonly<{
 sling:SlingKind;primaryPresent:boolean;secondaryPresent:boolean;
 selected:'primary'|'secondary';action:RetentionAction;
 mobile?:boolean;occupied?:readonly BodyRegion[];preferred?:BodyRegion;
}>;
export type RetentionRequest=Readonly<{
 primary:RetentionLocation;secondary:RetentionLocation;
 hands:ActionHands;blocked:null|'no-compatible-support'|'no-secondary';
}>;
const locations:Record<BodyRegion,RetentionLocation>={
 front:'front-slung',side:'side-slung',back:'back-slung'
};
export function readSlingKind(id:string|undefined):SlingKind{
 return id==='sling-two-point'||id==='sling-traditional'?'two':
  id==='sling-single-point'?'single':'none';
}
function suspension(f:RetentionFacts):RetentionLocation|null{
 const candidates:readonly BodyRegion[]=f.sling==='two'?
  [f.preferred==='back'?'back':'front','front','back']:
  f.sling==='single'?['front']:[];
 for(const region of candidates)
  if(!f.occupied?.includes(region))return locations[region];
 return null;
}
export function requestWeaponRetention(f:RetentionFacts):RetentionRequest{
 const result=(primary:RetentionLocation,secondary:RetentionLocation,
  hands:ActionHands,blocked:RetentionRequest['blocked']=null):RetentionRequest=>
  ({primary:f.primaryPresent?primary:'absent',
    secondary:f.secondaryPresent?secondary:'absent',hands,blocked});
 if(f.action==='surrender')return result('relinquished','relinquished','both');
 if(f.action==='down')return result(suspension(f)??'grounded','holstered','both');
 const secondaryActive=f.action==='switch-secondary'||f.selected==='secondary';
 if(secondaryActive&&!f.secondaryPresent&&f.action!=='hands-free')
  return result('held-two','absent','none','no-secondary');
 if(f.action==='hands-free'||secondaryActive){
  const hands=f.action==='hands-free'?'both':f.action==='one-hand'?'one':'none';
  const secondary=f.action==='hands-free'?'holstered':
   f.action==='one-hand'?'held-one':'held-two';
  if(!f.primaryPresent)return result('absent',secondary,hands);
  const target=suspension(f);
  if(target)return result(target,secondary,hands);
  // Stationary world placement is a request only. Moving hands-free with
  // an unsupported long gun is never represented as achieved suspension.
  if(!f.mobile)return result('grounded',secondary,hands);
  return result('held-one','holstered',hands,'no-compatible-support');
 }
 return result(f.action==='one-hand'?'held-one':'held-two','holstered',
  f.action==='one-hand'?'one':'none');
}
/** Achieved state supplied by the fixed-step owner, not inferred from a timer.
 * Grounded/relinquished means ownership handoff has already been confirmed. */
export type AchievedRetention=Readonly<{
 primary:RetentionLocation;secondary:RetentionLocation;
}>;
export function retentionReady(request:RetentionRequest,actual:AchievedRetention):boolean{
 return request.blocked===null&&request.primary===actual.primary&&
  request.secondary===actual.secondary;
}

/** Keep the firing-side holster accessible and avoid a loaded back region.
 * This is a game animation preference; no new equipment or action rules. */
export function preferredHandsFreeRegion(sling:SlingKind,holster?:string):BodyRegion{
 void sling;void holster;return 'front';
}
