/** Empty/cosmetic mounting details; deliberately no gameplay capability,
 * magazine capacity, primary weapon or owned stock. */
import * as THREE from 'three';
import {mapBoxPixelUV} from './rendering/pixel-materials.ts';
import {consolidateVisualGroup} from './operator-visual-mesh-merge.ts';
import {bakeGearGeometryAO} from './operator-baked-gear-ao.ts';
export const WARDROBE_ACCESSORY_SLOTS=['beltLeft','beltRight','chest','pack'] as const;
export type WardrobeAccessorySlot=typeof WARDROBE_ACCESSORY_SLOTS[number];
export const WARDROBE_ACCESSORY_OPTIONS={
 beltLeft:['none','empty-holster','empty-dump','empty-pouch','utility-loop'],
 beltRight:['none','empty-holster','empty-dump','empty-pouch','utility-loop'],
 chest:['none','identification','fabric-tab','cord-loop','empty-admin'],
 pack:['none','compression','bedroll','empty-side-pouch','fabric-loop']
} satisfies Record<WardrobeAccessorySlot,readonly string[]>;
export type WardrobeAccessoryConfiguration=Record<WardrobeAccessorySlot,string>;
export const initialWardrobeAccessories=():WardrobeAccessoryConfiguration=>({
 beltLeft:'none',beltRight:'none',chest:'none',pack:'none'
});
export function readWardrobeAccessories(raw:unknown):WardrobeAccessoryConfiguration{
 const result=initialWardrobeAccessories();
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return result;
 const obj=raw as Record<string,unknown>;
 for(const slot of WARDROBE_ACCESSORY_SLOTS){
  const id=obj[slot];
  if(typeof id==='string'&&
    (WARDROBE_ACCESSORY_OPTIONS[slot] as readonly string[]).includes(id))
   result[slot]=id;
 }
 return result;
}
type GroupVariants=Record<string,THREE.Group>;
export type WardrobeAccessoryVisuals=Record<WardrobeAccessorySlot,GroupVariants>;
const part=(g:THREE.Group,m:THREE.Material,x:number,y:number,z:number,
 w:number,h:number,d:number)=>{
 const geometry=mapBoxPixelUV(new THREE.BoxGeometry(w,h,d),w,h,d);
 bakeGearGeometryAO(geometry,m);
 const mesh=new THREE.Mesh(geometry,m);
 mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);
};
export function createWardrobeAccessoryVisuals(
 chest:THREE.Group,hip:THREE.Group,pack:THREE.Mesh,
 gear:THREE.Material,dark:THREE.Material,trim:THREE.Material
):WardrobeAccessoryVisuals{
 const result={
  beltLeft:{},beltRight:{},chest:{},pack:{}
 } as WardrobeAccessoryVisuals;
 for(const slot of WARDROBE_ACCESSORY_SLOTS){
  const parent=slot==='chest'?chest:slot==='pack'?pack:hip;
  for(const name of WARDROBE_ACCESSORY_OPTIONS[slot]){
   const g=new THREE.Group();g.visible=false;parent.add(g);result[slot][name]=g;
   const sign=slot==='beltLeft'?-1:1,z=sign*8.25;
   if(slot==='beltLeft'||slot==='beltRight'){
    if(name==='empty-holster')
     part(g,dark,-.45,-3.35,z,3.0,5.0,1.1);
    if(name==='empty-dump')
     part(g,gear,-.8,-4.0,z,3.3,4.6,2.7);
    if(name==='empty-pouch')
     part(g,gear,-.5,-3.2,z,2.7,3.4,2.2);
    if(name==='utility-loop'){
     part(g,trim,-.4,-3.2,z,2.7,.6,1.5);
     part(g,trim,-.4,-5.3,z,2.7,.6,1.5);
    }
   }else if(slot==='chest'){
    if(name==='identification')
     part(g,trim,8.15,3.0,0,.3,.9,3.2);
    if(name==='fabric-tab')
     part(g,gear,7.95,4.0,3.5,.5,2.3,1.5);
    if(name==='cord-loop')
     part(g,dark,7.95,3.8,-3.3,.6,1.6,.9);
    if(name==='empty-admin')
     part(g,gear,8.8,-1.1,0,1.0,2.3,5.2);
   }else{
    if(name==='compression')for(const side of [-1,1])
     part(g,trim,-4.1,2.2,side*3.0,.45,11.2,.6);
    if(name==='bedroll')
     part(g,gear,-2.65,8.4,0,3.9,2.7,9.4);
    if(name==='empty-side-pouch')
     part(g,gear,-1.25,-2.8,8.0,2.6,4.3,2.3);
    if(name==='fabric-loop')
     part(g,trim,-4.35,1.3,0,.45,1.0,5.4);
   }
   consolidateVisualGroup(g);
  }
 }
 return result;
}
export function updateWardrobeAccessories(v:WardrobeAccessoryVisuals,
 chosen:WardrobeAccessoryConfiguration){
 for(const slot of WARDROBE_ACCESSORY_SLOTS)
  for(const [id,g] of Object.entries(v[slot]))g.visible=chosen[slot]===id;
}
