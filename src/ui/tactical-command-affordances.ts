/** C4: read-only toolbar and authoring affordance eligibility.
 * Actual orders must still be validated by the existing game/domain APIs.
 * Use the same snapshot for disabled styling and click-time guards.
 */
export type TacticalUiActionInput={
  phase:string;replaying:boolean;actorHealth:number|null;
  planCount:number;undoCount:number;redoCount:number;
  flashRemaining:number;targetingArmed:boolean;activeWatchSelected:boolean;
};
export type TacticalUiActionAvailability={
  canAuthor:boolean;back:boolean;clear:boolean;undo:boolean;
  redo:boolean;wait:boolean;flash:boolean;sync:boolean
};
export function tacticalUiActionAvailability(
  input:TacticalUiActionInput
):TacticalUiActionAvailability{
  const canAuthor=input.phase==='planning'&&!input.replaying&&
    input.actorHealth!==null&&input.actorHealth>0;
  return {
    canAuthor,
    back:canAuthor&&(input.targetingArmed||input.activeWatchSelected||
      input.planCount>0),
    clear:canAuthor&&input.planCount>0,
    undo:canAuthor&&input.undoCount>0,
    redo:canAuthor&&input.redoCount>0,
    wait:canAuthor,
    flash:canAuthor&&input.flashRemaining>0,
    sync:canAuthor
  };
}
