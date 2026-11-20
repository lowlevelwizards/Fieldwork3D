/** Pure render-only ID index: mimic Array.find's first matching ID.
 * Reuse the passed Map across scene frames, but never mutate the authoritative
 * roster, door arrays or objects. Historical replay may replace every object
 * while retaining its ID, so always rebuild on each update.
 */
export function rebuildFrameIdIndex<T extends {id:string}>(
 target:Map<string,T>,items:readonly T[]):Map<string,T>{
 target.clear();
 for(const item of items)if(!target.has(item.id))target.set(item.id,item);
 return target;
}
