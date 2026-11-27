/** BP4/5: four independently authored, pack-local textile silhouettes.
 * +X bodyward. A model owns its contour, strap seats and exterior sockets;
 * its legacy inventory ID is deliberately unchanged until BP12.
 */
import * as THREE from 'three';
import {defaultPackMount,type PackMountSpec} from './operator-backpack-fit.ts';
import {packBox,packVolume,packWebbing,finishPackArtwork,type PackPoint,type PackMaterials} from './operator-backpack-geometry.ts';
export const AUTHORED_PACK_STYLES=['hydration','assault-panel','day-pack','assault-pack'] as const;
export type AuthoredPackStyle=typeof AUTHORED_PACK_STYLES[number];
export type PackSocket=Readonly<{id:string;point:PackPoint;normal:PackPoint;kind:'medical'|'utility'|'tie-down'}>;
export type AuthoredPack=Readonly<{style:AuthoredPackStyle;root:THREE.Group;mount:PackMountSpec;sockets:readonly PackSocket[]}>;
export function authoredPackStyle(style:string):AuthoredPackStyle|undefined{
 const id=style==='admin-pack'?'assault-panel':style;
 return (AUTHORED_PACK_STYLES as readonly string[]).includes(id)?id as AuthoredPackStyle:undefined;
}
const rear:PackPoint=[-1,0,0];
function handle(g:THREE.Group,m:PackMaterials,x:number,y:number,w:number){
 for(const s of [-1,1])packBox(g,'handle-leg',m.trim,[x,y+.23,s*w*.5],[.32,.66,.48]);
 packBox(g,'handle-top',m.trim,[x,y+.63,0],[.35,.38,w+.48]);
}
function line(g:THREE.Group,m:THREE.Material,id:string,points:readonly PackPoint[],width=.25,normal:PackPoint=rear){
 for(let i=1;i<points.length;i++)packWebbing(g,id+'-'+i,m,points[i-1],points[i],width,.075,normal);
}
function pull(g:THREE.Group,m:PackMaterials,p:PackPoint){packBox(g,'zipper-pull',m.trim,p,[.24,.52,.37]);}
function compression(g:THREE.Group,m:PackMaterials,x:number,y:number,z:number,depth:number){
 packBox(g,'side-compression',m.trim,[x,y,z],[depth,.55,.18]);
 packBox(g,'side-buckle',m.dark,[x-.35,y,z],[.68,.75,.32]);
}
function rows(g:THREE.Group,m:PackMaterials,x:number,ys:readonly number[],width:number){
 // Graphic sewn bands, not individually modeled MOLLE loops.
 for(const y of ys)packBox(g,'webbing-row',m.trim,[x,y,0],[.075,.30,width]);
}
export function buildAuthoredPack(style:AuthoredPackStyle,m:PackMaterials):AuthoredPack{
 const g=new THREE.Group();g.name='authored-pack-'+style;
 const sockets:PackSocket[]=[];
 const box=(name:string,mat:THREE.Material,p:PackPoint,size:PackPoint)=>packBox(g,name,mat,p,size);
 const vol=(name:string,mat:THREE.Material,p:PackPoint,size:PackPoint,cut:Parameters<typeof packVolume>[5])=>packVolume(g,name,mat,p,size,cut);
 const mount=defaultPackMount(style);
 switch(style){
  case 'hydration':
   vol('bladder-shell',m.fabric,[0,0,0],[2.4,10,6.8],{topWidth:.74,bottomWidth:.82,topDepth:.82});
   vol('lower-bladder-face',m.fabric,[-1.2,-.65,0],[.65,6.4,5.75],{topWidth:.91,bottomWidth:.85});
   line(g,m.dark,'bladder-access',[[-1.30,3.65,-2.25],[-1.30,3.65,2.25],[-1.49,2.7,2.65]],.27);
   pull(g,m,[-1.55,2.68,2.65]);
   box('hose-port',m.dark,[.3,4.6,2.0],[.56,.57,.78]);
   handle(g,m,.1,4.85,2.25);
   break;
  case 'assault-panel':
   box('carrier-backing',m.fabric,[1.26,0,0],[.88,9.7,10.7]);
   for(const s of [-1,1]){
    box('vertical-attachment-tape',m.dark,[.85,0,s*5.15],[.48,9.25,.44]);
    box('attachment-slider',m.trim,[.6,3.9,s*5.15],[.46,.55,.62]);
   }
   vol('upper-utility-compartment',m.fabric,[-.24,2.55,0],[2.5,3.85,9.65],{topWidth:.91,bottomWidth:.97,topDepth:.9});
   box('upper-lid',m.trim,[-1.53,3.43,0],[.25,1.40,9.45]);
   line(g,m.dark,'lid-seam',[[-1.70,2.72,-4.3],[-1.70,2.72,4.3]],.21);
   for(const s of [-1,1]){
    vol('lower-segment',m.fabric,[-.46,-1.85,s*2.45],[2.68,4.64,4.50],{topWidth:.92,bottomWidth:.89});
    box('pouch-flap',m.trim,[-1.86,-.22,s*2.45],[.21,1.05,4.16]);
    box('closure',m.dark,[-2,-.82,s*2.45],[.17,.67,.65]);
   }
   break;
  case 'day-pack':
   vol('main-shell',m.fabric,[0,0,0],[5.2,10.8,10.2],{topWidth:.84,bottomWidth:.93,topDepth:.82});
   vol('upper-admin-pocket',m.fabric,[-2.68,2.65,0],[1.34,3.22,8.35],{topWidth:.91,bottomWidth:.96});
   vol('lower-organizer-pocket',m.fabric,[-2.77,-2.22,0],[2.08,5.65,9.14],{topWidth:.93,bottomWidth:.89});
   line(g,m.dark,'admin-zip',[[-3.40,3.55,-3.55],[-3.40,3.55,3.55]],.24);
   pull(g,m,[-3.45,3.35,3.55]);
   line(g,m.dark,'organizer-zip',[[-3.87,-.15,-3.94],[-3.87,.25,-3.58],[-3.87,.25,3.58],[-3.87,-.15,3.94]],.23);
   pull(g,m,[-3.92,-.23,3.94]);
   rows(g,m,-3.87,[-1.35,-2.2,-3.05,-3.9],7.55);
   handle(g,m,.15,5.2,3.4);
   for(const s of [-1,1]){
    line(g,m.dark,'main-compartment-seam',[[.75,4.15,s*4.55],[.75,2.4,s*5.15],[.75,-4.2,s*5.15]],.26,[0,0,s]);
    compression(g,m,-.35,1.15,s*5.18,3.9);
    compression(g,m,-.35,-3.4,s*5.18,3.9);
    sockets.push({id:s<0?'left-medical':'right-utility',point:[-.4,-1.5,s*5.2],normal:[0,0,s],kind:s<0?'medical':'utility'});
   }
   break;
  case 'assault-pack':
   vol('main-sculpted-shell',m.fabric,[0,-.15,0],[7,13.2,12],{topWidth:.72,bottomWidth:.76,topDepth:.68});
   vol('raised-upper-compartment',m.fabric,[-1.05,4.85,0],[5.05,2.85,9.8],{topWidth:.8,bottomWidth:.95,topDepth:.76});
   // Broad front wings form the characteristic Y face, rather than flat decals.
   for(const s of [-1,1]){
    vol('zip-wing',m.fabric,[-3.05,-.32,s*2.44],[1.47,9.1,5.15],{topWidth:.9,bottomWidth:.79,topDepth:.82});
    vol('integrated-side-pocket',m.fabric,[-.75,-3.2,s*5.64],[4.6,5.25,1.9],{topWidth:.86,bottomWidth:.79});
    line(g,m.dark,'y-zip-branch',[[-3.80,3.77,s*4.4],[-3.90,1.60,s*2.15],[-3.95,.05,0]],.36);
    for(const y of [1.85,-3.9])compression(g,m,-.45,y,s*6.1,4.9);
    sockets.push({id:s<0?'left-utility':'right-medical',point:[-.75,-2.3,s*6.65],normal:[0,0,s],kind:s<0?'utility':'medical'});
   }
   line(g,m.dark,'y-zip-stem',[[-3.96,.05,0],[-3.96,-4.9,0],[-3.70,-5.6,0]],.36);
   pull(g,m,[-4.0,.28,.28]);
   line(g,m.dark,'lid-zip',[[-3.64,5.0,-3.65],[-3.64,5.0,3.65]],.27);
   pull(g,m,[-3.72,4.8,3.65]);
   handle(g,m,.5,6.1,3.5);
   for(const s of [-1,1]){
    box('bottom-tie-down',m.trim,[-.2,-6.62,s*2.8],[4.3,.22,.55]);
    sockets.push({id:'bottom-'+s,point:[-.2,-6.76,s*2.8],normal:[0,-1,0],kind:'tie-down'});
    vol('back-padding',m.trim,[3.24,-.2,s*2.7],[.48,8.8,2.65],{topWidth:.82,bottomWidth:.82});
   }
   break;
 }
 // The sculpted assault padding extends slightly toward the wearer.
 const fittedMount=style==='assault-pack'?{...mount,bodyFaceX:3.5}:mount;
 g.userData.fieldworkPackStyle=style;g.userData.fieldworkPackSockets=sockets;
 finishPackArtwork(g);
 return {style,root:g,mount:fittedMount,sockets};
}
