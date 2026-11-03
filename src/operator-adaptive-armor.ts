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
const link=(g:THREE.Group,m:THREE.Material,
 a:readonly [number,number,number],b:readonly [number,number,number],
 width:number,depth:number)=>{
 const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b);
 const delta=end.clone().sub(start),length=delta.length()+.16;
 if(length<.001)return;
 const geo=garmentBoxUV(new THREE.BoxGeometry(width,length,depth),
  width,length,depth,m);
 const mesh=new THREE.Mesh(geo,m);
 mesh.position.copy(start.add(end).multiplyScalar(.5));
 mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
 mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);
};
function plateBag(g:THREE.Group,m:THREE.Material,front:number,
 bottom:number,lowH:number,lowW:number,upperH:number,upperW:number,
 depth:number,sign:number){
 const x=sign*(front-depth*.50);
 makeBox(g,m,x,bottom+lowH*.50,0,depth,lowH,lowW);
 makeBox(g,m,x,bottom+lowH+upperH*.50,0,depth,upperH,upperW);
}
function splitVest(g:THREE.Group,m:THREE.Material,
 face:number,y:number,h:number,halfW:number,depth:number,
 gap:number,sign:number){
 const z=halfW*.50+gap*.50;
 for(const side of [-1,1])
  makeBox(g,m,sign*(face-depth*.50),y,side*z,depth,h,halfW);
}
const RECIPES:Readonly<Record<string,{
 bottom:number;low:number;wide:number;upper:number;neck:number;
 depth:number;shoulder:number;straps:number;sideHeight:number;
 style:'concealed'|'soft'|'flak'|'slick'|'skeleton'|'standard'|'heavy'|'legacy';
}>>={
 'soft-slick':{bottom:-4.8,low:9,wide:11.2,upper:0,neck:0,
  depth:ARMOR_PANEL_DEPTHS['soft-slick'],shoulder:0,straps:0,sideHeight:0,style:'concealed'},
 'soft-paca':{bottom:-4.8,low:9,wide:11.3,upper:0,neck:0,
  depth:ARMOR_PANEL_DEPTHS['soft-paca'],shoulder:0,straps:0,sideHeight:0,style:'concealed'},
 'soft-vest':{bottom:-4.78,low:8.7,wide:5.3,upper:0,neck:0,
  depth:ARMOR_PANEL_DEPTHS['soft-vest'],shoulder:2.40,straps:0,sideHeight:8.4,style:'soft'},
 'soft-flak':{bottom:-7.0,low:11.05,wide:6.48,upper:0,neck:0,
  depth:ARMOR_PANEL_DEPTHS['soft-flak'],shoulder:3.20,straps:0,sideHeight:10.6,style:'flak'},
 'plate-slick':{bottom:-3.7,low:5.25,wide:7.9,upper:2.20,neck:6.00,
  depth:ARMOR_PANEL_DEPTHS['plate-slick'],shoulder:1.05,straps:1,sideHeight:1.10,style:'slick'},
 'plate-jpc':{bottom:-4.12,low:5.90,wide:9.2,upper:2.42,neck:7.30,
  depth:ARMOR_PANEL_DEPTHS['plate-jpc'],shoulder:1.40,straps:3,sideHeight:.64,style:'skeleton'},
 'plate-standard':{bottom:-4.60,low:6.50,wide:9.65,upper:2.70,neck:7.60,
  depth:ARMOR_PANEL_DEPTHS['plate-standard'],shoulder:1.60,straps:1,sideHeight:2.75,style:'standard'},
 'plate-heavy':{bottom:-4.96,low:6.90,wide:10.15,upper:2.82,neck:8.10,
  depth:ARMOR_PANEL_DEPTHS['plate-heavy'],shoulder:2.25,straps:1,sideHeight:3.55,style:'heavy'},
 'plate-legacy':{bottom:-7.38,low:11.38,wide:6.20,upper:0,neck:0,
  depth:ARMOR_PANEL_DEPTHS['plate-legacy'],shoulder:3.06,straps:1,sideHeight:10.5,style:'legacy'}
};
function buildAuthoredPanels(entry:ArmorEntry){
 const {front,back,model,nominal,materials}=entry;
 const r=RECIPES[model];if(!r)return;
 const {cloth,utility,dark,trim}=materials;
 if(r.style==='concealed'){
  // Buried below the actual shirt surface, intentionally not a tactical vest.
  makeBox(front,cloth,4.82,-.25,0,.34,9.0,11.0);
  makeBox(back,cloth,-4.82,-.25,0,.34,9.0,11.0);
  return;
 }
 if(r.style==='soft'||r.style==='flak'||r.style==='legacy'){
  const face=nominal.front;
  splitVest(front,cloth,face,r.bottom+r.low*.5,r.low,r.wide,
   r.depth,r.style==='soft'?.48:.20,1);
  makeBox(back,cloth,-face+r.depth*.5,r.bottom+r.low*.5,0,
   r.depth,r.low,(r.wide*2)+.55);
  if(r.style==='soft'){
   // Police: broad upper identification panel, clear center opening.
   makeBox(front,dark,face+.10,2.15,-3.15,.19,.86,4.05);
   makeBox(front,trim,face+.13,-.45,0,.18,6.7,.22);
  }else{
   makeBox(front,utility,face+.12,-.35,0,.22,7.4,.55);
   if(r.style==='flak')for(const sign of [-1,1]){
    makeBox(front,cloth,face+.17,-.55,sign*3.35,.28,2.5,3.50);
    makeBox(front,utility,face+.23,1.0,sign*3.35,.24,.60,3.65);
   }
   if(r.style==='legacy')for(const sign of [-1,1])
    makeBox(front,utility,face+.16,-3.75,sign*4.48,.22,1.6,3.00);
  }
 }else{
  const zWidth=r.neck;
  plateBag(front,cloth,nominal.front,r.bottom,r.low,r.wide,
   r.upper,zWidth,r.depth,1);
  plateBag(back,cloth,nominal.front,r.bottom,r.low,r.wide+.1,
   r.upper,zWidth+.1,r.depth,-1);
  if(r.style==='standard'||r.style==='heavy'){
   for(const y of [-2.45,-1.11,.27])
    makeBox(front,utility,nominal.front+.11,y,0,.13,.33,r.wide-.9);
  }else if(r.style==='skeleton'){
   makeBox(front,trim,nominal.front+.12,-4.01,0,.14,.30,8.1);
  }else{
   makeBox(front,trim,nominal.front+.12,-3.54,0,.14,.25,7.0);
  }
  if(r.style==='heavy'){
   // Side protection is fitted separately: no monolithic oversized bag.
   makeBox(front,dark,nominal.front+.14,3.64,0,.18,.42,5.65);
  }
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
function shoulders(g:THREE.Group,m:THREE.Material,
 fit:ArmorFitSurfaces,width:number,frontAnchor:number,backAnchor:number,
 upperZ:number){
 const env=uniformFitEnvelope(fit.top),outer=env.outer(4.65);
 const shoulderZ=fit.shoulderZ;
 const crown=fit.shoulderY;
 const frontX=outer.front+.44;
 const backX=outer.back-.46;
 for(const sign of [-1,1]){
  const startZ=sign*upperZ;
  const ridgeZ=sign*shoulderZ;
  const nodes:readonly [number,number,number][]=[
   [fit.front-.18,frontAnchor,startZ],
   [frontX,crown-.70,ridgeZ],
   [2.00,crown,ridgeZ],
   [-1.90,crown,ridgeZ],
   [backX,crown-.70,ridgeZ],
   [fit.back+.18,backAnchor,startZ]
  ];
  for(let i=0;i<nodes.length-1;i++)
   link(g,m,nodes[i],nodes[i+1],width,.74);
 }
}
function attachedSide(g:THREE.Group,m:THREE.Material,
 fit:ArmorFitSurfaces,span:number,thickness:number,
 frontW:number,rearW:number,y:number){
 for(const sign of [-1,1]){
  const edgeZ=fit.side*sign,frontZ=sign*(frontW*.5-.22),
   backZ=sign*(rearW*.5-.22);
  // Full side band follows true uniform width, with front/rear joins
  // extending to the authored bag edges. No unsupported floating slab.
  makeBox(g,m,(fit.front+fit.back)*.5,y,edgeZ,
   fit.front-fit.back+.08,span,thickness);
  link(g,m,[fit.front-.40,y,frontZ],[fit.front-.55,y,edgeZ],
   span,thickness);
  link(g,m,[fit.back+.40,y,backZ],[fit.back+.55,y,edgeZ],
   span,thickness);
 }
}
function neckProtection(g:THREE.Group,m:THREE.Material,
 fit:ArmorFitSurfaces,style:'flak'|'legacy'){
 const env=uniformFitEnvelope(fit.top);
 const extra=style==='legacy'?.28:0;
 const y=Math.max(fit.shoulderY+.50,
  env.shoulderCrown+env.neckGuard*.35+.30+extra);
 // Bulky Gorka/smock hoods sit behind the neck: collar returns must
 // sit OUTSIDE their side rims, not intersect the folded hood meshes.
 const hood=fit.top==='smock-jacket'||fit.top==='gorka-jacket';
 const z=hood?5.15:style==='legacy'?3.55:3.15;
 // U-shaped collar, readable as one connected form rather than four
 // floating spikes. Hood can live inside the protected opening.
 makeBox(g,m,fit.back+.55,y-.32,0,1.45,1.66,z*2+.9);
 for(const side of [-1,1]){
  makeBox(g,m,(fit.front+fit.back)*.50,y-.52,side*z,
   fit.front-fit.back-1.0,1.45,1.38);
 }
}
function regenerateConnections(entry:ArmorEntry,top:string){
 const {model,nominal,materials,front,back,connectors}=entry;
 const r=RECIPES[model];if(!r||model==='armor-bare')return;
 const fit=fittedArmorSurfaces(model,top,nominal);
 // Fixed authored bags translate only outward; dimensions are invariant.
 front.position.x=fit.front-nominal.front;
 back.position.x=fit.back+nominal.front;
 clearConnectors(entry);
 const {cloth,utility}=materials;
 if(r.style==='concealed'){
  // This armor stays under the uniform, even on the bulkier jackets.
  front.position.x=0;back.position.x=0;
  return;
 }
 const frontW=r.style==='soft'||r.style==='flak'||r.style==='legacy'?
  r.wide*2+(.2):r.wide;
 if(r.style==='soft'||r.style==='flak'||r.style==='legacy'){
  // Soft carriers use continuous broad shoulder yokes, fitted side wrap.
  shoulders(connectors,cloth,fit,r.shoulder,3.55,3.65,
   Math.min(5.0,r.wide*.65));
  attachedSide(connectors,cloth,fit,r.sideHeight,
   r.style==='legacy'?1.32:.95,frontW,frontW,
   r.style==='soft'?-1.03:-1.64);
  if(r.style==='flak'||r.style==='legacy')
   neckProtection(connectors,cloth,fit,r.style);
 }else{
  shoulders(connectors,r.style==='heavy'?cloth:utility,fit,
   r.shoulder,3.72,3.65,Math.min(r.neck*.45,4.10));
  if(r.style==='skeleton'){
   for(const y of [-2.62,-.90,1.26])
    attachedSide(connectors,utility,fit,.58,.73,r.wide,r.wide+.1,y);
  }else{
   attachedSide(connectors,r.style==='heavy'?cloth:utility,fit,
    r.sideHeight,r.style==='slick'?.68:1.05,
    r.wide,r.wide+.1,-1.12);
  }
  if(r.style==='heavy')for(const sign of [-1,1]){
   // Side armor always moves with the cummerbund, not with the front bag.
   makeBox(connectors,cloth,.10,-1.12,sign*(fit.side+.58),
    4.35,4.42,1.18);
  }
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
   shoulderWidth:RECIPES[model]?.shoulder??0
  };
  entries.set(group,entry);
  if(RECIPES[model])buildAuthoredPanels(entry);
  if(model!=='armor-bare'){
   regenerateConnections(entry,'combat-shirt');
   entry.key='combat-shirt';
  }
 }
 return styles;
}
