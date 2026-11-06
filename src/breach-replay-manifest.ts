/** Replay R2: stable world and presentation identity.
 * Persist the resolved site, not only the generator seed. Later generator
 * releases must not silently rewrite historical floor plans.
 */
import type {Session} from './breach-game.ts';
import type {Site} from './breach-site.ts';
import type {OperationDossierV1} from './briefing/briefing-types.ts';

export type ReplayActorIdentity={
  id:string;name:string;side:'blue'|'red';
  appearanceSeed:number;weapon:Session['operators'][number]['weapon'];
  equipment?:Session['operators'][number]['equipment'];
  wardrobe?:Session['operators'][number]['wardrobe'];
  weaponConfiguration?:Session['operators'][number]['weaponConfiguration'];
};

export type ReplayManifest={
  schemaVersion:2;
  variant:number;
  intelMode:Session['intel']['mode'];
  lightingMode:Session['lightingMode'];
  missionType:Session['missionType'];
  site:Site|null;
  dossier?:OperationDossierV1;
  actors:ReplayActorIdentity[];
};

export function captureReplayManifest(s:Session,
  preservedSite?:Site|null):ReplayManifest{
  return {
    schemaVersion:2,variant:s.variant,
    intelMode:s.intel.mode,lightingMode:s.lightingMode,
    missionType:s.missionType,
    dossier:s.operationDossier?structuredClone(s.operationDossier):undefined,
    // Static map geometry does not change during authoring. Reuse its
    // immutable initial copy when finalizing the manifest on first GO.
    site:preservedSite!==undefined?preservedSite:
      s.site?structuredClone(s.site):null,
    actors:s.operators.map(a=>({
      id:a.id,name:a.name,side:a.side,
      appearanceSeed:a.appearanceSeed,weapon:a.weapon,
      equipment:a.equipment?structuredClone(a.equipment):undefined,
      wardrobe:a.wardrobe?structuredClone(a.wardrobe):undefined,
      weaponConfiguration:a.weaponConfiguration?
        structuredClone(a.weaponConfiguration):undefined
    }))
  };
}
/** Applies only visual/identity facts. Never alter recorded health or tactics. */
export function applyReplayActorIdentity(s:Session,m:ReplayManifest|null):void{
  if(!m)return;
  const existing=new Map(s.operators.map(a=>[a.id,a]));
  for(const identity of m.actors){
    const a=existing.get(identity.id);
    if(!a)continue;
    a.name=identity.name;
    a.appearanceSeed=identity.appearanceSeed;
    a.weapon=identity.weapon;
    a.equipment=identity.equipment?structuredClone(identity.equipment):undefined;
    a.wardrobe=identity.wardrobe?structuredClone(identity.wardrobe):undefined;
    a.weaponConfiguration=identity.weaponConfiguration?
      structuredClone(identity.weaponConfiguration):undefined;
  }
}
