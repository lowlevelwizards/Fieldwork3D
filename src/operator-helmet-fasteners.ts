/** One visual fastener vocabulary for NVG and ACH-ARC fittings.
 * Flat filled hexes have no hidden cylinder sides, washers or bevel loops.
 */
import * as THREE from 'three';
export function helmetHexFastenerGeometry(
 centers:readonly (readonly [number,number])[],
 radius=.24,z=.24
):THREE.BufferGeometry{
 const positions:number[]=[];
 for(const [cx,cy] of centers)
  for(let edge=0;edge<6;edge++){
   const a=edge*Math.PI/3+Math.PI/6,b=a+Math.PI/3;
   positions.push(cx,cy,z,
    cx+Math.cos(a)*radius,cy+Math.sin(a)*radius,z,
    cx+Math.cos(b)*radius,cy+Math.sin(b)*radius,z);
  }
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 g.computeVertexNormals();g.computeBoundingBox();
 g.userData.h13FastenerStyle='flat-hex';
 g.userData.h13FastenerCount=centers.length;
 return g;
}
