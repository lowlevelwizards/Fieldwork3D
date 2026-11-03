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
 const geo=garmentBoxUV(new THREE.BoxGeometry(w,h,d),w,h,d,m,x,y,z);
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
  spec.width,spec.upperInset,thickness,soft);
 fittedArmorBag(back,cloth,nominal.front,-1,spec.top-.2,
  spec.bottom+.20,spec.width+.10,spec.upperInset,thickness,false);
 const outer=nominal.front+.14;
 if(spec.family==='police'){
  // Identification rectangle, not three narrow floating rails.
  makeBox(front,dark,outer,1.8,-2.85,.23,.85,4.35);
 }else if(spec.family==='fragmentation'){
  // PASGT-like long central closure and two legible lower pockets.
  makeBox(front,utility,outer,-.85,0,.24,7.1,.78);
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
/** Broad shoulder surface: one swept, fitted slab per side.
 * Fit follows the selected garment crown without tiny compound links.
 */
function shoulders(g:THREE.Group,m:THREE.Material,
 fit:ArmorFitSurfaces,spec:ArmorProportion){
 const env=uniformFitEnvelope(fit.top);
 const shoulder=env.outer(5.30);
 const bagZ=Math.min(spec.width*.5-.75,Math.max(2.6,
  spec.width*.5-spec.upperInset*.60));
 const crownZ=Math.min(5.15,Math.max(3.65,fit.shoulderZ));
 for(const side of [-1,1]){
  const path:readonly (readonly [number,number,number])[]=[
   [fit.front-.36,spec.top-.56,bagZ],
   [shoulder.front+.22,fit.shoulderY-.23,crownZ],
   [1.85,fit.shoulderY+.04,crownZ],
   [-1.85,fit.shoulderY+.04,crownZ],
   [shoulder.back-.22,fit.shoulderY-.23,crownZ],
   [fit.back+.36,spec.top-.58,bagZ]
  ];
  fittedShoulderBridge(g,m,path,spec.shoulderWidth,
   spec.family==='fragmentation'||spec.family==='legacy'?.85:.59,side);
 }
}
/** Three purposeful bend points form one continuous wrap per side.
 * Plate and flank faces overlap under the bag so there are no free tabs.
 */
function attachedSide(g:THREE.Group,m:THREE.Material,
 fit:ArmorFitSurfaces,spec:ArmorProportion,
 y:number,height:number,thickness=spec.sideThickness){
 const depth=ARMOR_PANEL_DEPTHS[fit.style]??1.2;
 const frontX=fit.front-depth*.58,backX=fit.back+depth*.58;
 const sideX=spec.family==='fragmentation'||spec.family==='legacy'?
  2.12:1.67;
 for(const side of [-1,1]){
  const edge=spec.width*.5-.55;
  const path:readonly (readonly [number,number])[]=[
   [frontX,side*edge],[sideX,side*fit.side],
   [-sideX,side*fit.side],[backX,side*edge]
  ];
  fittedSideWrap(g,m,path,y,height,thickness,side);
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
 if(spec.family==='skeleton'){
  // Two *connected*, conspicuous but open bands. No little free prongs.
  for(const y of [-2.28,.76])
   attachedSide(connectors,utility,fit,spec,y,spec.sideHeight);
 }else{
  const sideY=(spec.top+spec.bottom)*.5;
  attachedSide(connectors,cloth,fit,spec,sideY,spec.sideHeight);
 }
 if(spec.family==='assault'){
  // Exactly one secondary side armor plate per flank, integrated with
  // the carrier band rather than a stack of overlapping blocky ribs.
  for(const side of [-1,1])
   makeBox(connectors,cloth,.05,-1.20,
    side*(fit.side+.19),4.10,4.45,.92);
 }
 if(spec.family==='fragmentation'||spec.family==='legacy'){
  const hood=fit.top==='smock-jacket'||fit.top==='gorka-jacket';
  const z=hood?5.25:spec.family==='legacy'?4.15:3.90;
  fittedArmorCollar(connectors,cloth,fit.back+.50,
   fit.front-2.5,z+1.10,z,
   fit.shoulderY+.46,spec.family==='legacy'?2.25:1.95);
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
