/** H11: gameplay-readable NVG shroud for ACH/MICH.
 * One broad mounting silhouette, one protruding receiver and one open-looking
 * rectangular socket. No ornamental tracks, wing perforations, washer stacks
 * or per-frame geometry. Attach once to the real front drape facet.
 */
import * as THREE from 'three';
import type {AchMichCoverShell} from './operator-ach-mich-cover-drape.ts';
import {sampleHelmetCover} from './operator-helmet-surface.ts';

type Pt=readonly [number,number];
const PLATE_OUTLINE:readonly Pt[]=[
 // One tall top lug, an angular wing to either side, and a squared base.
 [-.58,1.48],[.58,1.48],[.94,.83],[.94,.47],
 [1.78,.34],[2.24,.02],[2.24,-.64],[1.78,-.91],
 [.95,-.82],[.95,-1.25],[-.95,-1.25],[-.95,-.82],
 [-1.78,-.91],[-2.24,-.64],[-2.24,.02],[-1.78,.34],
 [-.94,.47],[-.94,.83]
];
const shapeFrom=(points:readonly Pt[])=>{
 const s=new THREE.Shape();
 points.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));
 s.closePath();
 return s;
};
const mesh=(parent:THREE.Group,name:string,geometry:THREE.BufferGeometry,
 material:THREE.Material,x=0,y=0,z=0)=>{
 const result=new THREE.Mesh(geometry,material);
 result.name=name;result.position.set(x,y,z);
 result.castShadow=false;result.receiveShadow=false;
 parent.add(result);return result;
};
/** Batch three intentionally oversized, flat hex fasteners as ONE mesh.
 * No round cylinders or separate hidden washer geometry.
 */
function threeFasteners(parent:THREE.Group,light:THREE.Material){
 const positions:number[]=[];
 const centers:readonly Pt[]=[[0,1.16],[-1.86,-.30],[1.86,-.30]];
 const r=.24,z=.242;
 for(const [cx,cy] of centers)
  for(let side=0;side<6;side++){
   const a=side*Math.PI/3+Math.PI/6;
   const b=(side+1)*Math.PI/3+Math.PI/6;
   positions.push(
    cx,cy,z,
    cx+Math.cos(a)*r,cy+Math.sin(a)*r,z,
    cx+Math.cos(b)*r,cy+Math.sin(b)*r,z
   );
  }
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geo.computeVertexNormals();geo.computeBoundingBox();
 geo.userData.h11FastenerIslands=centers.length;
 const screws=mesh(parent,'three-oversized-nvg-fasteners',geo,light);
 screws.userData.h11FastenerCount=centers.length;
 return screws;
}
/** A single static surface anchor shared across all presentation scales.
 * PASGT retains its separate historical bracket in field-visuals.
 */
export function addAchMichThreeHoleShroud(
 shell:AchMichCoverShell,g:THREE.Group,
 metal:THREE.Material,dark:THREE.Material,light:THREE.Material
):void{
 const f=sampleHelmetCover(shell,'front',0,.26,.16);
 if(!f)throw Error('H11 missing front shroud facet on '+shell);
 const anchor=new THREE.Group();
 anchor.name='h11-iconic-shroud-surface-anchor';
 anchor.position.copy(f.position).addScaledVector(f.normal,.14);
 anchor.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(
  f.right,f.up,f.normal
 ));
 anchor.userData.h9SurfaceNormal=f.normal.toArray();
 anchor.userData.h9UsesCoverFrame=true;
 g.add(anchor);

 // One solid, thick outline; the four recognizable sections are
 // top lug, broad side wings, base, and the raised central receiver.
 // No holes or layered plates cutting down the distant silhouette.
 const plate=new THREE.ExtrudeGeometry(shapeFrom(PLATE_OUTLINE),{
  depth:.22,steps:1,bevelEnabled:false,curveSegments:1
 });
 mesh(anchor,'iconic-three-hole-shroud-plate',plate,dark,0,0,-.025);

 // A bold block, 25% more proud than the old thin receiver. Its
 // large planar front is easy to read even under simple cel shading.
 mesh(anchor,'single-block-nvg-receiver',
  new THREE.BoxGeometry(1.55,1.76,.48),metal,0,-.08,.39);

 // One dark inset rectangle implies the receiver opening without
 // another nested bezel, tiny tracks, bevels, or unseen back faces.
 mesh(anchor,'single-oversized-nvg-socket',
  new THREE.PlaneGeometry(.87,1.08),dark,0,-.08,.637);

 threeFasteners(anchor,light);
 // Larger footprint in screen space, but still follows the draped
 // front normal and stays separate from optional bungees/rails.
 anchor.scale.set(1.28,1.20,1.22);
 anchor.userData.h10GraphicScale=1.28;
 anchor.userData.h9ShroudScrews=3;
 anchor.userData.h9ShroudProfile='graphic-block-wing-lug';
 anchor.userData.h11IconicShroud=true;
 anchor.userData.h11PlateOutlinePoints=PLATE_OUTLINE.length;
 anchor.userData.h11PrimaryPartCount=4;
 anchor.userData.h11NoWingPerforations=true;
 let triangles=0;
 anchor.traverse(o=>{
  if(o instanceof THREE.Mesh){
   const count=o.geometry.index?.count??
    o.geometry.getAttribute('position').count;
   triangles+=Math.floor(count/3);
  }
 });
 anchor.userData.h11TriangleCount=triangles;
}
