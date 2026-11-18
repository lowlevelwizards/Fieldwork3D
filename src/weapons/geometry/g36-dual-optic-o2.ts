/** G36 O2 — user-selected 125 / 125 / 55 dual-optic miniature.
 * Production-only factory art, derived from the approved O2 three-angle JS
 * study. No simulated mechanisms, sight-coordinate migrations or runtime
 * geometry mutation. Main and hood use six broad facets; ocular sleeves use
 * eight (lower) and six (upper), with just one dark face each.
 */
import * as THREE from 'three';

type Section=readonly (readonly [number,number])[];
type PartKind='g36LowerOptic'|'g36UpperReflex'|'g36LowerOpticBarrel'|
 'g36UpperReflexBarrel'|'g36OpticFace'|'g36UpperReflexWindow';
const STYLE='o3-compact-integrated-125-125-55';

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
  const mesh=new THREE.Mesh(geometry,material);
  mesh.name='family-receiver-'+receiverId+'-'+index++;
  mesh.castShadow=true;mesh.receiveShadow=true;
  mesh.userData[key]=true;
  mesh.userData.g36OpticArtVersion=STYLE;
  root.add(mesh);
  return mesh;
 };
 // O3 Stage 1: retain approved 125% width but compress length by 12.5%.
 // The rear stays at its original mount datum; only the front moves rearward.
 const bodyWidth=.91*1.25;
 const lower=add(sixFacetPrism(-5.83,-1.50,
  section(2.69,3.06,4.08,bodyWidth),
  section(2.69,3.06,4.08,bodyWidth*.97)), 'g36LowerOptic');
 lower.userData.g36IntegratedOpticShell=true;
 lower.userData.g36OpticCrossSectionSides=6;

 // O2 upper hood: 125% prominence, but the top remains exactly 4.70,
 // the existing production sight/weapon envelope landmark.
 const hoodWidth=.73*1.25;
 const upper=add(sixFacetPrism(-5.57,-3.14,
  hoodSection(3.68,3.94,4.70,hoodWidth),
  hoodSection(3.68,3.94,4.70,hoodWidth*.97)), 'g36UpperReflex');
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
 ocular(-5.86,-5.49,4.30,.395,6,'g36UpperReflexBarrel');

 // One recessed-looking matte-black circle per eyepiece, no stacked rings.
 // Visible from the rear (-X); inherited shared materials are set by caller.
 const lens=(x:number,y:number,radius:number,segments:number,key:PartKind)=>{
  const geometry=new THREE.CircleGeometry(radius*.72,segments);
  geometry.rotateY(-Math.PI/2); // camera/rear-facing plane
  geometry.translate(x,y,0);
  return add(geometry,key);
 };
 lens(-6.268,3.57,.625,8,'g36OpticFace');
 lens(-5.858,4.30,.395,6,'g36UpperReflexWindow');
 return index;
}
