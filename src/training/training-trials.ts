/** K1.5: stable authored course contracts; gameplay uses existing Session. */
import type {TrainingConfig,TrainingLayout,TrainingTargetDensity} from './training-courses.ts';
import type {LightingMode} from '../equipment-site-lighting.ts';
export const TRIAL_IDS=['discrimination','room','squad','blackout'] as const;
export type TrialId=typeof TRIAL_IDS[number];
export type TrialDefinition=Readonly<{
 id:TrialId;version:1;name:string;
 squadSize:1|2|3|4;layout:TrainingLayout;
 targetDensity:TrainingTargetDensity;lighting:LightingMode;
 goal:'targets'|'room'|'squad';maxSeconds:number;
 noShootSlots:readonly number[];
}>;
export const TRIALS:Readonly<Record<TrialId,TrialDefinition>>={
 discrimination:{id:'discrimination',version:1,name:'TARGET DISCRIMINATION',
  squadSize:1,layout:'hall',targetDensity:'dense',lighting:'day',
  goal:'targets',maxSeconds:180,noShootSlots:[1,4]},
 room:{id:'room',version:1,name:'SINGLE-ROOM EXERCISE',
  squadSize:1,layout:'linear',targetDensity:'sparse',lighting:'day',
  goal:'room',maxSeconds:180,noShootSlots:[]},
 squad:{id:'squad',version:1,name:'SQUAD COORDINATION',
  squadSize:4,layout:'compound',targetDensity:'dense',lighting:'day',
  goal:'squad',maxSeconds:300,noShootSlots:[3]},
 blackout:{id:'blackout',version:1,name:'LOW-LIGHT COURSE',
  squadSize:2,layout:'branch',targetDensity:'standard',lighting:'blackout',
  goal:'targets',maxSeconds:240,noShootSlots:[2]}
};
export function trialConfig(id:TrialId):TrainingConfig{
 const t=TRIALS[id];return {activity:'killhouse',layout:t.layout,
  targetDensity:t.targetDensity,doors:'closed',lighting:t.lighting,
  squadSize:t.squadSize};
}
