/** Build 133: deterministic lightweight spent-cartridge and surface effects. */
import type {WeaponId} from './breach-combat.ts';
export type EjectedCasing={
 id:number;at:number;weapon:WeaponId;side:'blue'|'red';
 x:number;z:number;y:number;heading:number;
};
const hash=(n:number)=>((Math.imul(n^0x9e3779b9,1664525)+1013904223)>>>0)/4294967296;
export const CASING_LIMIT=192;
export function casingAt(c:EjectedCasing,time:number){
 const t=Math.max(0,time-c.at);
 const a=c.heading+Math.PI/2+(hash(c.id)*.5-.25);
 const speed=10+hash(c.id+12)*9;
 const flight=Math.min(t,.85);
 const along=speed*flight;
 const height=Math.max(.8,c.y+15*flight-36*flight*flight);
 const bounce=Math.max(0,Math.sin(Math.max(0,t-.85)*19))*
   Math.max(0,2.4-(t-.85)*3);
 return {x:c.x+Math.cos(a)*along,
   z:c.z+Math.sin(a)*along,y:height+bounce,
   settled:t>=1.7,rotation:c.id*1.37+Math.min(t,1.7)*10};
}
export const impactProfile=(surface:'blood'|'wood'|'metal'|'stone'|'dust')=>
 surface==='metal'?{count:5,spread:13,lifetime:.24,color:0xffd298}:
 surface==='wood'?{count:4,spread:11,lifetime:.42,color:0xbf9d77}:
 surface==='stone'?{count:6,spread:12,lifetime:.36,color:0xaaa8a1}:
 surface==='blood'?{count:3,spread:8,lifetime:.28,color:0xab5b52}:
 {count:3,spread:7,lifetime:.31,color:0xb0a797};
