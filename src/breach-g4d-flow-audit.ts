/** G4d: retrospective mission-flow report, never AI/renderer input.
 * Quiet or no-contact trials are valid tactical outcomes, not automatic fails. */
export type G4DFlowRow={
 seed:number;mission:string;mode:string;orders:number;
 duration:number;friendlyTravel:number;hostileTravel:number;
 firstContactAt:number|null;firstShotAt:number|null;
 reason:string;blockedFrames:number;blockedReasons?:Record<string,number>;
 invalidPositions:number;
 replayIssues:string[];p95HostSimMs:number;
};
export function summarizeG4DFlows(rows:readonly G4DFlowRow[]){
 const byMission:Record<string,{trials:number;contact:number;shots:number;
  stalled:number;invalid:number;meanTravel:number}>={};
 for(const row of rows){
  const entry=byMission[row.mission]??(byMission[row.mission]={
   trials:0,contact:0,shots:0,stalled:0,invalid:0,meanTravel:0
  });
  entry.trials++;
  entry.contact+=Number(row.firstContactAt!==null);
  entry.shots+=Number(row.firstShotAt!==null);
  entry.stalled+=Number(row.orders>0&&row.reason==='movement-stalled');
  entry.invalid+=Number(row.invalidPositions>0||row.replayIssues.length>0);
  entry.meanTravel+=row.friendlyTravel;
 }
 for(const entry of Object.values(byMission))
  entry.meanTravel=Math.round(entry.meanTravel/entry.trials*10)/10;
 return {trials:rows.length,
  modes:[...new Set(rows.map(r=>r.mode))].sort(),
  invalid:rows.filter(r=>r.invalidPositions>0||r.replayIssues.length).length,
  unaccepted:rows.filter(r=>r.orders===0).length,
  lowMovement:rows.filter(r=>r.orders>0&&
   r.reason==='movement-stalled').length,
  blockedFrames:rows.reduce((sum,r)=>sum+r.blockedFrames,0),
  noContact:rows.filter(r=>r.firstContactAt===null).length,
  byMission};
}
