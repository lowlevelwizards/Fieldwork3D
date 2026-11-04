/** Authoritative garment contact surfaces shared by the VISIBLE torso
 * mesh author and armor socket solver. Chest-local: +X front, +/-Z sides.
 * These are the ACTUAL BOXES rendered, not the former aspirational fit rings.
 * Blouses add collar/pockets to the core chest without replacing its shell.
 * The few compressible pockets are excluded from contact by design.
 */
export type GarmentContactBox=Readonly<{
 x:number;y:number;z:number;width:number;height:number;depth:number
}>;
export const CORE_TORSO_CONTACT:GarmentContactBox={
 x:0,y:0,z:0,width:10,height:12,depth:14
};
export const VISIBLE_UPPER_CONTACT:Readonly<Record<string,
 readonly GarmentContactBox[]>>={
 'combat-shirt':[{x:0,y:0,z:0,width:10.22,height:12.22,depth:14.22}],
 'smock-jacket':[
  {x:0,y:0,z:0,width:11.18,height:12.52,depth:15.05},
  {x:0,y:-8.05,z:0,width:11.64,height:4.28,depth:15.35}
 ],
 'gorka-jacket':[
  {x:0,y:-.98,z:0,width:11.45,height:15.70,depth:15.10}
 ]
};
/** Surface box at the given torso height; never expand a vest around a
 * non-existent BDU/ACU loft profile. At hems, clamp to nearest visible
 * torso shell so the armor can finish just below the shirt naturally.
 */
export function contactBoxAt(top:string,y:number):GarmentContactBox{
 const boxes=VISIBLE_UPPER_CONTACT[top]??[CORE_TORSO_CONTACT];
 return boxes.find(b=>y>=b.y-b.height*.5&&y<=b.y+b.height*.5) ??
  boxes.reduce((best,b)=>{
   const dist=(o:GarmentContactBox)=>Math.max(0,
    Math.abs(y-o.y)-o.height*.5);
   return dist(b)<dist(best)?b:best;
  },boxes[0]);
}
export type GarmentContactAnchor=Readonly<{
 y:number;front:number;back:number;side:number;topY:number
}>;
export function garmentContactAnchor(top:string,y:number):GarmentContactAnchor{
 const b=contactBoxAt(top,y);
 return {y,front:b.x+b.width*.5,back:b.x-b.width*.5,
  side:Math.abs(b.z)+b.depth*.5,topY:b.y+b.height*.5};
}
/** Four cardinal visual contact points for diagnostics. Keep normals
 * simple and explicit so bag interiors and webbing sit on the surface. */
export function garmentContactPoint(top:string,
 face:'front'|'back'|'left'|'right'|'shoulder',
 y:number,offset=0):readonly [number,number,number]{
 const b=contactBoxAt(top,y);
 if(face==='front')return [b.x+b.width*.5+offset,y,0];
 if(face==='back')return [b.x-b.width*.5-offset,y,0];
 if(face==='left')return [b.x,y,-(b.depth*.5+offset)];
 if(face==='right')return [b.x,y,b.depth*.5+offset];
 return [b.x,b.y+b.height*.5+offset,0];
}
