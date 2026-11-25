/** W1: one presentation owner per authoritative wall segment.
 * No knowledge or collision mutation; the scene's disclosure owner stays intact.
 */
import type {Segment} from '../breach-core.ts';
import {transitionWallOpacity} from '../breach-camera-occlusion.ts';

export type WallPiece<T>={mesh:T;segment:Segment;index:number;exterior:boolean};
export type WallPresentationOwner<T>={index:number;segment:Segment;exterior:boolean;pieces:T[];opacity:number};
export function groupWallPresentation<T>(pieces:readonly WallPiece<T>[]):WallPresentationOwner<T>[]{
 const owners=new Map<number,WallPresentationOwner<T>>();
 for(const piece of pieces){
  let owner=owners.get(piece.index);
  if(!owner){
   owner={index:piece.index,segment:piece.segment,exterior:piece.exterior,pieces:[],opacity:1};
   owners.set(piece.index,owner);
  }
  owner.pieces.push(piece.mesh);
 }
 return [...owners.values()];
}

export function resolveWallPresentation(previous:number,cut:boolean,dt:number,
 bodycam:boolean,director:boolean,xray:boolean,knownFacade:boolean,opaqueFacade=false){
 const opacity=bodycam?1:director?cut?.12:1:
  transitionWallOpacity(previous,cut,dt,xray?.19:.38);
 const translucent=opacity<.995;
 const surfaceTransparent=translucent||knownFacade&&!bodycam&&!opaqueFacade;
 return {opacity,transparent:surfaceTransparent,depthWrite:!translucent,
  renderOrder:surfaceTransparent?1001:0,
  role:surfaceTransparent?(translucent?'camera-wall-cutaway':'known-exterior-wall'):'opaque',
  patinaOpacity:Math.max(director?.08:.24,1-(1-opacity)*1.226)};
}
export function applyWallMaterialState(material:{transparent:boolean;depthWrite:boolean;opacity:number;needsUpdate:boolean},
 state:Pick<ReturnType<typeof resolveWallPresentation>,'transparent'|'depthWrite'|'opacity'>){
 // Only a shader/pass mode change invalidates the material program.
 if(material.transparent!==state.transparent){
  material.transparent=state.transparent;material.needsUpdate=true;
 }
 // Depth write is independent: known facades remain transparent when cut.
 material.depthWrite=state.depthWrite;
 material.opacity=state.opacity;
}
