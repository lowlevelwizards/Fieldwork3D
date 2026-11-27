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
 const paint=kind==='sopmod'?tan:dark;
 // Broad symbolic art masses, deliberately nonfunctional; the decorative
 // tokens have no interaction, joints, bores or real-world fitment.
 function sculpt(p:Outline,depth:number,bevel:number,mat:THREE.Material,tag:string,taper=0){
  const shape=new THREE.Shape(),outline=points(p);
  shape.moveTo(...outline[0]);for(const q of outline.slice(1))shape.lineTo(...q);
  shape.closePath();
  const g=new THREE.ExtrudeGeometry(shape,{depth:depth-bevel*2,steps:1,
   bevelEnabled:true,bevelSegments:1,bevelSize:bevel,bevelThickness:bevel,curveSegments:1});
  g.translate(0,0,-(depth-bevel*2)/2);
  if(taper){
   const pos=g.getAttribute('position');
   for(let i=0;i<pos.count;i++){
    const u=THREE.MathUtils.clamp((pos.getX(i)-rear)/(front-rear),0,1);
    pos.setZ(i,pos.getZ(i)*(1-taper*u));
   }
   pos.needsUpdate=true;g.computeVertexNormals();
  }
  const mesh=new THREE.Mesh(g,mat);mesh.name='family-stock-'+id+'-'+n++;
  mesh.userData[tag]=kind;mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);
 }
 function flat(p:Outline,depth:number,mat:THREE.Material,tag:string){
  const m=addOutline(root,'stock',id,n++,points(p),depth,mat);
  m.userData[tag]=kind;
 }
 if(kind==='fixed'){
  // Higher continuous molded toy silhouette and a slightly tapered volume.
  sculpt([[.08,1.43],[.60,1.46],[1,1.30],[1,-.72],[.43,-2.52],[.08,-3.72]],
   3.23,.18,dark,'arStockCaricature',.25);
  flat([[0,1.57],[.12,1.57],[.12,-3.87],[0,-3.87]],3.26,G36_RUBBER,'arStockDecorativePad');
 }else{
  addCuboid(root,'stock',id,n++,-7.65,.35,0,4.2,1.45,1.9,steel);
  const moe=kind==='moe',sop=kind==='sopmod';
  if(moe){
   // Open graphic A gesture, with a large static accent within its opening.
   const outer=points([[.08,1.66],[.98,1.66],[1.08,-.62],[.48,-3.45],[.14,-4.25],[.08,-3.94]]);
   const hole=points([[.25,-.30],[.80,-.30],[.28,-2.95]]);
   const m=addProfileFrame(root,'stock',id,n++,outer,hole,3.1,paint);
   m.userData.arStockCaricature=kind;
   sculpt([[.09,1.52],[.99,1.52],[1.04,-.14],[.10,-.14]],
    3.44,.12,paint,'arStockUpperMass',.08);
   flat([[.35,-1.98],[.65,-.65],[.76,-.81],[.45,-2.16]],
    1.9,G36_RUBBER,'arStockDecorativeLatch');
   flat([[0,1.68],[.14,1.68],[.14,-4.25],[0,-4.08]],3.32,G36_RUBBER,'arStockDecorativePad');
  }else{
   // Contrasting slim graphic underside and dominant straight upper volume.
   flat([[.08,.05],[.94,.05],[.48,-2.72],[.10,-3.78]],sop?2.2:1.85,paint,'arStockCaricature');
   sculpt([[.08,1.46],[.99,1.46],[1.02,-.13],[.09,-.13]],
    sop?4.25:3.05,sop?.34:.15,paint,'arStockUpperMass',sop?.18:.06);
   flat([[.47,-2.62],[.82,-.94],[.95,-1.11],[.60,-2.82]],
    sop?1.9:1.7,G36_RUBBER,'arStockDecorativeLatch');
   flat([[0,1.58],[.14,1.58],[.14,-3.84],[0,-3.84]],sop?3.95:3.11,G36_RUBBER,'arStockDecorativePad');
  }
 }
}
