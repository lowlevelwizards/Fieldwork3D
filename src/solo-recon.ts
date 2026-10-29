/** A single embodied field observation, separate from the war simulation. */
import {FIRST_PLACE,YARD_EQUIPMENT} from './first-place-layout.ts';
export type ReconStage='inspect'|'return'|'complete';
export type ReconState={stage:ReconStage};
export type Position={x:number;z:number};
const sensor=YARD_EQUIPMENT.find(p=>p.type==='sensor')!;
const close=(a:Position,b:Position,r:number)=>Math.hypot(a.x-b.x,a.z-b.z)<=r;
export const createRecon=():ReconState=>({stage:'inspect'});
export function reconView(state:ReconState,at:Position){
  if(state.stage==='complete')return {title:'Field notes secured',
    detail:'The road back is open. The station is quiet.',action:null};
  if(state.stage==='return')return {title:'Return through the gate',
    detail:'Carry the readings east, through the opening in the fence.',action:null};
  const nearby=close(at,sensor,2.8);
  return {title:'Find the weather station',
    detail:nearby?'The instrument is within reach. Read its field log.':
      'A recording instrument stands beside the south service track.',
    action:nearby?'READ FIELD LOG':null};
}
export function advanceRecon(state:ReconState,at:Position,interact=false):ReconState{
  if(state.stage==='inspect'&&interact&&close(at,sensor,2.8))
    return {stage:'return'};
  if(state.stage==='return'&&at.x>FIRST_PLACE.gate.x+2.2&&
    Math.abs(at.z-FIRST_PLACE.gate.z)<7)return {stage:'complete'};
  return state;
}
