/** Stage 11 — common presentation animation frame contract.
 * Live tactical actors, replay tracks and all operator/weapon Labs supply
 * this same immutable-by-convention snapshot. Presentation may read it but
 * cannot author authoritative motor, projectile, injury or inventory state.
 *
 * Existing optional Lab-only fields remain opt-in; future unified pose solver
 * can consume this contract without importing visual rig construction.
 */
import type {PrecontactStyle} from './breach-idle-life.ts';
import type {DoorGripPose} from './breach-pose-door-hand.ts';
import type {PhysicalContact} from './breach-physical-contact-anchor.ts';
import type {V3ReloadCorridorProfile,V3MagazinePalm} from './breach-pose-v3-reload-choreography.ts';
import type {V3ReloadHold} from './breach-pose-v3-reload-weapon.ts';
import type {WeaponId} from './breach-combat.ts';
import type {SecondarySwitchState} from './secondary-switching.ts';
import type {SecondaryTimedReload} from './secondary-timed-reload.ts';
import type {LabPistolContacts} from './secondary-upper-body-pose.ts';
import type {ReplayFeet} from './breach-replay-motion.ts';
import type {MomentumEnvelope} from './breach-motion-transitions.ts';
import type {ReloadMode} from './breach-magazines.ts';
import type {BashRole,GlassBashContact} from './breach-contact-reactions.ts';
import type {Handling,HandlingIntent} from './breach-weapon-pose.ts';
import type {HandlingTransition} from './breach-handling-transition.ts';
import type {WoundRegion,FallPose} from './breach-wounds.ts';
import type {EquipmentLoadout} from './equipment-loadouts.ts';
import type {EquipmentInteractionPose} from './breach-equipment-interaction-pose.ts';
import type {CarryLocation,CarryPlacement} from './equipment-carry-placement.ts';
import type {WeaponConfiguration} from './equipment-weapon-assemblies.ts';
import type {WardrobeOptions} from './operator-wardrobe-data.ts';

import type {RetentionTransitionState} from './breach-weapon-retention-transition.ts';
import type {RetentionPoseMode} from './breach-weapon-retention-pose.ts';

export type OperatorPose={
  /** Explicit retention audition; live action migration is WR7–WR10. */
  retentionPreview?:RetentionPoseMode;
  /** Visual-only reciprocal transport, sampled from live/replay roster. */
  transportCarrier?:{mode:'carry'|'drag';target:{x:number;y:number}};
  transportedMode?:'carry'|'drag';
  /** Explicit fixed-step/replay sample; no renderer-owned timer. */
  retentionTransition?:RetentionTransitionState;
  /** Session owns the actual world primary, even while this actor uses a sidearm. */
  primaryGrounded?:boolean;
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
  /** Fixed-step cover-fitted drop; negative means a higher crouch. */
  coverStanceDrop?:number;
  /** Authoritative travel direction; optional until motion sampling is wired. */
  travelYaw?:number;
  /** Presentation-only clock advances during tactical pause, never the motor. */
  idleLifeSeconds?:number;
  /** Render-only, static armed pre-contact nuance. Never changes handling. */
  precontact?:PrecontactStyle;
  /** Render-only reconstructed feet and pose: no accumulated render state. */
  replayFeet?:ReplayFeet;deterministic?:boolean;pelvisYaw?:number;
  /** NPC-only visual state key. On an ordinary advancing render clock the
   * atomic pose publisher blends the last fully DISPLAYED anatomy into the
   * new state, including during interruptions. Explicit seeking remains
   * immediate/replay-safe; no simulation state or foot target is changed. */
  npcTransitionKey?:string;
  /** Duration of an NPC pose handoff, seconds (default .24). */
  npcTransitionDuration?:number;
  reload:number;reloadDuration:number;reloadMode?:ReloadMode|null;
  reloadRemoved?:boolean;reloadInserted?:boolean;lastThrowAt:number;
  lastDoorAt:number;doorPoint?:{x:number;y:number};
  /** Reachable real frame/corner where a hook throw's palm rests. */
  flashHookPoint?:{x:number;y:number};
  /** F6: real deployed pouch retrieval; presentation only. */
  equipmentInteraction?:EquipmentInteractionPose|null;
  /** D4 motor-owned active/releasing support hand attachment. */
  doorGrip?:DoorGripPose|null;
  /** A3.5: typed anchor from an existing simulation-owned contact. */
  physicalContact?:PhysicalContact|null;
  kickFoot?:0|1|null;
  /** Fixed at kick windup, never recomputed from a rotating door leaf. */
  kickImpactPoint?:{x:number;y:number}|null;
  doorMethod?:'open'|'close'|'kick'|'hold';down:boolean;
  lastBashAt?:number;bashRole?:BashRole;glassBashContact?:GlassBashContact|null;
  surrender:boolean;aiming:boolean;firing:boolean;turning:number;
  /** A separate Session-owned visual now represents this released firearm. */
  worldWeaponReleased?:boolean;
  restrained?:boolean;
  /** D15.5 conscious custodial gait; hand restraint stays, knees stand. */
  custodyWalking?:boolean;
  /** 0-1 visual weight transfer from kneeling to escorted standing. */
  custodyWalkBlend?:number;
  /** Lab preview only: choose an exact stock/weapon readiness posture. */
  handlingOverride?:Handling;
  handlingIntent?:HandlingIntent;threatRange?:number|null;
  /** A3.2 fixed-step physical stock/grip/muzzle lateral accommodation. */
  shoulderOffset?:number;
  /** Result of true weapon-clearance pullback, not cosmetic interpolation. */
  shoulderPullback?:number;
  handlingTransition?:HandlingTransition;
  obstruction?:boolean;friendlyNear?:boolean;friendlyAhead?:boolean;
  clearanceRetraction?:number;clearanceBlocked?:boolean;
  shortCompression?:number;
  /** Same physical clearance stage/source as the shot-time muzzle. */
  clearanceCarry?:Handling;clearanceShortFrom?:Handling;
  clearanceBlend?:number;
  blocked?:boolean;footAllowed?:(point:{x:number;y:number})=>boolean;
  gait?:'walk'|'run'|'pie'|'squeeze';
  /** 0-1 motor-owned vault phase, also restored during replay. */
  traversalProgress?:number;
  /** Recorded fixed-step draw fraction, never advanced by this renderer. */
  secondarySwitch?:SecondarySwitchState;
  /** Already authored fixed-step magazine retrieval, presentation only. */
  secondaryReload?:SecondaryTimedReload|null;
  /** Operator Lab-only high/low/retention hand posture; NEVER gameplay IK. */
  labPistolStance?:'high'|'low'|'ready'|'retention';
  /** Operator Lab-only visible barrel pitch; does not alter shot geometry. */
  labPistolPitch?:number;
  /** Lab-only physical art size. Live Glock holsters retain original scale. */
  labPistolScale?:number;
  /** Lab-only continuous transition into the selected readiness posture. */
  labPistolStanceBlend?:number;
  /** Lab-only authored model grip/slide contacts, never live ballistics. */
  labPistolContacts?:LabPistolContacts;
  /** Lab-only slide-rack hand choreography; gun mesh stays static. */
  labPistolSlideRack?:Readonly<{weight:number;pull:number}>|null;
  equipment?:EquipmentLoadout;flashCharges?:number;wedgeRemaining?:number;
  restraintRemaining?:number;
  medicalCarryLocation?:CarryLocation;utilityCarryLocation?:CarryLocation;
  magazineCarryLocations?:readonly CarryLocation[];
  /** Simulation-owned IDs and actual stowage, used for V4 handoff ONLY. */
  magazineCarryItems?:readonly Pick<CarryPlacement,'id'|'kind'|'location'>[];
  reloadSelectedMagazineId?:string|null;
  weaponConfiguration?:WeaponConfiguration;
  weaponLightOn?:boolean;
  nvgDeployed?:boolean;
  /** Presentation-only hand reach after real SECURE/FOLLOW GO contact. */
  civilianContactAge?:number;
  /** Unarmed neutral upper-body gesture: simulation state never changes. */
  civilianGesture?:'hands-up'|'head-cover'|'hands-behind';
  treatmentActive?:boolean;treatmentProgress?:number;
  lockpickActive?:boolean;lockpickProgress?:number;
  interactionCrouch?:number;
  treatmentPoint?:{x:number;y:number};
  /** Opt-in to contact-position weight transfer for lab candidate only. */
  hybridSupport?:boolean;
  acceleration?:number;
  /** Simulation-recorded time-decaying start/brake envelopes, presentation-only. */
  motionImpulse?:MomentumEnvelope;
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

