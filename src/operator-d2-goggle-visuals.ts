/** D2 eyewear R2 goggles: three genuinely different protective archetypes.
 * Low = compact enclosed eye seal; field = deep brute-force rectangular box;
 * retro = two protruding individual octagonal barrels.
 * Four allocated wearing modes and existing IDs remain unchanged.
 */
import * as THREE from 'three';
import {solidFrame,solidBlock,octagon,type EyePolygon} from './operator-d2-eyewear-shell.ts';
export type D2GoggleId='goggles-low'|'goggles-field'|'goggles-retro';
export type D2GogglePlacement='eyes'|'forehead'|'helmet'|'neck';
function low(root:THREE.Group,frame:THREE.Material,
 lens:THREE.Material,elastic:THREE.Material){
 // Compact lens with a *deep* central nose relief and a substantial
 // enclosing bottom ring. Narrower than the shield; unlike that open plate,
 // all four edges flow back into the soft rear cushion.
 const outer:EyePolygon=[
  [-3.28,5.02],[3.28,5.02],[3.28,2.55],
  [1.92,2.22],[.68,3.15],[-.68,3.15],
  [-1.92,2.22],[-3.28,2.55]
 ];
 const hole:EyePolygon=[
  [-2.59,4.42],[2.59,4.42],[2.59,3.01],
  [1.77,2.83],[.68,3.63],[-.68,3.63],
  [-1.77,2.83],[-2.59,3.01]
 ];
 solidFrame(root,frame,lens,'compact-sealed-tactical-goggle',
  outer,[hole],-5.22,1.16,'compact-seal');
 // Broad top and cheek pads read as a continuous close-fitting face gasket,
 // not another open visor or tiny hinge details.
 solidBlock(root,elastic,'compact-upper-cushion',0,4.89,-4.19,
  6.45,.69,.90);
 for(const side of [-1,1]){
  solidBlock(root,elastic,'compact-cheek-seal',side*3.12,3.54,-4.21,
   .69,2.17,.92);
  solidBlock(root,elastic,'compact-lower-cheek-pad',side*2.32,2.76,-4.20,
   1.40,.44,.84);
  solidBlock(root,frame,'compact-strap-socket',side*3.46,3.73,-4.50,
   .74,1.04,1.02);
 }
}
function field(root:THREE.Group,frame:THREE.Material,
 lens:THREE.Material,elastic:THREE.Material){
 const outer:EyePolygon=[
  [-4.30,5.42],[4.30,5.42],[4.30,1.95],
  [2.85,1.61],[.89,2.24],[-.89,2.24],
  [-2.85,1.61],[-4.30,1.95]
 ];
 const hole:EyePolygon=[
  [-3.55,4.68],[3.55,4.68],[3.55,2.54],
  [2.66,2.33],[.87,2.83],[-.87,2.83],
  [-2.66,2.33],[-3.55,2.54]
 ];
 solidFrame(root,frame,lens,'bulky-deep-dust-goggle',
  outer,[hole],-6.30,1.89,'field-seal');
 // A deep continuous one-piece face seal, not a second skinny lens frame.
 solidBlock(root,elastic,'field-top-face-gasket',0,5.17,-4.21,
  8.65,.83,.94);
 solidBlock(root,elastic,'field-bottom-face-gasket',0,2.02,-4.20,
  8.26,.72,.94);
 for(const side of [-1,1]){
  solidBlock(root,elastic,'field-thick-cheek-gasket',side*4.12,3.64,-4.19,
   .75,2.84,1.05);
  solidBlock(root,frame,'field-massive-side-mount',side*4.33,3.78,-5.34,
   1.02,1.48,2.15);
 }
}
function retro(root:THREE.Group,frame:THREE.Material,
 lens:THREE.Material,elastic:THREE.Material){
 // Each cup has its own deep faceted exterior: two large octagons,
 // not a horizontal goggle slit disguised with round outlines.
 for(const side of [-1,1]){
  const cx=side*1.92;
  solidFrame(root,frame,lens,'vintage-octagonal-cup',
   octagon(cx,3.68,1.77,1.83),[octagon(cx,3.68,1.12,1.18)],
   -6.20,1.88,'cups');
  solidBlock(root,elastic,'vintage-rear-leather-pad',side*3.32,3.68,-4.34,
   .73,2.50,.88);
  solidBlock(root,frame,'vintage-side-cup-shoulder',side*3.62,3.70,-5.16,
   .72,2.35,1.65);
 }
 solidBlock(root,frame,'bold-cup-bridge',0,3.79,-5.63,
  1.10,.89,1.19);
}
function strap(root:THREE.Group,elastic:THREE.Material,
 frame:THREE.Material,id:D2GoggleId){
 const half=id==='goggles-field'?4.47:id==='goggles-low'?3.49:4.08;
 const height=id==='goggles-field'?.92:id==='goggles-low'?.68:.80;
 const y=id==='goggles-field'?3.80:id==='goggles-low'?3.78:3.74;
 for(const side of [-1,1]){
  solidBlock(root,elastic,'strap-side',side*half,y,-.10,
   .64,height,8.85);
  solidBlock(root,frame,'strap-anchor',side*half,y,-4.24,
   .82,height+.22,1.13);
 }
 solidBlock(root,elastic,'strap-back',0,y,4.29,half*2+.48,height,.62);
}
function makeOne(id:D2GoggleId,frame:THREE.Material,
 lens:THREE.Material,elastic:THREE.Material){
 const root=new THREE.Group();
 if(id==='goggles-low')low(root,frame,lens,elastic);
 else if(id==='goggles-field')field(root,frame,lens,elastic);
 else retro(root,frame,lens,elastic);
 strap(root,elastic,frame,id);
 return root;
}
export function createD2Goggles(
 id:D2GoggleId,frame:THREE.Material,
 lens:THREE.Material,elastic:THREE.Material
):THREE.Group{
 const root=new THREE.Group();root.name='d2-'+id;
 root.userData.modelAxes='-Z-forward,+X-right,+Y-up';
 for(const position of ['eyes','forehead','helmet','neck'] as const){
  const model=makeOne(id,frame,lens,elastic);
  model.name=id+'-'+position;
  model.userData.d2GogglePlacement=position;
  switch(position){
   case 'forehead':
    model.position.set(0,2.43,-.13);break;
   case 'helmet':
    model.position.set(0,3.83,-.52);model.scale.set(1.14,1,1.14);break;
   case 'neck':
    model.position.set(0,-5.42,1.08);model.scale.set(.93,.92,.91);break;
  }
  model.visible=position==='eyes';root.add(model);
 }
 return root;
}
