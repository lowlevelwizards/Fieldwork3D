/** Sound Lab: stable semantic cue registry.
 * "live" = the current tactical client has a real event hook.
 * "planned" = an auditionable candidate, never synthesized by polling gameplay.
 * Adding a catalog item is not a claim that the game emits that event yet.
 */
export type SoundFamily='ui'|'cloth'|'step'|'metal'|'mechanism'|'door'|'impact'|
  'shot'|'blast'|'voice'|'ambient'|'glass'|'wood'|'water'|'electronic';
export type Variant='A'|'B'|'C';
export type SoundEntry={id:string;label:string;group:string;family:SoundFamily;
  status:'live'|'planned';description:string};
export type SoundSettings={
  gain:number;pitch:number;length:number;noise:number;punch:number;
  brightness:number;tail:number;room:number;
};
export type SoundChoice={enabled:boolean;choice:Variant;
  reviewed?:boolean;favorite?:boolean;
  edits?:Partial<Record<Variant,SoundSettings>>};
export type SoundPack={version:1;master:number;choices:Record<string,SoundChoice>};
export const SOUND_STORAGE_KEY='fieldwork3d.soundlab.pack.v1';
export const SOUND_VARIANTS=['A','B','C'] as const;
export const SOUND_GROUPS=[
 ['ui','Interface & HUD'],['orders','Planning & commands'],
 ['movement','Movement & clothing'],['equipment','Weapons & equipment'],
 ['weapons','Gunfire & ballistics'],['impacts','Impact materials'],
 ['doors','Doors & openings'],['combat','Combat & injuries'],
 ['people','Enemies & civilians'],['environment','Environments'],
 ['mission','Mission flow & campaign'],['replay','Replay & tools']
] as const;
type RawGroup={group:string;family:SoundFamily;items:string;live?:string};
const data:RawGroup[]=[
 {group:'ui',family:'ui',live:'select,confirm,go,pause,warning',items:`
select|Select operator;confirm|Confirm command;go|GO / execute;pause|Pause;warning|Warning;cancel|Cancel;back|Back;toggle|Toggle;tab|Switch tab;open_sheet|Open panel;close_sheet|Close panel;hover|Hover / focus;slider|Slider tick;error|Invalid action;success|Success;notification|Notification;save|Save;delete|Delete;undo|Undo;redo|Redo;zoom|Camera zoom;camera|Camera reset;intel|Intel mode;timer|Countdown tick
`},
 {group:'orders',family:'ui',items:`
waypoint|Add waypoint;move_node|Move waypoint;remove_node|Remove waypoint;route_draw|Draw route;look|Look direction;watch|Watch angle;release_watch|Release watch;wait|Wait order;sync|Sync order;stack|Stack ready;engage|Engage policy;return_fire|Return fire;suppress|Suppress;hold_fire|Hold fire;stance|Posture change;run|Run order;walk|Walk order;order_accepted|Order accepted;order_failed|Order rejected
`},
 {group:'movement',family:'step',live:'boot',items:`
boot|Generic boot step;tile|Tile step;wood_floor|Wood floor step;concrete|Concrete step;carpet|Carpet step;metal_floor|Metal grating step;gravel|Gravel step;dirt|Dirt step;mud|Mud step;water_shallow|Shallow water step;glass_shards|Glass crunch;stairs|Stair step;sprint|Sprint step;crouch|Crouched footfall;shuffle|Shuffle / stack;turn|Pivot step;stop|Hard stop;land|Landing;vault|Vault / mantle;climb|Climb;gear_rattle|Running gear rattle;cloth|Clothing rustle;armor_shift|Armor shift;breath|Breathing
`},
 {group:'equipment',family:'mechanism',live:'reload,flash_throw',items:`
reload|Reload cycle;mag_out|Magazine out;mag_in|Magazine seat;bolt_release|Bolt release;charging_handle|Charging handle;safety|Safety selector;dry_fire|Dry trigger;empty_click|Empty magazine click;weapon_raise|Weapon raise;weapon_lower|Weapon lower;weapon_swap|Weapon swap;flash_throw|Flashbang throw;flash_pin|Flash pin;flash_bounce|Flash bounce;radio_click|Radio PTT;radio_static|Radio static;med_kit|Medical kit;bandage|Bandage wrap;plate_impact|Armor strike;kit_pickup|Pick up equipment;rig_buckle|Buckle;zipper|Zipper;holster|Holster;flashlight_click|Weapon light switch;mag_drop|Dropped magazine;case_drop|Casing bounce
`},
 {group:'weapons',family:'shot',live:'smg,carbine,rifle,shotgun,smg_suppressed,carbine_suppressed,rifle_suppressed,shotgun_suppressed',items:`
smg|SMG shot;carbine|Carbine shot;rifle|Rifle shot;shotgun|Shotgun blast;smg_suppressed|Suppressed SMG;carbine_suppressed|Suppressed carbine;rifle_suppressed|Suppressed rifle;shotgun_suppressed|Suppressed shotgun;pistol|Pistol shot;pistol_suppressed|Suppressed pistol;burst|Short burst;automatic|Automatic fire;distant_fire|Distant gunfire;indoor_tail|Indoor gunfire tail;outdoor_tail|Outdoor gunfire tail;ricochet|Ricochet;bullet_whiz|Bullet flyby;subsonic|Subsonic shot;shotgun_pump|Shotgun pump;bolt_cycle|Rifle bolt;mech_cycle|Action cycling;muzzle_pop|Muzzle pop
`},
 {group:'impacts',family:'impact',live:'body_hit',items:`
body_hit|Audible close impact;concrete|Concrete bullet impact;brick|Brick chip;drywall|Drywall impact;plaster|Plaster crumble;wood|Wood splinter;metal|Metal strike;glass|Glass hit;glass_break|Glass shatter;car_glass|Vehicle glass;tile|Tile break;dirt|Dirt strike;water|Water splash;armor|Ballistic armor impact;furniture|Furniture hit;debris|Falling debris;ricochet|Metal ricochet;bullet_thud|Low-frequency bullet impact
`},
 {group:'doors',family:'door',live:'open,close,kick_resisted,forced_open,kick',items:`
open|Door open;close|Door close;creak|Door creak;handle|Handle turn;latch|Latch;unlock|Unlock;lock|Lock;hinge|Hinge squeak;kick|Door kick;kick_resisted|Failed door kick;forced_open|Force door open;battering_ram|Ram strike;breach_charge|Breaching charge;wood_break|Door wood fracture;metal_door|Heavy metal door;double_door|Double doors;glass_door|Glass door;window_open|Open window;window_break|Break window;wedge|Door wedge;door_bump|Body pushes door;door_slam|Door slam
`},
 {group:'combat',family:'impact',live:'flash,hit,flash_out',items:`
flash|Flashbang detonation;flash_out|Flashbang thrown;hit|Visible impact;injured|Injury grunt;heavy_wound|Heavy wound;incapacitated|Incapacitated;death|Death fall;melee|Melee shove;buttstroke|Weapon butt strike;stagger|Stagger;knockback|Knockback;body_fall|Body falls;helmet_hit|Helmet impact;suppression|Suppression near miss;stun|Stun reaction;recover|Recovery;casualty_drag|Drag casualty;revive|Medical intervention;blood_drop|Blood drip;spent_casing|Casing scatter
`},
 {group:'people',family:'voice',live:'surrender',items:`
surrender|Surrender cue;enemy_alert|Enemy alerted;enemy_suspicious|Suspicion;enemy_spot|Enemy spots operator;enemy_callout|Enemy callout;enemy_pain|Enemy pain;enemy_flee|Enemy flees;enemy_reloading|Enemy reload;enemy_search|Enemy searching;civilian_gasp|Civilian gasp;civilian_scream|Civilian scream;civilian_cry|Civilian distress;civilian_compliance|Civilian complies;civilian_restrained|Civilian restrained;civilian_release|Civilian released;operator_contact|Contact call;operator_clear|Room clear;operator_reloading|Reloading call;operator_injured|Operator wounded;operator_stack|Stack up;radio_report|Radio report
`},
 {group:'environment',family:'ambient',items:`
room_tone|Interior room tone;office_hum|Office equipment;retail_hum|Shop floor;vent|Ventilation fan;fluorescent|Fluorescent light;electric_buzz|Electric buzz;refrigerator|Refrigeration;rain|Rainfall;rain_roof|Rain on roof;thunder|Distant thunder;wind|Exterior wind;leaves|Wind in leaves;birds|Birds;traffic|Distant traffic;vehicle_idle|Engine idling;alarm|Security alarm;smoke_alarm|Smoke alarm;fire_crackle|Small fire;water_drip|Water drip;pipe|Pipes ticking;floor_creak|Building settling;dog_bark|Distant barking;distant_sirens|Distant siren;crowd_murmur|Crowd ambience
`},
 {group:'mission',family:'ui',items:`
deployment|Deployment begins;mission_start|Mission start;objective_update|Objective update;objective_complete|Objective complete;objective_failed|Objective failed;contact_report|Contact report;intel_discovered|New intel;reinforcements|Reinforcements;extraction|Extraction;mission_success|Mission success;mission_failure|Mission failure;debrief|After-action report;grade_reveal|Grade revealed;campaign_reward|Campaign reward;purchase|Purchase;resupply|Resupply;equipment_saved|Equipment saved;operator_hired|Recruit hired;operator_lost|Operator lost;campaign_warning|Campaign warning;loading_progress|Loading checkpoint
`},
 {group:'replay',family:'electronic',items:`
play|Replay play;pause|Replay pause;seek|Replay seek;step|Frame step;speed|Replay speed change;marker|Jump to event;bookmark|Save bookmark;favorite|Favorite mission;export|Export file;export_done|Export complete;record_start|Recording start;record_stop|Recording stop;clip|Video clip saved;rewind|Rewind;retry|Replay from here
`}
];
const familyOverrides:Record<string,SoundFamily>={
 'movement.cloth':'cloth','movement.gear_rattle':'metal','movement.armor_shift':'metal',
 'movement.breath':'voice','equipment.radio_static':'electronic',
 'equipment.radio_click':'electronic','equipment.med_kit':'cloth',
 'equipment.bandage':'cloth','equipment.mag_drop':'metal','equipment.case_drop':'metal',
 'weapons.ricochet':'metal','weapons.bullet_whiz':'electronic',
 'doors.glass_door':'glass','doors.window_break':'glass','doors.wood_break':'wood',
 'impacts.glass':'glass','impacts.glass_break':'glass','impacts.car_glass':'glass',
 'impacts.wood':'wood','impacts.water':'water','impacts.ricochet':'metal',
 'combat.flash':'blast','combat.flash_out':'mechanism','combat.injured':'voice',
 'combat.heavy_wound':'voice','combat.incapacitated':'voice','combat.death':'voice',
 'people.surrender':'voice','environment.alarm':'electronic',
 'environment.smoke_alarm':'electronic',
 'mission.contact_report':'electronic'
};
export const SOUND_CATALOG:SoundEntry[]=data.flatMap(g=>{
 const live=new Set((g.live??'').split(',').filter(Boolean));
 return g.items.trim().split(';').map(x=>{
  const [name,label]=x.trim().split('|');
  const id=g.group+'.'+name;
  return {id,label,group:g.group,
   family:familyOverrides[id]??g.family,
   status:live.has(name)?'live' as const:'planned' as const,
   description:live.has(name)?'Connected to a current mission cue':
    'Audition-only until an appropriate simulation event is wired'};
 });
});
export const SOUND_BY_ID=new Map(SOUND_CATALOG.map(e=>[e.id,e]));
const basis:Record<SoundFamily,[number,number,number,number,number]>={
 ui:[430,.11,.08,.55,.65],cloth:[170,.18,.62,.25,.32],
 step:[102,.12,.48,.76,.38],metal:[590,.24,.69,.73,.74],
 mechanism:[340,.15,.36,.76,.64],door:[145,.35,.49,.73,.38],
 impact:[220,.18,.72,.90,.66],shot:[118,.42,.84,1,.71],
 blast:[85,1.05,.93,1,.89],voice:[170,.32,.24,.45,.4],
 ambient:[118,1.65,.78,.24,.46],glass:[1180,.43,.78,.60,.94],
 wood:[220,.25,.62,.78,.5],water:[410,.48,.88,.38,.74],
 electronic:[690,.22,.16,.45,.94]
};
export function defaultSoundSettings(entry:SoundEntry,variant:Variant):SoundSettings{
 const [frequency,duration,noise,punch,brightness]=basis[entry.family];
 // Small stable per-event differences avoid every sound in a family being identical.
 let seed=0;for(const char of entry.id)seed=(seed*31+char.charCodeAt(0))>>>0;
 const d=((seed%83)-41)/250,f=1+((seed>>>8)%37-18)/100;
 const v=variant==='A'?{p:1.13,n:.68,l:.78,b:.87,t:.27,r:.04,g:.48}:
  variant==='B'?{p:.90,n:1.02,l:1.05,b:1.01,t:.47,r:.12,g:.54}:
  {p:1.00,n:1.22,l:1.26,b:1.16,t:.75,r:.3,g:.50};
 return {
  gain:v.g,pitch:Math.max(45,Math.min(2400,Math.round(frequency*f*v.p))),
  length:Math.max(.035,Math.min(3.8,duration*v.l*(1+d))),
  noise:Math.min(1,noise*v.n),punch,
  brightness:Math.min(1,brightness*v.b),
  tail:v.t,room:v.r
 };
}
export function defaultSoundPack():SoundPack{
 return {version:1,master:.70,choices:Object.fromEntries(
  SOUND_CATALOG.map(e=>[e.id,{enabled:e.status==='live',choice:'B'}]))};
}
export function clampSoundSettings(input:unknown,base:SoundSettings):SoundSettings{
 const obj=input&&typeof input==='object'?input as Record<string,unknown>:{};
 const field=(key:keyof SoundSettings,min:number,max:number)=>{
  const v=obj[key];return typeof v==='number'&&Number.isFinite(v)?
   Math.max(min,Math.min(max,v)):base[key];
 };
 return {gain:field('gain',0,1),pitch:field('pitch',45,2400),
  length:field('length',.035,3.8),noise:field('noise',0,1),
  punch:field('punch',0,1),brightness:field('brightness',0,1),
  tail:field('tail',0,1),room:field('room',0,1)};
}
export function normalizeSoundPack(value:unknown):SoundPack{
 const defaults=defaultSoundPack();
 if(!value||typeof value!=='object'||(value as {version?:unknown}).version!==1)
  return defaults;
 const input=value as {master?:unknown;choices?:unknown};
 if(typeof input.master==='number'&&Number.isFinite(input.master))
  defaults.master=Math.max(0,Math.min(1,input.master));
 const choices=input.choices&&typeof input.choices==='object'?
   input.choices as Record<string,unknown>:{};
 for(const entry of SOUND_CATALOG){
  const raw=choices[entry.id];
  if(!raw||typeof raw!=='object')continue;
  const choice=raw as {enabled?:unknown;choice?:unknown;edits?:unknown};
  const target=defaults.choices[entry.id];
  if(typeof choice.enabled==='boolean')target.enabled=choice.enabled;
  if(typeof (choice as {reviewed?:unknown}).reviewed==='boolean')
    target.reviewed=(choice as {reviewed:boolean}).reviewed;
  if(typeof (choice as {favorite?:unknown}).favorite==='boolean')
    target.favorite=(choice as {favorite:boolean}).favorite;
  if(SOUND_VARIANTS.includes(choice.choice as Variant))
   target.choice=choice.choice as Variant;
  if(choice.edits&&typeof choice.edits==='object'){
   const edits=choice.edits as Record<string,unknown>;
   target.edits={};
   for(const variant of SOUND_VARIANTS)
    if(edits[variant]!==undefined)target.edits[variant]=
      clampSoundSettings(edits[variant],defaultSoundSettings(entry,variant));
  }
 }
 return defaults;
}
export function resolveSoundSettings(pack:SoundPack,id:string,variant?:Variant){
 const entry=SOUND_BY_ID.get(id);if(!entry)return null;
 const selected=variant??pack.choices[id]?.choice??'B';
 return pack.choices[id]?.edits?.[selected]??
   defaultSoundSettings(entry,selected);
}
export function readSoundPack():SoundPack{
 try{const value=localStorage.getItem(SOUND_STORAGE_KEY);
  return value?normalizeSoundPack(JSON.parse(value)):defaultSoundPack();
 }catch{return defaultSoundPack();}
}
export function saveSoundPack(pack:SoundPack):boolean{
 try{localStorage.setItem(SOUND_STORAGE_KEY,JSON.stringify(pack));return true;}
 catch{return false;}
}
