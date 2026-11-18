/** G36 O2 — user-selected 125 / 125 / 55 dual-optic miniature.
 * Production-only factory art, derived from the approved O2 three-angle JS
 * study. No simulated mechanisms or runtime geometry mutation. R1 intentionally
 * lifts the factory visual housings and matching sight contact datums together. Main and hood use six broad facets; ocular sleeves use
 * eight (lower) and six (upper), with just one dark face each.
 */
import * as THREE from 'three';

type Section=readonly (readonly [number,number])[];
type PartKind='g36LowerOptic'|'g36UpperReflex'|'g36LowerOpticBarrel'|
 'g36UpperReflexBarrel'|'g36OpticFace'|'g36UpperReflexWindow';
const STYLE='o3-compact-integrated-125-125-55';
export const G36_R1_OPTIC_LIFT_Y=.42;

function sixFacetPrism(x0:number,x1:number,rear:Section,front:Section):THREE.BufferGeometry{
 if(rear.length!==6||front.length!==6||x1<=x0)
  throw Error('G36 O2 housing must have two six-corner stations');
 const vertices:number[]=[];
 const tri=(a:readonly number[],b:readonly number[],c:readonly number[])=>{
  vertices.push(...a,...b,...c);
 };
 const back=rear.map(([y,z])=>[x0,y,z]);
 const nose=front.map(([y,z])=>[x1,y,z]);
 // No shared normals at corners: broad intentional flat-shaded planes.
 for(let i=0;i<6;i++){
  const j=(i+1)%6;
  tri(back[i],nose[i],nose[j]);
  tri(back[i],nose[j],back[j]);
 }
 for(let i=1;i<5;i++){
  tri(back[0],back[i],back[i+1]);
  tri(nose[0],nose[i+1],nose[i]);
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
 geometry.computeVertexNormals();
 return geometry;
}
function section(bottom:number,shoulder:number,top:number,width:number):Section{
 // Same six landmark grammar used by O2: broad bottom, full shoulder,
 // beveled upper flank, no bevel ladders or small molding contours.
 return [
  [bottom,-width*.73],[bottom,width*.73],[shoulder,width],
  [top,width*.73],[top,-width*.73],[shoulder,-width]
 ];
}
function hoodSection(bottom:number,shoulder:number,top:number,width:number):Section{
 return [
  [bottom,-width*.80],[bottom,width*.80],[shoulder,width],
  [top,width*.67],[top,-width*.67],[shoulder,-width]
 ];
}
export function addG36O2DualOptic(
 root:THREE.Group,material:THREE.Material,receiverId:string,startIndex:number
):number{
 let index=startIndex;
 const add=(geometry:THREE.BufferGeometry,key:PartKind)=>{
  // Move every optic housing, ocular sleeve and lens as one rigid assembly.
  geometry.translate(0,G36_R1_OPTIC_LIFT_Y,0);
  const mesh=new THREE.Mesh(geometry,material);
  mesh.name='family-receiver-'+receiverId+'-'+index++;
  mesh.castShadow=true;mesh.receiveShadow=true;
  mesh.userData[key]=true;
  mesh.userData.g36OpticArtVersion=STYLE;
  mesh.userData.g36OpticVerticalRevision='r1-raised';
  root.add(mesh);
  return mesh;
 };
 // O3 Stages 1/4: keep the approved 125% transverse mass, but shorten
 // the overall optical assembly and use two matching six-sided stations.
 // Straight broad planes take priority over delicate forward tapering.
 const bodyWidth=.91*1.25;
 // O3 Stage 3: extend the REAR of the same housing into the carry-handle
 // root. The bottom rises slightly towards the nose: a single molded shell,
 // never an extra pedestal or an opaque slab over the handle opening.
 const lower=add(sixFacetPrism(-5.83,-1.50,
  section(1.94,3.08,4.12,bodyWidth),
  section(2.24,3.08,4.12,bodyWidth)), 'g36LowerOptic');
 lower.userData.g36IntegratedOpticShell=true;
 lower.userData.g36OpticCrossSectionSides=6;

 // O3 independent upper ocular stays above the lower roof; the R1 lift
 // changes both lens geometry and the matching factory sight contacts.
 const hoodWidth=.73*1.25;
 const upper=add(sixFacetPrism(-5.57,-3.14,
  hoodSection(3.94,4.24,5.03,hoodWidth),
  hoodSection(3.94,4.24,5.03,hoodWidth)), 'g36UpperReflex');
 upper.userData.g36OpticCrossSectionSides=6;

 // O2 55% projection: lower ocular projects farther than the upper.
 // Radial symmetry belongs only to real lens geometry, not the shell.
 const ocular=(rearX:number,frontX:number,y:number,radius:number,
  radialSegments:number,key:PartKind)=>{
  const length=frontX-rearX;
  const geometry=new THREE.CylinderGeometry(radius,radius,length,radialSegments,1,true);
  geometry.rotateZ(-Math.PI/2);
  geometry.translate((frontX+rearX)/2,y,0);
  const barrel=add(geometry,key);
  barrel.userData.g36OpticOcularSides=radialSegments;
  return barrel;
 };
 ocular(-6.27,-5.76,3.57,.625,8,'g36LowerOpticBarrel');
 ocular(-5.79,-5.49,4.54,.395,6,'g36UpperReflexBarrel');

 // O3 Stage 4: a short sleeve and ONE flat dark disc per optical face.
 // No nested lens rings, knobs, mechanical seams, translucent glass or ribs.
 // Visible from the rear (-X); inherited shared materials are set by caller.
 const lens=(x:number,y:number,radius:number,segments:number,key:PartKind)=>{
  const geometry=new THREE.CircleGeometry(radius*.72,segments);
  geometry.rotateY(-Math.PI/2); // camera/rear-facing plane
  geometry.translate(x,y,0);
  return add(geometry,key);
 };
 lens(-6.268,3.57,.625,8,'g36OpticFace');
 lens(-5.788,4.54,.395,6,'g36UpperReflexWindow');
 return index;
}
