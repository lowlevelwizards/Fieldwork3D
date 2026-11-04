/** Adaptive wearable armor. Plate bags and distinctive front/back panels
 * are authored ONCE. Only attached shoulder/side connections change with the
 * actual uniform envelope. Every resulting mesh remains in chest +X-forward
 * coordinates, with real armor colors and world-unit camouflage UVs.
 *
 * Fitting is memoized by top ID: poseOperator calls the update every frame,
 * but no matrices/geometry are regenerated until the selected top changes.
 * Mechanical armor and magazine capacity are never touched here.
 */
import * as THREE from 'three';
import {garmentBoxUV} from './operator-fabric-camo-materials.ts';
import {ARMOR_PROPORTIONS,type ArmorProportion}
 from './operator-armor-proportions.ts';
import {fittedArmorBag,fittedShoulderBridge,fittedSideWrap,fittedArmorCollar}
 from './operator-armor-shapes.ts';
import {consolidateVisualGroup} from './operator-visual-mesh-merge.ts';
import {armorSideLayout} from './operator-armor-side-layout.ts';
import {armorStrapLanding,JPC_BRANCH_HALF_SPREAD,JPC_BRANCH_WIDTH}
 from './operator-armor-straps.ts';
import {uniformFitEnvelope,armorContactSurface,fittedArmorSurfaces,ARMOR_PANEL_DEPTHS,
 type ArmorFitSurfaces} from './operator-uniform-fit-envelope.ts';

export type AdaptiveArmorGroups=Record<string,THREE.Group>;
type Materials={cloth:THREE.Material;utility:THREE.Material;
 dark:THREE.Material;trim:THREE.Material};
type Profile={front:number;side:number};
type ArmorEntry={
 group:THREE.Group;front:THREE.Group;back:THREE.Group;
 connectors:THREE.Group;key:string;model:string;
 nominal:Profile;materials:Materials;shoulderWidth:number;
};
const entries=new WeakMap<THREE.Group,ArmorEntry>();
const makeBox=(parent:THREE.Group,m:THREE.Material,
 x:number,y:number,z:number,w:number,h:number,d:number)=>{
 const mapped=garmentBoxUV(new THREE.BoxGeometry(w,h,d),w,h,d,m,x,y,z);
 // Polygonal bags and swept fabric are non-indexed. Match that topology
 // before one-time consolidation, avoiding three.js mergeGeometries skips.
 const geo=mapped.toNonIndexed();mapped.dispose();
 const mesh=new THREE.Mesh(geo,m);mesh.position.set(x,y,z);
 mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);
 return mesh;
};
/** Authored front/rear silhouettes never stretch when changing garments.
 * Only the attachment groups are recomputed for each selected top.
 */
function buildAuthoredPanels(entry:ArmorEntry){
 const {front,back,model,nominal,materials}=entry;
 const spec=ARMOR_PROPORTIONS[model];
 if(!spec)return;
 const {cloth,utility,dark,trim}=materials;
 if(spec.family==='concealed'){
  // Internal panels do not show through the selected top.
  makeBox(front,cloth,4.82,-.25,0,.34,9.0,11.0);
  makeBox(back,cloth,-4.82,-.25,0,.34,9.0,11.0);
  return;
 }
 const thickness=ARMOR_PANEL_DEPTHS[model]??1.2;
 const soft=spec.family==='police'||spec.family==='fragmentation'||
  spec.family==='legacy';
 // The broad front is one iconic profile. Soft vests have two joined
 // closure halves; plate bags are single clipped-corner shapes.
 fittedArmorBag(front,cloth,nominal.front,1,spec.top,spec.bottom,
  spec.width,spec.upperInset,thickness,soft,
  spec.collarStyle==='vest_v'?1.95:0);
 fittedArmorBag(back,cloth,nominal.front,-1,spec.top-.2,
  spec.bottom+.20,spec.rearWidth,spec.upperInset,thickness,false);
 const outer=nominal.front+.14;
 if(spec.family==='police'){
  // A vest-like V collar opens into a visible center zipper. Its two
  // sides remain independent: no black slit painted onto a solid plate.
  makeBox(front,dark,outer,1.65,-3.05,.22,.84,3.95);
  const zipperTop=spec.top-2.05,zipperBottom=spec.bottom+.48;
  makeBox(front,dark,outer+.02,(zipperTop+zipperBottom)*.5,0,
   .25,zipperTop-zipperBottom,.30);
 }else if(spec.family==='fragmentation'){
  // PASGT-like long central closure and two legible lower pockets.
  makeBox(front,trim,outer,-.42,0,.24,10.55,.78);
  for(const sign of [-1,1])
   makeBox(front,cloth,outer+.15,-2.60,sign*3.15,
    .42,2.40,3.20);
 }else if(spec.family==='legacy'){
  // Structured two-band legacy OTV rather than a blank chest cylinder.
  makeBox(front,utility,outer,-1.05,0,.23,8.0,.82);
  for(const y of [-2.90,-.55])
   makeBox(front,trim,outer+.15,y,0,.18,.46,spec.width-1.6);
 }else if(spec.family==='standard'){
  for(const y of [-2.55,-.80])
   makeBox(front,utility,outer,y,0,.21,.43,spec.width-1.0);
 }else if(spec.family==='assault'){
  // One strong modular chest band, leaving the wider yoke and flank
  // armor to communicate the heavyweight identity.
  makeBox(front,dark,outer,2.92,0,.24,.55,spec.width-2.3);
  makeBox(front,utility,outer,-2.75,0,.20,.65,spec.width-1.0);
 }else if(spec.family==='skeleton'){
  makeBox(front,trim,outer,spec.bottom+.28,0,.18,.40,spec.width-.8);
 }
 consolidateVisualGroup(front);consolidateVisualGroup(back);
}
function clearConnectors(entry:ArmorEntry){
 const g=entry.connectors;
 g.traverse(o=>{
  if(o instanceof THREE.Mesh)o.geometry.dispose();
 });
 g.clear();
}
/** Broad fitted shoulder yokes; modern skeletal uses an intentional
 * JPC-like open triangle at each front attachment (two stout legs joining
 * one shared crown). All pieces meet the plate bag below its top edge.
 */
function shoulders(g:THREE.Group,m:THREE.Material,
 fit:ArmorFitSurfaces,spec:ArmorProportion){
 const shoulder=armorContactSurface(fit.top,5.30);
 const land=armorStrapLanding(fit,spec);
 for(const side of [-1,1]){
  if(spec.family==='skeleton'){
   // Two strong, broad hypalon-style branches create an unmistakable
   // triangular opening, rather than two overlapping generic straps.
   // Both feet are constrained by armorStrapLanding to the actual plate.
   for(const d of [-JPC_BRANCH_HALF_SPREAD,JPC_BRANCH_HALF_SPREAD]){
    fittedShoulderBridge(g,m,[
     [land.frontX,land.frontY,land.frontZ+d],
     [shoulder.front+.14,land.shoulderY-.36,
      land.shoulderZ+d*.66],
     [2.50,land.shoulderY+.01,land.shoulderZ+d*.34],
     [1.35,land.shoulderY+.01,land.shoulderZ]
    ],JPC_BRANCH_WIDTH,spec.strapThickness,side);
   }
   fittedShoulderBridge(g,m,[
    [1.35,land.shoulderY+.01,land.shoulderZ],
    [-1.75,land.shoulderY+.01,land.shoulderZ],
    [shoulder.back-.16,land.shoulderY-.28,land.shoulderZ],
    [land.rearX,land.rearY,land.rearZ]
   ],spec.shoulderWidth,spec.strapThickness,side);
   continue;
  }
  const path:readonly (readonly [number,number,number])[]=[
   [land.frontX,land.frontY,land.frontZ],
   [shoulder.front+.14,land.shoulderY-.25,land.shoulderZ],
   [1.75,land.shoulderY+.02,land.shoulderZ],
   [-1.75,land.shoulderY+.02,land.shoulderZ],
   [shoulder.back-.16,land.shoulderY-.25,land.shoulderZ],
   [land.rearX,land.rearY,land.rearZ]
  ];
  fittedShoulderBridge(g,m,path,spec.shoulderWidth,
   spec.strapThickness,side);
 }
}
/** The R5 wrap is exactly three axis-aligned cuboids per side.
 * Each is either parallel to the torso flank (XY) or plate bag (YZ).
 * The front/rear return overlaps the plate-bag edge, with no diagonals.
 */
function attachedSide(g:THREE.Group,m:THREE.Material,
 fit:ArmorFitSurfaces,spec:ArmorProportion,
 y=spec.sideY,height=spec.sideHeight){
 const p=armorSideLayout(fit,spec,y,height);
 const lengthX=p.frontX-p.backX;
 const returnLen=p.frontReturnLength+.34;
 const joinZ=(p.centerZ+p.plateEdgeZ)*.5-.05;
 const chamfered=spec.sideStyle==='soft_wrap'||
  spec.sideStyle==='side_plate'||spec.family==='standard';
 for(const side of [-1,1]){
  if(chamfered){
   // Three legible planes: front return, flank, rear return.
   // A SINGLE low-poly bend per corner follows the torso instead of
   // forcing square plate-sized corners out around the shoulders.
   // Both diagonal corners remain OUTSIDE the visible rectangular
   // garment: only one short facet, not a diagonal cut through the shirt.
   const fabric=armorContactSurface(fit.top,y);
   const turnZ=p.garmentSide+.29;
   const path:readonly (readonly [number,number])[]=[
    [p.frontX+.12,side*(p.plateEdgeZ-.13)],
    [p.frontX+.12,side*turnZ],
    [fabric.front-.42,side*p.centerZ],
    [fabric.back+.42,side*p.centerZ],
    [p.backX-.12,side*turnZ],
    [p.backX-.12,side*(p.plateEdgeZ-.13)]
   ];
   fittedSideWrap(g,m,path,y,height,spec.sideThickness,side);
   continue;
  }
  // Minimalist slick/JPC: perfectly flat elastic and skeletal bands.
  const flank=makeBox(g,m,(p.frontX+p.backX)*.5,y,
   side*p.centerZ,lengthX+.16,height,spec.sideThickness);
  flank.name='r6-flush-side-band';
  const front=makeBox(g,m,p.frontX,y,
   side*joinZ,p.returnThickness,height,returnLen);
  front.name='r6-front-return';
  const back=makeBox(g,m,p.backX,y,
   side*joinZ,p.returnThickness,height,returnLen);
  back.name='r6-rear-return';
 }
}
function regenerateConnections(entry:ArmorEntry,top:string){
 const {model,nominal,materials,front,back,connectors}=entry;
 const spec=ARMOR_PROPORTIONS[model];if(!spec)return;
 const fit=fittedArmorSurfaces(model,top,nominal);
 front.position.x=fit.front-nominal.front;
 back.position.x=fit.back+nominal.front;
 clearConnectors(entry);
 if(spec.family==='concealed'){
  front.position.x=0;back.position.x=0;
  return;
 }
 const {cloth,utility}=materials;
 shoulders(connectors,spec.family==='assault'?cloth:utility,fit,spec);
 if(spec.sideStyle==='open_two_band'){
  // JPC-style negative-space cummerbund: two full-width planar bands.
  for(const y of [-2.45,1.05])
   attachedSide(connectors,utility,fit,spec,y,spec.sideHeight);
 }else if(spec.sideStyle!=='none'){
  attachedSide(connectors,
   spec.family==='skeleton'?utility:cloth,fit,spec);
 }
 if(spec.sideStyle==='side_plate'){
  const p=armorSideLayout(fit,spec);
  // A single unmistakable side plate per flank. Its inner face overlaps
  // the continuous side slab instead of hovering outside a strip frame.
  const depth=.86;
  for(const side of [-1,1])
   makeBox(connectors,cloth,.05,spec.sideY-.18,
    side*(p.centerZ+spec.sideThickness*.5+depth*.5-.10),
    3.75,spec.sidePlateHeight,depth);
 }
 if(spec.collarStyle==='high_flak'||spec.collarStyle==='legacy_wrap'){
  const flak=spec.collarStyle==='high_flak';
  const hood=fit.top==='smock-jacket'||fit.top==='gorka-jacket';
  const innerZ=hood?5.10:flak?2.90:3.75;
  const outerZ=innerZ+(flak?1.60:1.38);
  fittedArmorCollar(connectors,cloth,fit.back+.54,
   fit.front-(flak?2.15:2.80),outerZ,innerZ,
   fit.shoulderY+(flak?.89:.17),flak?2.85:1.70);
 }
 consolidateVisualGroup(connectors);
}
/** Covered uniform pockets lie pressed beneath a close-fitting vest.
 * The actual authored pocket mesh is hidden only when the selected vest
 * overlaps its height. This avoids forcing the entire plate bag outward
 * to clear a detail that is visually occluded by armor.
 * Cached per chest + selected look: NO per-frame scene traversal.
 */
const pocketFitKeys=new WeakMap<THREE.Object3D,string>();
function updateCoveredGarmentPockets(chest:THREE.Object3D,
 style:string,top:string){
 const key=style+'|'+top;
 if(pocketFitKeys.get(chest)===key)return;
 pocketFitKeys.set(chest,key);
 const spec=ARMOR_PROPORTIONS[style];
 const external=!!spec&&spec.family!=='concealed';
 chest.traverse(node=>{
  if(!(node instanceof THREE.Mesh)||!node.userData.armorCompressible)
   return;
  const y=node.userData.armorCoverY as number;
  node.visible=!(external&&y<spec.top-.35&&
   y>spec.bottom+.70);
 });
}
/** Only regenerate connectors when the top selection changes. The active
 * group is the sole visible armor; hidden styles can retain their previous
 * fit until the user selects them again.
 */
export function updateAdaptiveArmorFit(
 groups:AdaptiveArmorGroups,style:string,top:string):void{
 const group=groups[style],entry=group&&entries.get(group);
 if(!entry)return;
 const key=uniformFitEnvelope(top).top;
 if(group.parent)updateCoveredGarmentPockets(group.parent,style,key);
 if(entry.key===key)return;
 regenerateConnections(entry,key);
 entry.key=key;
}
export function createAdaptiveArmorSilhouettes(
 chest:THREE.Group,cloth:THREE.Material,utility:THREE.Material,
 dark:THREE.Material,trim:THREE.Material,
 baseline:Readonly<Record<string,Profile>>):AdaptiveArmorGroups{
 const styles:AdaptiveArmorGroups={};
 for(const [model,profile] of Object.entries(baseline)){
  const group=new THREE.Group();group.name='authored-armor-'+model;
  group.visible=false;chest.add(group);styles[model]=group;
  const front=new THREE.Group(),back=new THREE.Group(),
   connectors=new THREE.Group();
  front.name='authored-front-bag';back.name='authored-rear-bag';
  connectors.name='uniform-fitted-connectors';
  group.add(front,back,connectors);
  const entry:ArmorEntry={
   group,front,back,connectors,key:'',model,nominal:profile,
   materials:{cloth,utility,dark,trim},
   shoulderWidth:ARMOR_PROPORTIONS[model]?.shoulderWidth??0
  };
  entries.set(group,entry);
  if(ARMOR_PROPORTIONS[model])buildAuthoredPanels(entry);
  if(model!=='armor-bare'){
   regenerateConnections(entry,'combat-shirt');
   entry.key='combat-shirt';
  }
 }
 return styles;
}
