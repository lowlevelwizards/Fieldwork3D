/** Immutable-by-ownership start manifest for repeating a tactical mission.
 * Keep the resolved architecture, not only its seed: a future generator
 * revision must not silently turn RESTART into NEW SITE.
 *
 * Gameplay actors/doors/fog are re-created by newSession; never reuse a
 * mutated live Session or replay frame as a fresh mission.
 */
import type {Session} from './breach-game.ts';
import type {Site,SiteScale} from './breach-site.ts';

export type MissionStartSnapshot={
  variant:number;
  seed:number|undefined;
  site:Site|undefined;
  missionType:Session['missionType'];
  intelMode:Session['intel']['mode'];
  lightingMode:Session['lightingMode'];
  scale:SiteScale;
  entryId:string;
};

export function captureMissionStart(session:Session,
  fallbackScale:SiteScale,entryId='FRONT'):MissionStartSnapshot{
  return {
    variant:session.variant,
    seed:session.site?.seed,
    site:session.site?structuredClone(session.site):undefined,
    missionType:session.missionType,
    intelMode:session.intel.mode,
    lightingMode:session.lightingMode,
    scale:session.site?.scale??fallbackScale,
    entryId,
  };
}

/** Every restart receives its own copy; no session can mutate the manifest. */
export function siteForMissionRestart(start:MissionStartSnapshot):Site|undefined{
  return start.site?structuredClone(start.site):undefined;
}
