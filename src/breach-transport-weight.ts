/** CT11 — one loaded movement policy, evaluated by the fixed-step motor.
 * Values are gameplay tuning, not clinical/real-world load estimates. */
import type {TransportMode} from './breach-casualty-transport.ts';
export const LOADED_MOTION=Object.freeze({
 drag:{speedScale:.48,acceleration:3.8,braking:8.5,turnLoss:.24},
 carry:{speedScale:.38,acceleration:3.0,braking:7.5,turnLoss:.30}
});
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
export function loadedMotorSample(mode:TransportMode,requested:number,unloadedLimit:number,
 velocity:number,dt:number,turn:number){
 const profile=LOADED_MOTION[mode];
 const loss=1-profile.turnLoss*clamp(Math.abs(turn)/Math.PI,0,1);
 const target=Math.max(0,Math.min(requested,unloadedLimit*profile.speedScale)*loss);
 const rate=target>velocity?profile.acceleration:profile.braking;
 const next=velocity+(target-velocity)*clamp(dt*rate,0,1);
 return {target,velocity:Math.max(0,Math.min(next,unloadedLimit*profile.speedScale)),loss};
}
