/** Authoritative plan-node insertion, used by tactical command owners.
 * Read checks are limited to player knowledge; motor still validates truth. */
import type {Session,TeamActor} from './breach-game.ts';
import type {Pt} from './breach-core.ts';
import {lastPoint,type PlanKind,type PlanNode} from './breach-plan.ts';
import {edit} from './breach-plan-authoring.ts';
import {party,canEdit} from './breach-session-selectors.ts';
import {legalMoveRoute} from './breach-known-route-authoring.ts';
import {routeWithSqueezeIntel} from './breach-squeeze-route.ts';
import {intelPassable,doorKnown} from './breach-intel.ts';
import {SQUEEZE_RADIUS} from './breach-navigation.ts';
const clone=(p:Pt):Pt=>({...p});

export const finalPoint=(a:TeamActor)=>lastPoint(a.p,a.plan);
export function addNode(s:Session,id:string,kind:PlanKind,p:Pt,
  extra:Partial<PlanNode>={}):boolean{
  const a=party(s,id);if(!a||!canEdit(s))return false;
  if(kind==='move'&&!intelPassable(p,s.intel,SQUEEZE_RADIUS))return false;
  if(kind==='move'&&!legalMoveRoute(s,finalPoint(a),p).length)return false;
  if(kind==='door'&&(!extra.doorId||!doorKnown(s.intel,extra.doorId)||
    !intelPassable(p,s.intel,SQUEEZE_RADIUS)||
    !routeWithSqueezeIntel(s.intel,finalPoint(a),p).length))return false;
  return edit(s,a,()=>{
    a.plan.push({id:s.nextId++,kind,p:clone(p),...extra});
  });
}
