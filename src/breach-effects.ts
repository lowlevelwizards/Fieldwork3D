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
 const floor=.82,gravity=110,up=16;
 const landing=(up+Math.sqrt(up*up+2*gravity*Math.max(0,c.y-floor)))/gravity;
 const travel=Math.min(t,landing+.26);
 const along=speed*(1-Math.exp(-travel*2))*.72;
 const air=Math.max(floor,c.y+up*travel-gravity*.5*travel*travel);
 const after=Math.max(0,t-landing);
 const bounce=after<.5?Math.abs(Math.sin(after*22))*2.1*
   Math.pow(Math.max(0,1-after/.5),2):0;
 const settled=after>=.5;
 return {x:c.x+Math.cos(a)*along,z:c.z+Math.sin(a)*along,
   y:t<landing?air:floor+bounce,
   settled,rotation:c.id*1.37+Math.min(t,landing+.5)*10};
}
export const impactProfile=(surface:'blood'|'wood'|'metal'|'stone'|'dust')=>
 surface==='metal'?{count:5,spread:13,lifetime:.24,color:0xffd298}:
 surface==='wood'?{count:4,spread:11,lifetime:.42,color:0xbf9d77}:
 surface==='stone'?{count:6,spread:12,lifetime:.36,color:0xaaa8a1}:
 surface==='blood'?{count:3,spread:8,lifetime:.28,color:0xab5b52}:
 {count:3,spread:7,lifetime:.31,color:0xb0a797};
