/** Offline-only results from actual fixed-step Sessions. A zero response
 * when nobody perceives evidence is expected, not a fabricated failure.
 */
export type EncounterMatrixRow={
 mission:string;population:{activeHostiles:number;activeCivilians:number};
 hostiles:{coordinatedActors:number;retreatingActors:number;
  objectiveDefenseActorSeconds:number;initialDoctrineActors:Record<string,number>;
  investigationsStarted:number;investigationsWithoutProgress:number};
 combat:{shots:number;surrenderedHostiles:number};
 stimulus:{injected:boolean};
};
export function summarizeEncounterMatrix(rows:readonly EncounterMatrixRow[]){
 const missions:Record<string,{seeds:number;hostiles:number;civilians:number;
  coordinated:number;defenseSeconds:number;investigations:number;
  stalled:number;retreats:number;surrenders:number;shots:number;stimuli:number}>={};
 const doctrines:Record<string,number>={};
 for(const row of rows){
  const m=missions[row.mission]??={seeds:0,hostiles:0,civilians:0,
   coordinated:0,defenseSeconds:0,investigations:0,
   stalled:0,retreats:0,surrenders:0,shots:0,stimuli:0};
  m.seeds++;m.hostiles+=row.population.activeHostiles;
  m.civilians+=row.population.activeCivilians;
  m.coordinated+=row.hostiles.coordinatedActors;
  m.defenseSeconds+=row.hostiles.objectiveDefenseActorSeconds;
  m.investigations+=row.hostiles.investigationsStarted;
  m.stalled+=row.hostiles.investigationsWithoutProgress;
  m.retreats+=row.hostiles.retreatingActors;
  m.surrenders+=row.combat.surrenderedHostiles;
  m.shots+=row.combat.shots;
  m.stimuli+=Number(row.stimulus.injected);
  for(const [doctrine,n] of Object.entries(row.hostiles.initialDoctrineActors))
   doctrines[doctrine]=(doctrines[doctrine]??0)+n;
 }
 return {missions,doctrines,seedCount:rows.length,
  caveat:'Observed simulation outcomes. No contact and no reaction can be valid.'};
}
