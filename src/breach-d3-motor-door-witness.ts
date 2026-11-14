/** D3.2 diagnostic seam: real door-selected witness, never a motor input.
 * No persistent actor field or per-frame world query; disabled in gameplay.
 */
import type {TeamActor} from './breach-game.ts';
let enabled=false;
const selected=new WeakMap<TeamActor,{id:string;at:number}>();
export function enableD32MotorDoorWitness(on:boolean):void{enabled=on;}
export function noteD32MotorDoorSelection(a:TeamActor,id:string,at:number):void{
 if(enabled)selected.set(a,{id,at});
}
export function selectedD32MotorDoor(a:TeamActor,at:number):string|null{
 const entry=enabled?selected.get(a):null;
 return entry?.at===at?entry.id:null;
}
