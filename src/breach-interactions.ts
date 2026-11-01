/** LW-01: one physical capability gate for player and autonomous actions.
 * Querying a capability never alters a world object or leaks remote intel.
 */
import type {Door,Pt} from './breach-core.ts';
import {doorReachable} from './breach-door.ts';
export type InteractionAction='open'|'close'|'hold'|'kick'|'push'|'inspect';
export type InteractionFailure='out-of-reach'|'already-open'|'already-closed'|
 'held'|'unsupported'|'locked'|'obstructed';
export type InteractionVerdict={allowed:boolean;reason:InteractionFailure|null};
export type InteractionRequest={action:InteractionAction;actorId:string;
 actorPosition:Pt;target:Door};
const allowed:InteractionVerdict={allowed:true,reason:null};
const deny=(reason:InteractionFailure):InteractionVerdict=>({allowed:false,reason});
export function doorInteraction(request:InteractionRequest):InteractionVerdict{
 const {action,actorId,actorPosition,target:d}=request;
 if(!doorReachable(actorPosition,d))return deny('out-of-reach');
 if(action==='inspect')return allowed;
 if(action==='kick'&&d.kind==='shutter')return deny('unsupported');
 if(action==='open'&&d.open)return deny('already-open');
 if((action==='open'||action==='kick')&&d.wedged)return deny('obstructed');
 if(action==='open'&&d.jammed)return deny('obstructed');
 if(action==='open'&&d.locked)return deny('locked');
 if(action==='close'&&!d.open)return deny('already-closed');
 if(action==='hold'&&d.open)return deny('already-open');
 if((action==='open'||action==='push')&&d.heldBy&&d.heldBy!==actorId)
   return deny('held');
 if(action==='push'&&!d.open)return deny('already-closed');
 if(action==='hold'&&d.heldBy&&d.heldBy!==actorId)return deny('held');
 return allowed;
}
/** Stable physical object IDs are shared across the viewport and simulation. */
export const worldObjectId=(kind:'door'|'window'|'prop',id:string)=>
 kind+':'+id;
