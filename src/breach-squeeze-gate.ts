/** A narrow-profile turn is a last physical resort, not a reaction to
 * a temporarily swinging/locked door or a cosmetic corner graze.
 * No new shape or collision privilege is granted by this policy gate. */
export type SqueezeGate={
 fullBodyClear:boolean;narrowBodyClear:boolean;
 alreadySqueezing:boolean;closedDoor:boolean;
 doorAdvancing:boolean;leafMoving:boolean;
 nearNarrowThreshold:boolean;opposingPressure:boolean;
 traversalPending:boolean;settledPhysicalBlockage?:boolean;
};
export function shouldEnterSqueeze(g:SqueezeGate):boolean{
 return !g.fullBodyClear&&g.narrowBodyClear&&!g.alreadySqueezing&&
   !g.closedDoor&&!g.doorAdvancing&&!g.leafMoving&&
   (!g.traversalPending||g.settledPhysicalBlockage===true)&&
   (g.nearNarrowThreshold||g.opposingPressure);
}
