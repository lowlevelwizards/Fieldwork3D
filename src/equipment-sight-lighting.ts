/** Build 26.03: bounded, fixed-step light-sensitive visual acquisition.
 * Illumination can only scale acquisition once physical sight is already valid.
 * It NEVER creates a contact, shares enemy truth, or reveals fog by itself.
 */
import type {Session} from './breach-game.ts';
import {planSiteLighting,type LightingMode,
 type SiteLightingProgram} from './equipment-site-lighting.ts';
import {buildIlluminationBlockers,illuminationAt}
 from './equipment-light-field.ts';
import {activeWeaponLightSources} from './equipment-portable-light-sources.ts';

/** Always permits slow visual acquisition at close range in ambient darkness.
 * Midday brightness exactly preserves the pre-lighting sight timings.
 */
export function lightVisibilityGain(illumination:number):number{
 const level=Number.isFinite(illumination)?Math.max(0,Math.min(1,illumination)):0;
 return .30+.70*Math.min(1,level/.67);
}

type Snapshot={bucket:number;revision:number;mode:LightingMode;
 levels:ReadonlyMap<string,number>};
const snapshots=new WeakMap<Session,Snapshot>();
const fixtures=new WeakMap<NonNullable<Session['site']>,
 Map<LightingMode,SiteLightingProgram>>();
const NO_LEVELS:ReadonlyMap<string,number>=new Map();
/** Shares one eight-Hz field sample across every observer/subject pairing. */
export function actorLightingLevels(session:Session):ReadonlyMap<string,number>{
 const site=session.site;
 if(!site)return NO_LEVELS;
 const bucket=Math.floor(session.seconds*8);
 const cached=snapshots.get(session);
 if(cached&&cached.bucket===bucket&&cached.revision===session.objectRevision&&
   cached.mode===session.lightingMode)return cached.levels;
 let modes=fixtures.get(site);
 if(!modes){modes=new Map();fixtures.set(site,modes);}
 let program=modes.get(session.lightingMode);
 if(!program){program=planSiteLighting(site,session.lightingMode);
  modes.set(session.lightingMode,program);}
 // Doors and movable tall cover block a light just as they block the beam.
 const blockers=buildIlluminationBlockers(site.walls,session.doors,
  session.coverState);
 const sources=[...program.sources,
  ...activeWeaponLightSources(session.operators,session.doors)];
 const levels=new Map<string,number>();
 for(const actor of session.operators){
  if(actor.health<=0)continue;
  levels.set(actor.id,illuminationAt(actor.p,sources,blockers,program.ambient));
 }
 snapshots.set(session,{bucket,revision:session.objectRevision,
  mode:session.lightingMode,levels});
 return levels;
}
