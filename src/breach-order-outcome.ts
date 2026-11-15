/** D3.16: distinct final tactical truths.
 *
 * Draining a queue != executing every order != physically reaching GO.
 * An explicit locked-door cancellation consumes its authored PlanNode as
 * the player requested, but is never credited as success. Persistent
 * failure accounting comes from the real 60Hz executor, not log text.
 */
export type PhysicalOrderOutcome='arrived'|'cancelled'|'pending'|'unreached';
export type PhysicalOrderEvidence={
 arrived:boolean;remainingOrders:number;failedOrders:number;
};
export function physicalOrderOutcome(e:PhysicalOrderEvidence):PhysicalOrderOutcome{
 if(e.failedOrders>0)return 'cancelled';
 if(e.remainingOrders>0)return 'pending';
 return e.arrived?'arrived':'unreached';
}
export function successfulSquadExecution(
 actors:readonly PhysicalOrderEvidence[]
):boolean{
 return actors.length===4&&actors.every(a=>physicalOrderOutcome(a)==='arrived');
}
