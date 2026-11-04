/** Incoming shot protection derived from the same cover-height
 * solver as combat. No distance-only near-cover shortcut and no invented
 * collision changes.
 */
import type {Pt,Obstacle} from './breach-core.ts';
import {coverImpactFraction,eyeHeight,aimHeight}
 from './breach-cover-height.ts';
export type DirectionalCover={standing:boolean;crouched:boolean};
export function directionalCoverFrom(threat:Pt,position:Pt,
 obstacles:readonly Obstacle[]):DirectionalCover{
 let standing=false,crouched=false;
 for(const o of obstacles){
  if(!standing&&coverImpactFraction(threat,position,
     eyeHeight(false),aimHeight(false),o)!==null)standing=true;
  if(!crouched&&coverImpactFraction(threat,position,
     eyeHeight(false),aimHeight(true),o)!==null)crouched=true;
  if(standing&&crouched)break;
 }
 return {standing,crouched};
}
