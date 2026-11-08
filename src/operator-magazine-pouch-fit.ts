/** Visible magazines MUST be seated in actual, magazine-purpose textile
 * cells. These metadata entries are authored at the same moment as the
 * rendered pouch boxes, so utility bags and fabricated fallback positions
 * cannot become magazine sockets. Gameplay inventory remains independent.
 *
 * +X faces forward, +Y up, +/-Z outboard. A magazine's lower edge rests at
 * the floor of its dedicated pouch; it is never vertically center-mounted.
 */
import type * as THREE from 'three';

export type MagazinePouchCell={
 x:number;y:number;z:number;
 depth:number;height:number;width:number;
 /** Sideways hip cases may rotate their magazines about Y. */
 yaw?:number;
 /** Only a true multi-mag case has more than one indexed internal slot. */
 slots?:readonly number[];
 /** Which actual depth lane of that multi-mag case is displayed. */
 slot?:number;
};
export type SeatedMagazine={x:number;y:number;z:number;yaw:number};

export function registeredMagazinePouches(group:THREE.Object3D|undefined):
 readonly MagazinePouchCell[]{
 const cells=group?.userData.magazinePouchCells;
 return Array.isArray(cells)?cells as MagazinePouchCell[]:[];
}
/** A shared geometric acceptance rule; no width/height guessing from
 * weapon class. A visible top may stand out of an open mag pouch by at most
 * 1.1 units. Everything else must fit behind its textile front and sides.
 */
export function seatMagazineInPouch(
 bounds:THREE.Box3,pouch:MagazinePouchCell,slot=0
):SeatedMagazine|null{
 if(bounds.isEmpty())return null;
 const yaw=pouch.yaw??0,c=Math.cos(yaw),s=Math.sin(yaw);
 let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;
 for(const x of [bounds.min.x,bounds.max.x])
  for(const z of [bounds.min.z,bounds.max.z]){
   const rx=x*c+z*s,rz=-x*s+z*c;
   minX=Math.min(minX,rx);maxX=Math.max(maxX,rx);
   minZ=Math.min(minZ,rz);maxZ=Math.max(maxZ,rz);
  }
 const width=maxZ-minZ,depth=maxX-minX,height=bounds.max.y-bounds.min.y;
 // No projecting a wide magazine through a tiny radio/admin pocket.
 if(width>pouch.width-.12||depth>pouch.depth-.12)return null;
 const bottom=pouch.y-pouch.height*.5+.12;
 const top=bottom+height;
 if(top>pouch.y+pouch.height*.5+1.10)return null;
 // One case may hold multiple real magazines, in genuinely separate
 // depthwise lanes. Never stack two models on exactly the same socket.
 const lane=pouch.slots?.[pouch.slot??slot]??0;
 const insideBack=pouch.x-pouch.depth*.5+.10;
 const insideFront=pouch.x+pouch.depth*.5-.10;
 const centerX=(insideBack+insideFront)*.5+lane;
 const originX=centerX-(minX+maxX)*.5;
 if(originX+minX<insideBack-.001||originX+maxX>insideFront+.001)
  return null;
 return {x:originX,y:bottom-bounds.min.y,
  z:pouch.z-(minZ+maxZ)*.5,yaw};
}
