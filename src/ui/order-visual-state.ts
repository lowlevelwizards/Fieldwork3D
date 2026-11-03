import {interruptsWatch,type PlanNode,type FirePolicy} from '../breach-plan.ts';
/** Pure, ordered state transitions for route overlays and previews.
 * The segment LEADING TO a waypoint uses 'before'; the waypoint applies
 * its new state AFTER arrival, on subsequent segments. This mirrors the
 * existing execution order and never uses unseen world state.
 */
export type VisualScope={
  watch:boolean;pace:'walk'|'run';posture:'stand'|'crouch';fire:FirePolicy;
};
export type OrderVisualStep={
  nodeId:number;before:VisualScope;after:VisualScope;
  watchBegins:boolean;watchEnds:boolean;
  suppressionPoint:{x:number;y:number}|null;
};
export function orderVisualScopes(
  plan:readonly PlanNode[],
  initial:VisualScope
):OrderVisualStep[]{
  let scope={...initial};
  return plan.map(node=>{
    const before={...scope};
    if(node.paceState)scope.pace=node.paceState;
    if(interruptsWatch(node,scope.pace))scope.watch=false;
    else if(node.aimMode==='track')scope.watch=true;
    else if(node.aimMode==='free'||node.aimMode==='fixed')scope.watch=false;
    if(node.postureState)scope.posture=node.postureState;
    if(node.firePolicyState)scope.fire=node.firePolicyState;
    const after={...scope};
    return {nodeId:node.id,before,after,
      watchBegins:!before.watch&&after.watch,
      watchEnds:before.watch&&!after.watch,
      suppressionPoint:node.firePolicyState==='suppress'&&node.firePoint?
        {...node.firePoint}:null};
  });
}
