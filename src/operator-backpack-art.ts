/** BP4/5: four independently authored, pack-local textile silhouettes.
 * +X bodyward. A model owns its contour, strap seats and exterior sockets;
 * its legacy inventory ID is deliberately unchanged until BP12.
 */
import * as THREE from 'three';
import {defaultPackMount,type PackMountSpec} from './operator-backpack-fit.ts';
import {packBox,packVolume,finishPackArtwork,type PackCut,type PackPoint,type PackMaterials} from './operator-backpack-geometry.ts';
import {attachPackGraphics,type PackGraphic} from './operator-backpack-graphics.ts';
export const AUTHORED_PACK_STYLES=['hydration','assault-panel','day-pack','assault-pack'] as const;
export type AuthoredPackStyle=typeof AUTHORED_PACK_STYLES[number];
export type PackSocket=Readonly<{id:string;point:PackPoint;normal:PackPoint;kind:'medical'|'utility'|'tie-down'}>;
export type AuthoredPack=Readonly<{style:AuthoredPackStyle;root:THREE.Group;mount:PackMountSpec;sockets:readonly PackSocket[]}>;
export function authoredPackStyle(style:string):AuthoredPackStyle|undefined{
 const id=style==='admin-pack'?'assault-panel':style;
 return (AUTHORED_PACK_STYLES as readonly string[]).includes(id)?id as AuthoredPackStyle:undefined;
}
/** A single chunky carry-loop cap instead of three tiny modeled bars. */
function handle(g:THREE.Group,m:PackMaterials,x:number,y:number,w:number){
 packBox(g,'carry-handle',m.trim,[x,y,0],[.9,.85,w]);
}
function compression(g:THREE.Group,m:PackMaterials,x:number,y:number,z:number,depth:number){
 packBox(g,'side-compression',m.trim,[x,y,z],[depth,1.05,.23]);
 packBox(g,'side-buckle',m.dark,[x-.25,y,z],[1.25,1.35,.48]);
}
export function buildAuthoredPack(style:AuthoredPackStyle,m:PackMaterials):AuthoredPack{
 const g=new THREE.Group();g.name='authored-pack-'+style;
 const sockets:PackSocket[]=[],graphics:PackGraphic[]=[];
 const box=(name:string,mat:THREE.Material,p:PackPoint,size:PackPoint)=>packBox(g,name,mat,p,size);
 const vol=(name:string,mat:THREE.Material,center:PackPoint,size:PackPoint,cut:PackCut,tile?:string)=>{
  packVolume(g,name,mat,center,size,cut);
  if(tile)graphics.push({tile,center,size,cut});
 };
 const mount=defaultPackMount(style);
 switch(style){
  case 'hydration':
   // One slim, long bladder, gently pinched top and base. No faux second pocket.
   vol('bladder-shell',m.fabric,[0,0,0],[2.6,11.8,6.0],{topWidth:.64,bottomWidth:.72,topDepth:.67,bottomDepth:.68},'hydration');
   handle(g,m,.24,5.77,2.7);
   break;
  case 'assault-panel':
   // Wide backing and three honest volumes; negative space makes the pouches read.
   box('carrier-backing',m.fabric,[1.35,0,0],[.7,10.4,11.5]);
   graphics.push({tile:'panel-backing',center:[1.35,0,0],size:[.7,10.4,11.5],flat:true});
   vol('upper-utility-compartment',m.fabric,[-.27,2.65,0],[2.55,4.15,10.1],{topWidth:.88,bottomWidth:.93,topDepth:.88},'panel-lid');
   box('upper-lid',m.trim,[-1.54,3.6,0],[.27,1.45,9.4]);
   for(const s of [-1,1]){
    vol('lower-segment',m.fabric,[-.40,-2.0,s*2.82],[2.75,4.9,4.55],{topWidth:.88,bottomWidth:.77,bottomDepth:.86},'panel-pouch');
   }
   break;
  case 'day-pack':{
   const body:PackPoint=[5.2,12.5,9.3],cut:PackCut={topWidth:.78,bottomWidth:.86,topDepth:.72,bottomDepth:.87};
   vol('main-shell',m.fabric,[0,0,0],body,cut);
   vol('upper-admin-pocket',m.fabric,[-2.72,3.05,0],[1.65,3.45,7.75],{topWidth:.84,bottomWidth:.95,topDepth:.86},'day-upper');
   vol('lower-organizer-pocket',m.fabric,[-2.94,-2.42,0],[2.65,6.55,8.65],{topWidth:.94,bottomWidth:.82,bottomDepth:.85},'day-lower');
   handle(g,m,.15,6.1,3.5);
   for(const s of [-1,1]){
    graphics.push({tile:'day-side',center:[0,0,0],size:body,cut,face:s<0?'left':'right'});
    compression(g,m,-.22,-1.15,s*4.68,4.15);
    sockets.push({id:s<0?'left-medical':'right-utility',point:[-.4,-1.5,s*4.75],normal:[0,0,s],kind:s<0?'medical':'utility'});
   }
   break;
  }
  case 'assault-pack':
   // The shoulder taper and deep rear face ARE the three-zip pack; no extra wings.
   vol('main-sculpted-shell',m.fabric,[0,-.15,0],[8.4,15,12.2],{topWidth:.69,bottomWidth:.65,topDepth:.74,bottomDepth:.67},'assault-y');
   vol('raised-upper-compartment',m.fabric,[-.9,5.65,0],[5.7,3.6,10.1],{topWidth:.73,bottomWidth:.95,topDepth:.73},'assault-lid');
   for(const s of [-1,1]){
    vol('integrated-side-pocket',m.fabric,[-.88,-3.45,s*5.95],[5.2,5.9,2.7],{topWidth:.78,bottomWidth:.73,bottomDepth:.78});
    compression(g,m,-.4,.95,s*6.15,5.25);
    sockets.push({id:s<0?'left-utility':'right-medical',point:[-.7,-2.5,s*7.3],normal:[0,0,s],kind:s<0?'utility':'medical'});
    // Attachment metadata only. No hidden back pad or empty modeled tie-down.
    sockets.push({id:'bottom-'+s,point:[-.2,-7.68,s*2.5],normal:[0,-1,0],kind:'tie-down'});
   }
   handle(g,m,.35,7.05,3.6);
   break;
 }
 // Authoring profile dimensions remain synchronized with each physical shell.
 g.userData.fieldworkPackStyle=style;g.userData.fieldworkPackSockets=sockets;
 finishPackArtwork(g);attachPackGraphics(g,graphics);
 return {style,root:g,mount,sockets};
}
