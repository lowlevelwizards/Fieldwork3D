/** Incremental session-owned geometry context, with no global binding switch.
 * Each Session gets an immutable wall snapshot and a reference to its live
 * mutable cover. Explicit consumers can query another session safely even
 * while legacy nav, LOS and rendering use breach-core's active geometry.
 *
 * This is a migration boundary, not an independent simulation or full
 * replacement for the legacy active-site collision index.
 */
import type {Session} from './breach-game.ts';
import {WALLS,activeGeometryRevision,type Segment,type Obstacle}
 from './breach-core.ts';
import type {Site} from './breach-site.ts';
export type SessionWorldGeometry={
 readonly site:Site|null;
 readonly walls:readonly Segment[];
 readonly cover:readonly Obstacle[];
 readonly initializedAtRevision:number;
};
const contexts=new WeakMap<Session,SessionWorldGeometry>();
/** The view is owned by its Session. Only the cover snapshot remains live
 * and mutable: it carries physical damage and furniture relocation.
 * Wall segments are snapshots and must never be used as a global binding.
 */
export function worldGeometryForQuery(s:Session):Pick<SessionWorldGeometry,'walls'|'cover'>{
 const {walls,cover}=sessionWorldGeometry(s);
 return {walls,cover};
}
/** Called once on authoritative session creation, after cover state is set. */
export function registerSessionWorldGeometry(s:Session):SessionWorldGeometry{
 const existing=contexts.get(s);if(existing)return existing;
 const walls=(s.site?.walls??WALLS).map(w=>({
  a:{...w.a},b:{...w.b}
 }));
 const context:SessionWorldGeometry={
  site:s.site??null,walls,cover:s.coverState,
  initializedAtRevision:activeGeometryRevision()
 };
 contexts.set(s,context);return context;
}
export function sessionWorldGeometry(s:Session):SessionWorldGeometry{
 return contexts.get(s)??registerSessionWorldGeometry(s);
}
