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
import {uniformFitEnvelope,fittedArmorSurfaces,ARMOR_PANEL_DEPTHS,
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
  makeBox(front,utility,outer,-.42,0,.24,10.55,.78);
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
 const env=uniformFitEnvelope(fit.top);
 const shoulder=env.outer(5.30);
 const bagZ=Math.min(spec.width*.5-.75,Math.max(2.6,
  spec.width*.5-spec.upperInset*.60));
 const crownZ=Math.min(5.15,Math.max(3.65,fit.shoulderZ));
 const lowerY=spec.top-spec.strapDrop;
 const frontX=fit.front-.18;
 for(const side of [-1,1]){
  if(spec.family==='skeleton'){
   // Two thick front diagonals form a visible triangular negative space.
   // One substantial back strap continues over the shoulder crown.
   for(const d of [-.95,.95]){
    fittedShoulderBridge(g,m,[
     [frontX,lowerY,bagZ+d],
     [shoulder.front+.20,fit.shoulderY-.36,crownZ+d*.30],
     [1.85,fit.shoulderY+.03,crownZ]
    ],1.00,spec.strapThickness,side);
   }
   fittedShoulderBridge(g,m,[
    [1.85,fit.shoulderY+.03,crownZ],
    [-1.85,fit.shoulderY+.03,crownZ],
    [shoulder.back-.20,fit.shoulderY-.30,crownZ],
    [fit.back+.28,lowerY+.07,bagZ]
   ],spec.shoulderWidth,spec.strapThickness,side);
   continue;
  }
  const path:readonly (readonly [number,number,number])[]=[
   [frontX,lowerY,bagZ],
   [shoulder.front+.20,fit.shoulderY-.24,crownZ],
   [1.85,fit.shoulderY+.03,crownZ],
   [-1.85,fit.shoulderY+.03,crownZ],
   [shoulder.back-.20,fit.shoulderY-.24,crownZ],
   [fit.back+.22,lowerY+.06,bagZ]
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
 for(const side of [-1,1]){
  const flank=makeBox(g,m,(p.frontX+p.backX)*.5,y,
   side*p.centerZ,lengthX+.16,height,spec.sideThickness);
  flank.name='r5-flat-torso-side';
  const front=makeBox(g,m,p.frontX,y,
   side*joinZ,p.returnThickness,height,returnLen);
  front.name='r5-straight-front-return';
  const back=makeBox(g,m,p.backX,y,
   side*joinZ,p.returnThickness,height,returnLen);
  back.name='r5-straight-rear-return';
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
/** Only regenerate connectors when the top selection changes. The active
 * group is the sole visible armor; hidden styles can retain their previous
 * fit until the user selects them again.
 */
export function updateAdaptiveArmorFit(
 groups:AdaptiveArmorGroups,style:string,top:string):void{
 const group=groups[style],entry=group&&entries.get(group);
 if(!entry)return;
 const key=uniformFitEnvelope(top).top;
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
