/** Conservative weapon-envelope clearance. Deterministic pure sampling.
 * Never drives navigation or teleports operators: it only requests a compact
 * handling pose, with motor independently retaining authority.
 */
export type Pt={x:number;y:number};
export type ClearanceProbe={
  origin:Pt;yaw:number;length:number;
  isClear:(from:Pt,to:Pt)=>boolean;
};
export type ClearanceResult={
  obstruction:boolean;fraction:number;retract:number;
  needsCorrection:boolean;
};
export function probeWeaponClearance(p:ClearanceProbe):ClearanceResult{
  const dx=Math.cos(p.yaw),dy=Math.sin(p.yaw);
  const width={x:-dy,y:dx};
  const fractions=[.35,.50,.65,.80,1];
  let clearFraction=1;
  for(const fraction of fractions){
    const end={x:p.origin.x+dx*p.length*fraction,
      y:p.origin.y+dy*p.length*fraction};
    // The barrel occupies an envelope, not an infinitely thin ray.
    const safe=[0,-1.25,1.25].every(side=>
      p.isClear({x:p.origin.x+width.x*side,
        y:p.origin.y+width.y*side},
        {x:end.x+width.x*side,y:end.y+width.y*side}));
    if(!safe){clearFraction=Math.max(.15,fraction-.17);break;}
  }
  const obstruction=clearFraction<1;
  const retract=obstruction?
    Math.min(1,Math.max(.18,(1-clearFraction)*1.4)):0;
  return {obstruction,fraction:clearFraction,retract,
    needsCorrection:obstruction&&clearFraction<.48};
}
