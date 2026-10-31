/** 127: shared deterministic foot articulation for live, Lab, replay.
 * Pitch is rotation around the boot's local Z axis; toe points local +X.
 */
import type {FootPhase} from './breach-footsteps.ts';
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
const smooth=(v:number)=>{const t=clamp(v);return t*t*(3-2*t);};
export function footArticulation(phase:FootPhase,progress:number){
 const t=clamp(progress);
 switch(phase){
  case 'unloading':return {pitch:-.20*smooth(t),rise:.18*smooth(t)};
  case 'swinging':return {pitch:-.20*(1-smooth(t))+
    .16*smooth(t),rise:Math.sin(Math.PI*t)};
  case 'landing':return {pitch:.16*(1-smooth(t)),rise:0};
  case 'recovering':return {pitch:0,rise:0};
  default:return {pitch:0,rise:0};
 }
}
