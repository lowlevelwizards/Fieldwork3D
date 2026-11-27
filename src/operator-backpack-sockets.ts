import type {AuthoredPack} from './operator-backpack-art.ts';
import type {WardrobeMountedKind} from './operator-wardrobe-mounts.ts';
/** Saved named mount selects a physical side. An incompatible or absent
 * socket means internal storage, not a substitute floating pouch. */
export function authoredCargoSocket(art:AuthoredPack|undefined,kind:WardrobeMountedKind,
 request:string|undefined,itemId:string){
 if(!art||!request)return undefined;
 const sign=request===kind+'-pack-left'?-1:request===kind+'-pack-right'?1:0;
 if(!sign)return undefined;
 const socketKind=kind==='utility'&&itemId==='utility-radio'&&art.style==='comms-pack'?'radio':kind;
 return art.sockets.find(s=>s.kind===socketKind&&s.normal[2]*sign>0);
}
