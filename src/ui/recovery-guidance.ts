/** Advice derived solely from the player-facing error string.
 * Never consults world geometry, enemies, or hidden fog-of-war state. */
export type RecoveryAdvice={title:string;next:string;marker:string};
export function recoveryAdviceFor(message:string):RecoveryAdvice|null{
  const s=message.toUpperCase();
  if(/LATER WAYPOINT|REMAINING PLAN/.test(s))
    return {title:'ROUTE CONFLICT',next:'Move the later waypoint or undo this edit first.',marker:'ROUTE'};
  if(/INSUFFICIENT CLEARANCE|DESTINATION BLOCKED|INVALID ORDER DESTINATION/.test(s))
    return {title:'NO ROOM TO STAND',next:'Choose a nearby clear floor position.',marker:'CLEARANCE'};
  if(/FLASH/.test(s)&&/BLOCK|OUT OF RANGE|INVALID|TRAJECTORY|CANNOT REACH/.test(s))
    return {title:'THROW NOT POSSIBLE',next:'Pick a closer, reachable throw point with a clear known path.',marker:'THROW'};
  if(/FIRE BLOCKED/.test(s))
    return {title:'SHOT BLOCKED',next:'Adjust your angle or move to a clearer firing position.',marker:'SHOT'};
  if(/WRONG SIDE|CANNOT KICK INWARD/.test(s))
    return {title:'WRONG DOOR SIDE',next:'Choose another entry method or approach from the appropriate side.',marker:'DOOR'};
  if(/DOOR/.test(s)&&/NOT REACHABLE|CANNOT|NO KNOWN|LOCKED|JAMMED|BLOCKED/.test(s))
    return {title:'DOOR INTERACTION FAILED',
      next:'Move closer to a known reachable side or choose an available door action.',marker:'DOOR'};
  if(/ENTRY TOOL CANNOT REACH|EQUIPPED TOOL CANNOT OPERATE/.test(s))
    return {title:'TOOL CANNOT REACH',next:'Approach the door or select an available entry tool.',marker:'TOOL'};
  if(/NO WALKABLE|NO SAFE ROUTE|NO WALKABLE STROKE|CANNOT REACH|BLOCKED.*ROUTE/.test(s))
    return {title:'ROUTE NOT AVAILABLE',
      next:'Choose another reachable floor point or check known doors along your route.',marker:'ROUTE'};
  if(/WATCH TARGET UNAVAILABLE|AIM POINT|INVALID SUPPRESSION/.test(s))
    return {title:'INVALID TARGET',next:'Choose a valid point inside the map and try again.',marker:'TARGET'};
  if(/RELOAD/.test(s)&&/CANNOT|BLOCKED|NO RESERVE/.test(s))
    return {title:'RELOAD UNAVAILABLE',next:'Check ammunition and operator readiness.',marker:'RELOAD'};
  if(/BLOCKED|OBSTRUCT|CANNOT|INVALID|JAMMED|OUT OF RANGE|RESISTED/.test(s)){
    if(/FURNITURE/.test(s))return {title:'MOVEMENT OBSTRUCTED',
      next:'Adjust the route around visible cover or choose a different destination.',marker:'BLOCKED'};
    if(/ACTOR|FRIENDLY/.test(s))return {title:'TEAMMATE IN THE WAY',
      next:'Adjust the route or spacing between operators.',marker:'BLOCKED'};
    return {title:'ACTION BLOCKED',next:'Reposition or adjust this order and try again.',marker:'BLOCKED'};
  }
  return null;
}
