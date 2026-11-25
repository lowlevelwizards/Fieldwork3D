/** Shared authored target panel dimensions; also consumed by impact attachment.
 * Geometry only: no hit, scoring, or simulation authority. */
export type TargetPanel={x:number;y:number;z:number;w:number;h:number;d:number;ink:boolean};
export function targetVisualPanels(width:number,noShoot:boolean):TargetPanel[]{
 const parts:TargetPanel[]=[
  {x:0,y:44,z:0,w:9,h:9,d:3,ink:false},
  {x:0,y:29,z:0,w:Math.min(width,18),h:20,d:3,ink:false}
 ];
 for(const side of [-1,1])parts.push(
  {x:side*10.5,y:27,z:0,w:4,h:16,d:3,ink:false},
  {x:side*4.5,y:12,z:0,w:6,h:14,d:3,ink:false});
 parts.push({x:0,y:30,z:2,w:8,h:8,d:.8,ink:true});
 if(noShoot)for(const y of [36,25])parts.push({x:0,y,z:2.8,w:15,h:2,d:1,ink:true});
 return parts;
}
