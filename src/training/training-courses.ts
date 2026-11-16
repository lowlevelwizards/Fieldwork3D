/** Authored, nonpersistent training configurations. No separate simulation. */
import type {LightingMode} from '../equipment-site-lighting.ts';
export const TRAINING_LAYOUTS=['linear','branch','hall','compound'] as const;
export type TrainingLayout=typeof TRAINING_LAYOUTS[number];
export type TrainingActivity='range'|'killhouse';
export type TrainingTargetDensity='none'|'sparse'|'standard'|'dense';
export type TrainingDoorPreset='open'|'closed'|'mixed';
export type TrainingConfig={
 activity:TrainingActivity;layout:TrainingLayout;squadSize:1|2|3|4;
 targetDensity:TrainingTargetDensity;doors:TrainingDoorPreset;
 lighting:LightingMode;
};
export const DEFAULT_TRAINING_CONFIG:Readonly<TrainingConfig>=Object.freeze({
 activity:'killhouse',layout:'hall',squadSize:4,
 targetDensity:'standard',doors:'closed',lighting:'day'
});
export const TRAINING_LAYOUT_LABELS:Record<TrainingLayout,string>={
 linear:'LINEAR',branch:'BRANCHING',hall:'CENTRAL HALL',compound:'COMPOUND'
};
export function normalizeTrainingConfig(config:Partial<TrainingConfig>):TrainingConfig{
 const squad=config.squadSize;
 return {
  activity:config.activity==='range'?'range':'killhouse',
  layout:TRAINING_LAYOUTS.includes(config.layout as TrainingLayout)?
   config.layout!:'hall',
  squadSize:squad===1||squad===2||squad===3||squad===4?squad:4,
  targetDensity:['none','sparse','standard','dense'].includes(config.targetDensity??'')?
   config.targetDensity!:'standard',
  doors:['open','closed','mixed'].includes(config.doors??'')?config.doors!:'closed',
  lighting:['day','evening','night','blackout','emergency'].includes(config.lighting??'')?
   config.lighting!:'day'
 };
}
