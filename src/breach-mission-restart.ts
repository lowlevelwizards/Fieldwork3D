/** Immutable-by-ownership start manifest for repeating a tactical mission.
 * Keep the resolved architecture, not only its seed: a future generator
 * revision must not silently turn RESTART into NEW SITE.
 *
 * Gameplay actors/doors/fog are re-created by newSession; never reuse a
 * mutated live Session or replay frame as a fresh mission.
 */
import type {Session,TeamActor} from './breach-game.ts';
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
  squad:TeamActor[];
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
    // Capture real starting kit, health, stance, identities and insertion.
    // Planned orders are deliberately discarded during restoration.
    squad:session.operators.filter(a=>a.side==='blue').map(a=>structuredClone(a)),
  };
}

/** Every restart receives its own copy; no session can mutate the manifest. */
export function siteForMissionRestart(start:MissionStartSnapshot):Site|undefined{
  return start.site?structuredClone(start.site):undefined;
}

/** Starting kit and identity must be what the player deployed with, not
 * an outfit/loadout edited after the mission began. Runtime actor state is
 * freshly constructed first, then only the squad's pre-GO setup is restored.
 */
export function restoreMissionStartingTeam(session:Session,
  start:MissionStartSnapshot):void{
  const initial=new Map(start.squad.map(a=>[a.id,a]));
  for(const actor of session.operators){
    if(actor.side!=='blue')continue;
    const original=initial.get(actor.id);
    if(!original)continue;
    Object.assign(actor,structuredClone(original),{
      plan:[],history:{undo:[],redo:[]},path:[],nav:[],activeNode:-1,
    });
  }
}
