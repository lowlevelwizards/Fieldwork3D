import {packSocketsForStyle, type AuthoredPack, type PackSocket} from './operator-backpack-art.ts';
import type {WardrobeMountedKind} from './operator-wardrobe-mounts.ts';
/** Saved named mount selects a physical side. An incompatible or absent
 * socket means internal storage, not a substitute floating pouch. */
export function authoredCargoSocket(art:AuthoredPack|undefined,kind:WardrobeMountedKind,
 request:string|undefined,itemId:string){
 return art?findCargoSocket(art.style,art.sockets,kind,request,itemId):undefined;
}
export function authoredCargoSocketForStyle(style:string,kind:WardrobeMountedKind,
 request:string|undefined,itemId:string){
 return findCargoSocket(style,packSocketsForStyle(style),kind,request,itemId);
}
function findCargoSocket(style:string,sockets:readonly PackSocket[],kind:WardrobeMountedKind,
 request:string|undefined,itemId:string){
 if(!request)return undefined;
 const sign=request===kind+'-pack-left'?-1:request===kind+'-pack-right'?1:0;
 if(!sign)return undefined;
 const socketKind=kind==='utility'&&itemId==='utility-radio'&&style==='comms-pack'?'radio':kind;
 return sockets.find(s=>s.kind===socketKind&&s.normal[2]*sign>0);
}
