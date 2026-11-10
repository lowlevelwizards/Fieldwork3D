/** Explicit compatibility boundary for legacy single-active-site drawing.
 * Physical SessionWorldGeometry never activates or mutates global site state.
 * The owning mission/replay controller decides which Session can publish.
 */
import type {Session} from './breach-game.ts';
import {COVER,activeSite,activateSite,withTemporarySiteGeometry}
 from './breach-core.ts';

/** Global compatibility adapter tracks presentation ownership only. */
let presentationSession:Session|null=null;
export function setPresentationWorldSession(s:Session|null):void{
 presentationSession=s;
}
/** Only an explicit view transition may become the active presentation
 * owner. Physical session creation remains compatible with legacy clients;
 * replay/editor construction uses the detached scope below.
 */
export function adoptPresentationWorldSession(s:Session):void{
 activateSite(s.site??null);
 setPresentationWorldSession(s);
 publishSessionCoverToActiveSite(s);
}
/** Synchronous, exception-safe scope for constructing or inspecting a
 * background replay/editor session. Both the mutable geometry adapter AND
 * the owner token are restored, including when a nested audit throws.
 * Never use across await: the legacy adapter remains process-global.
 */
export function withDetachedPresentationWorld<T>(operation:()=>T):T{
 const priorSite=activeSite();
 const priorOwner=presentationSession;
 try{
  return withTemporarySiteGeometry(priorSite,operation);
 }finally{
  presentationSession=priorOwner;
 }
}


/** Presentation-only synchronization for the legacy active-site adapter.
 * Applying a physical change to a background/replay Session must NOT overwrite
 * the visible active site or its mutable global compatibility arrays.
 * Call only after a committed cover mutation, not on every simulation tick.
 */
export function publishSessionCoverToActiveSite(s:Session):void{
 if(presentationSession!==s||
    (activeSite()??null)!==(s.site??null))return;
 COVER.splice(0,COVER.length,...s.coverState);
}


