/** EB2: single auditable pressure policy. Separate high-level intent,
 * contact action and injury/resolve thresholds are retained in this first
 * extraction to preserve exact existing outcomes. Later EB behavior work
 * must prove any threshold unification with real-session witnesses. */
export type Temperament='guard'|'aggressor'|'cautious';
const thresholds={
 guard:{intentDefend:.35,intentWithdraw:.67,intentMorale:.62,contactHold:.55,contactWithdraw:.72,contactMorale:.62,courage:0},
 cautious:{intentDefend:.27,intentWithdraw:.56,intentMorale:.70,contactHold:.41,contactWithdraw:.59,contactMorale:.70,courage:-.09},
 aggressor:{intentDefend:.48,intentWithdraw:.79,intentMorale:.43,contactHold:.67,contactWithdraw:.84,contactMorale:.42,courage:.12}
} as const;
export const npcPressurePolicy=(temperament:Temperament='guard')=>thresholds[temperament];
