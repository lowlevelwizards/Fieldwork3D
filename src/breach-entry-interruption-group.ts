/** D3.30E: narrowly tie generated follower gates to an actually witnessed
 * interrupted entry at their own physical threshold. This never moves a
 * unit, changes a manual order, unlocks a leaf or probes hidden geometry.
 */
import type {Session,TeamActor} from './breach-game.ts';
export function generatedEntryInterruptedByTeammate(
 s:Session,waiting:TeamActor,doorId:string
):boolean{
 return s.operators.some(peer=>{
  if(peer.id===waiting.id||peer.side!==waiting.side||peer.health<=0)
   return false;
  const incident=peer.interruptedDoorPlan;
  if(incident?.doorId!==doorId)return false;
  // Only a generated entry crossing, never an unrelated authored MOVE.
  return incident.original.some(order=>
   order.kind==='move'&&order.entryDoorId===doorId||
   order.kind==='wait'&&order.duration===0&&order.doorId===doorId);
 });
}
