/** Low-poly arm/plate clearance score. Render-only; the tactical
 * motor, weapon-contact point and ballistic muzzle remain authoritative.
 * Evaluate the whole sleeve segments, not merely the elbow joint. */
export type ArmPoint={x:number;y:number;z:number};
export function armorArmIntrusion(shoulder:ArmPoint,elbow:ArmPoint,
 wrist:ArmPoint,front=9.3):number{
 let depth=0;
 const segment=(a:ArmPoint,b:ArmPoint,ts:readonly number[])=>{
  for(const t of ts){
   const x=a.x+(b.x-a.x)*t;
   const y=a.y+(b.y-a.y)*t;
   const z=a.z+(b.z-a.z)*t;
   // Arms may start at their shoulder socket inside the shoulder pad.
   // Penalize sleeves passing through the CENTRAL front plate volume.
   if(x>-5.3&&x<front&&y>-7&&y<6.7&&Math.abs(z)<7.2)
    depth+=Math.min(front-x,4.5)*(7.2-Math.abs(z))*.14;
  }
 };
 segment(shoulder,elbow,[.45,.68,.90]);
 segment(elbow,wrist,[.12,.34,.56,.78]);
 return depth;
}
export function armorElbowPole(shoulder:ArmPoint,side:-1|1,
 variant:0|1|2=0):ArmPoint{
 // Favor a forward, outward bent elbow; the forearm then crosses IN
 // FRONT of the carrier rather than tunnelling through the plate pocket.
 const x=[11.7,13.2,10.2][variant];
 const y=[-5.4,-7.5,-3.6][variant];
 const z=side*[10.3,12.2,13.4][variant];
 return {x:x-shoulder.x,y:y-shoulder.y,z:z-shoulder.z};
}
