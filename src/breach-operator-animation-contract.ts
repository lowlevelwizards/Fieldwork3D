/** Stage 11 — common presentation animation frame contract.
 * Live tactical actors, replay tracks and all operator/weapon Labs supply
 * this same immutable-by-convention snapshot. Presentation may read it but
 * cannot author authoritative motor, projectile, injury or inventory state.
 *
 * Existing optional Lab-only fields remain opt-in; future unified pose solver
 * can consume this contract without importing visual rig construction.
 */
import type {PrecontactStyle} from './breach-idle-life.ts';
import type {V3ReloadCorridorProfile,V3MagazinePalm} from './breach-pose-v3-reload-choreography.ts';
import type {V3ReloadHold} from './breach-pose-v3-reload-weapon.ts';
import type {WeaponId} from './breach-combat.ts';
import type {ReplayFeet} from './breach-replay-motion.ts';
import type {ReloadMode} from './breach-magazines.ts';
import type {BashRole} from './breach-contact-reactions.ts';
import type {Handling,HandlingIntent} from './breach-weapon-pose.ts';
import type {HandlingTransition} from './breach-handling-transition.ts';
import type {WoundRegion,FallPose} from './breach-wounds.ts';
import type {EquipmentLoadout} from './equipment-loadouts.ts';
import type {CarryLocation,CarryPlacement} from './equipment-carry-placement.ts';
import type {WeaponConfiguration} from './equipment-weapon-assemblies.ts';
import type {WardrobeOptions} from './operator-wardrobe-data.ts';

export type OperatorPose={
  /** V3 whole-arm fitting; enabled by the live tactical renderer. */
  poseV3Preview?:boolean;
  /** Diagnostic-only: compare against the original strict contact budget. */
  poseV3StrictContact?:boolean;
  /** V4 rifle, hand, magazine and controls; enabled for live reloads. */
  poseV4ReloadPreview?:boolean;
  /** False in live gameplay: skip Lab-only debug arrays and snapshots. */
  poseDiagnostics?:boolean;
  /** Opt-in Lab reload corridor comparison; never read by game simulation. */
  poseV3ReloadCorridor?:V3ReloadCorridorProfile;
  /** B19 fixed-profile offline handling audition; only read in V3 Lab. */
  poseV3ReloadHold?:V3ReloadHold;
  /** B22 magazine-body grip, explicitly Lab-only and replay-time pure. */
  poseV3MagazinePalm?:V3MagazinePalm;
  x:number;z:number;heading:number;velocity:number;seconds:number;
  stride:number;posture:'stand'|'crouch';injury:number;weapon:WeaponId;
  /** Authoritative travel direction; optional until motion sampling is wired. */
  travelYaw?:number;
  /** Presentation-only clock advances during tactical pause, never the motor. */
  idleLifeSeconds?:number;
  /** Render-only, static armed pre-contact nuance. Never changes handling. */
  precontact?:PrecontactStyle;
  /** Render-only reconstructed feet and pose: no accumulated render state. */
  replayFeet?:ReplayFeet;deterministic?:boolean;pelvisYaw?:number;
  reload:number;reloadDuration:number;reloadMode?:ReloadMode|null;
  reloadRemoved?:boolean;reloadInserted?:boolean;lastThrowAt:number;
  lastDoorAt:number;doorPoint?:{x:number;y:number};
  doorMethod?:'open'|'close'|'kick'|'hold';down:boolean;
  lastBashAt?:number;bashRole?:BashRole;
  surrender:boolean;aiming:boolean;firing:boolean;turning:number;
  /** Lab preview only: choose an exact stock/weapon readiness posture. */
  handlingOverride?:Handling;
  handlingIntent?:HandlingIntent;threatRange?:number|null;
  handlingTransition?:HandlingTransition;
  obstruction?:boolean;friendlyNear?:boolean;
  clearanceRetraction?:number;clearanceBlocked?:boolean;
  shortCompression?:number;
  blocked?:boolean;footAllowed?:(point:{x:number;y:number})=>boolean;
  gait?:'walk'|'run'|'pie'|'squeeze';
  /** 0-1 motor-owned vault phase, also restored during replay. */
  traversalProgress?:number;
  equipment?:EquipmentLoadout;flashCharges?:number;
  medicalCarryLocation?:CarryLocation;utilityCarryLocation?:CarryLocation;
  magazineCarryLocations?:readonly CarryLocation[];
  /** Simulation-owned IDs and actual stowage, used for V4 handoff ONLY. */
  magazineCarryItems?:readonly Pick<CarryPlacement,'id'|'kind'|'location'>[];
  reloadSelectedMagazineId?:string|null;
  weaponConfiguration?:WeaponConfiguration;
  weaponLightOn?:boolean;
  treatmentActive?:boolean;treatmentProgress?:number;
  lockpickActive?:boolean;lockpickProgress?:number;
  interactionCrouch?:number;
  treatmentPoint?:{x:number;y:number};
  /** Opt-in to contact-position weight transfer for lab candidate only. */
  hybridSupport?:boolean;
  acceleration?:number;
  aimBlend?:number;recoil?:number;shotHeading?:number;
  hitFade?:number;hitAge?:number;downProgress?:number;flashActive?:boolean;
  hitRegion?:WoundRegion;hitYaw?:number;hitSeverity?:number;
  downPose?:FallPose;downClearance?:number;
  appearanceSeed?:number;
  faceStyle?:'blank'|'quiet'|'graphic';
  /** Only used in the Wardrobe Lab; never propagated to battle actors. */
  unarmedPreview?:boolean;
  wardrobe?:WardrobeOptions;
};

