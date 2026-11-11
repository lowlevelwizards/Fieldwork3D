/** V4 Stage 4 — optional, versioned evidence from a deterministic body-space
 * trajectory proxy. This is a SHADOW OBSERVATION, not a hitbox, damage
 * modifier, wound-side authority or bullet entry coordinate.
 *
 * Existing hitRegion(shotId) / rayHitsActor() determine the live result.
 * This function must never call RNG or feed back into combat resolution.
 */
import type {Pt} from './breach-core.ts';
import type {WoundRegion} from './breach-wounds.ts';

export type HitSide='left'|'right'|'unknown';
export type HitAnatomyV1={
  schemaVersion:1;
  region:WoundRegion;
  side:HitSide;
  source:'trajectory-proxy'|'legacy-region';
  /** Entry into the same 2D collision circle used by live hit eligibility.
   * Body-frame normalized side and forward offsets, NOT an exact wound.
   */
  lateral:number|null;
  forward:number|null;
};
const clamp=(v:number)=>Math.max(-1,Math.min(1,v));
const validRegion=(v:unknown):v is WoundRegion=>
  v==='head'||v==='torso'||v==='arm'||v==='leg';
const finiteUnit=(v:unknown):v is number=>
  typeof v==='number'&&Number.isFinite(v)&&v>=-1&&v<=1;

/** Safe when loading old or externally supplied archive data: invalid
 * anatomy never becomes a colored or side-specific wound.
 */
export function validHitAnatomy(
 input:unknown,region:unknown
):input is HitAnatomyV1{
 if(!input||typeof input!=='object')return false;
 const a=input as Partial<HitAnatomyV1>;
 return a.schemaVersion===1&&validRegion(a.region)&&a.region===region&&
   (a.side==='left'||a.side==='right'||a.side==='unknown')&&
   (a.source==='trajectory-proxy'||a.source==='legacy-region')&&
   ((a.lateral===null&&a.forward===null)||
     (finiteUnit(a.lateral)&&finiteUnit(a.forward)))&&
   (a.source!=='legacy-region'||(a.side==='unknown'&&
     a.lateral===null&&a.forward===null))&&
   (a.source!=='trajectory-proxy'||(
     finiteUnit(a.lateral)&&finiteUnit(a.forward)))&&
   ((a.region==='arm'||a.region==='leg')||a.side==='unknown');
}

export function legacyAnatomy(region:WoundRegion):HitAnatomyV1{
 return {schemaVersion:1,region,side:'unknown',source:'legacy-region',
   lateral:null,forward:null};
}

/** Observes the original 2D hit circle; does NOT retest hit eligibility.
 * At target heading 0, +Y is right and -Y is left in the gameplay plane.
 * Near-center contact is ambiguous, so no side is claimed there.
 */
export function shadowHitAnatomy(input:{
 muzzle:Pt;target:Pt;targetHeading:number;shotYaw:number;
 hitRadius:number;region:WoundRegion;
}):HitAnatomyV1{
 const {muzzle,target,targetHeading,shotYaw,hitRadius,region}=input;
 const dx=Math.cos(shotYaw),dy=Math.sin(shotYaw);
 const toX=target.x-muzzle.x,toY=target.y-muzzle.y;
 const along=toX*dx+toY*dy;
 const across=toX*dy-toY*dx;
 if(!Number.isFinite(along)||!Number.isFinite(across)||
    !Number.isFinite(targetHeading)||!Number.isFinite(hitRadius)||
    hitRadius<=0||along<=0||Math.abs(across)>hitRadius)
   return legacyAnatomy(region);
 // Entry on the original broad collision proxy; remains separate from
 // physics, armor and bleeding. No additional random draws or ray traces.
 const t=along-Math.sqrt(Math.max(0,hitRadius*hitRadius-across*across));
 const ex=muzzle.x+t*dx-target.x;
 const ey=muzzle.y+t*dy-target.y;
 const forward=clamp((ex*Math.cos(targetHeading)+
   ey*Math.sin(targetHeading))/hitRadius);
 const lateral=clamp((-ex*Math.sin(targetHeading)+
   ey*Math.cos(targetHeading))/hitRadius);
 const side:HitSide=(region==='arm'||region==='leg')&&
   Math.abs(lateral)>.32?(lateral>0?'right':'left'):'unknown';
 return {schemaVersion:1,region,side,source:'trajectory-proxy',
   lateral,forward};
}

/** Narrowly limits UI to evidence that survived provenance validation. */
export function recordedHitAnatomy(input:{
 hit?:boolean;hitRegion?:WoundRegion;hitAnatomy?:unknown;
}):HitAnatomyV1|null{
 if(!input.hit||!validRegion(input.hitRegion))return null;
 return validHitAnatomy(input.hitAnatomy,input.hitRegion)?
   input.hitAnatomy:legacyAnatomy(input.hitRegion);
}
