/** Four intentionally nonfunctional, exaggerated exterior miniatures.
 * Local art-space only; no mechanical or real-world fabrication data.
 * Existing game anchors and materials remain externally owned.
 */
import * as THREE from 'three';
import {addCuboid,addOutline,addProfileFrame,type Outline} from './profile-primitives.ts';
import {G36_RUBBER} from './weapon-visual-palette.ts';
type Kind='fixed'|'classic'|'sopmod'|'moe';
export function arStockArtKind(id:string):Kind{
 return id==='ar-fixed'||id==='ar-fixed-a2'?'fixed':
 id==='ar-car'||id==='ar-stock-m4'?'classic':
 id==='ar-stock-moe'?'moe':'sopmod';
}
export function addARStockCaricature(root:THREE.Group,id:string,
 steel:THREE.Material,dark:THREE.Material,tan:THREE.Material){
 const kind=arStockArtKind(id);
 // Retain historical game contact extents for legacy appearance aliases.
 const rear=id==='ar-fixed'?-13.845:id==='ar-fixed-a2'?-14.405:
  id==='ar-car'?-14.515:id==='ar-stock-m4'?-14.25:-13.85;
 const front=kind==='fixed'?-6.02:-8.4;
 const x=(u:number)=>rear+(front-rear)*u;
 const points=(p:Outline):Outline=>p.map(([u,y])=>[x(u),y]);
 let n=0;
 // A single stylized broad, beveled form; no moving or internal components.
 function sculpt(p:Outline,depth:number,bevel:number,mat:THREE.Material){
  const shape=new THREE.Shape();const outline=points(p);
  shape.moveTo(...outline[0]);for(const q of outline.slice(1))shape.lineTo(...q);
  shape.closePath();
  const g=new THREE.ExtrudeGeometry(shape,{depth:depth-bevel*2,steps:1,
   bevelEnabled:true,bevelSegments:1,bevelSize:bevel,bevelThickness:bevel,curveSegments:1});
  g.translate(0,0,-(depth-bevel*2)/2);
  const mesh=new THREE.Mesh(g,mat);mesh.name='family-stock-'+id+'-'+n++;
  mesh.userData.arStockCaricature=kind;mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);
 }
 if(kind==='fixed'){
  sculpt([[.09,1.08],[.53,1.02],[.96,.76],[.96,-.90],[.46,-2.54],[.10,-3.88]],
   3.0,.23,dark);
 }else{
  addCuboid(root,'stock',id,n++,-7.65,.35,0,4.2,1.45,1.9,steel);
  if(kind==='classic'){
   sculpt([[.13,1.20],[.36,1.34],[.85,.99],[.94,-.65],[.48,-2.65],[.12,-3.73]],
    3.0,.17,dark);
  }else if(kind==='sopmod'){
   sculpt([[.14,1.34],[.39,1.49],[.85,1.12],[.94,-.70],[.50,-2.15],[.12,-3.66]],
    4.15,.32,tan);
  }else{
   // Deliberately graphic open-frame gesture for the fictional miniature.
   const outer=points([[.08,1.18],[.90,1.04],[.99,-.45],[.43,-2.86],[.15,-3.65],[.07,-3.40]]);
   const hole=points([[.26,-.37],[.69,-.30],[.30,-2.29]]);
   const m=addProfileFrame(root,'stock',id,n++,outer,hole,2.9,dark);
   m.userData.arStockCaricature=kind;
  }
  // Oversized static visual token for the adjustment control, not a mechanism.
  const m=addOutline(root,'stock',id,n++,points([[.51,-1.65],[.87,-1.48],[.88,-2.17],[.55,-2.38]]),2.0,dark);
  m.userData.arStockDecorativeLatch=true;
 }
 // Deliberately bold rubber-colored visual band; rear remains at game anchor.
 const pad=addCuboid(root,'stock',id,n++,rear+.24,-1.40,0,.48,5.0,
  kind==='sopmod'?4.05:3.18,G36_RUBBER);
 pad.userData.arStockDecorativePad=true;
}
