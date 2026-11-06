/** Curated first-pass listening round. Order is impact priority, not game taxonomy.
 * Direction names are authored per sound; A-H are eight intentionally different
 * procedural constructions, NOT eight volume/pitch presets.
 */
export const FOCUS_DIRECTIONS=['A','B','C','D','E','F','G','H'] as const;
export type FocusDirection=typeof FOCUS_DIRECTIONS[number];
export const DIRECTION_METHODS=[
 'Dry, immediate transient; almost no tail.',
 'Low, physical pressure with a bass-heavy decay.',
 'Grain, crackle and broken-up high-frequency texture.',
 'A staged sequence of distinct mechanical contacts.',
 'Breathy, softened noise with a moving air envelope.',
 'Hollow, tonal material resonance and ringing overtones.',
 'Crunchy bandwidth-limited, deliberately imperfect texture.',
 'A distant, reflected sound with a longer environmental tail.'
] as const;
type FocusSound={id:string;why:string;names:readonly [string,string,string,string,string,string,string,string]};
export const FOCUS_SOUNDS:readonly FocusSound[]=[
 {id:'weapons.carbine',why:'The AR/M4 report heard constantly during contacts',names:[
  'Needle crack','Chest thump','Powder grit','Bolt chatter','Air slap','Steel report','Cassette bark','Hallway report']},
 {id:'weapons.rifle',why:'The AK/rifle family needs a separate, recognizable voice',names:[
  'Whip crack','Heavy boom','Harsh rip','Receiver clack','Compressed pop','Ringing report','Dirty recording','Courtyard echo']},
 {id:'weapons.rifle_suppressed',why:'A frequent shot with a very different acoustic silhouette',names:[
  'Muted snap','Subsonic pulse','Baffled sputter','Bolt pop','Soft gas puff','Tin resonance','Muffled vinyl','Interior cough']},
 {id:'weapons.shotgun',why:'The most recognizable short-range blast',names:[
  'Sharp clap','Shoulder cannon','Pellet scrape','Action clank','Air cannon','Hollow drum','Dirty broadcast','Long chamber boom']},
 {id:'combat.flash',why:'One of the biggest room-clearing payoffs',names:[
  'Snap flash','Blunt concussion','Explosive grit','Staged detonation','Blast of air','Metallic bloom','Overloaded tape','Huge indoor tail']},
 {id:'doors.kick',why:'The tactile signature of forceful entry',names:[
  'Sole slap','Deep wood thud','Splinter grind','Heel double-hit','Air displacement','Hollow door ring','Crunchy crack','Roomy impact']},
 {id:'doors.kick_resisted',why:'A failed breach must sound distinctly unsuccessful',names:[
  'Hard stop','Muffled thud','Scraped sole','Heel rebound','Air puff','Latch ring','Filtered thump','Doorframe echo']},
 {id:'doors.forced_open',why:'Door giving way should feel earned and decisive',names:[
  'Frame snap','Heavy break','Wood tear','Latch succession','Pressure slam','Hinge groan','Rough fracture','Building boom']},
 {id:'doors.open',why:'Every quiet entry starts with this sound',names:[
  'Quick latch','Heavy swing','Dry scrape','Two-stage latch','Soft whoosh','Hollow hinge','Old mechanism','Roomy swing']},
 {id:'doors.close',why:'Closing a door provides clear tactile feedback',names:[
  'Quiet click','Heavy slam','Rough drag','Latch doublet','Air cushion','Metal rebound','Vintage clunk','Corridor slam']},
 {id:'equipment.reload',why:'The core equipment-handling sound, repeated under pressure',names:[
  'Dry magazine','Chunky seat','Gear rattle','Multi-click action','Air hiss','Receiver ring','Retro reload','Roomy action']},
 {id:'movement.boot',why:'Footsteps are constant and define the whole sound floor',names:[
  'Light sole tap','Heavy boot','Dusty grit','Heel-toe','Air cushioned','Metal floor','Lo-fi footfall','Roomy footstep']},
 {id:'impacts.body_hit',why:'Hits need immediate confirmation without overpowering gunfire',names:[
  'Sharp slap','Heavy punch','Grit scatter','Double collision','Cloth puff','Gear ring','Distant thump','Room impulse']},
 {id:'ui.go',why:'The most important player-initiated transition',names:[
  'Crisp impulse','Deep confirmation','Static urgency','Two-beat GO','Air release','Metallic command','Retro execute','Spatial stinger']},
 {id:'ui.pause',why:'A very frequent tactical rhythm marker',names:[
  'Micro click','Low stop','Gated buzz','Dual tick','Breath hush','Little bell','Tape stop','Airy freeze']},
 {id:'orders.waypoint',why:'Players hear this repeatedly while drawing tactical plans',names:[
  'Dry pen tap','Soft tick','Raspy input','Double tap','Air dot','Pin marker','Retro blip','Space ping']}
] as const;
export const FOCUS_SOUND_IDS=FOCUS_SOUNDS.map(x=>x.id);
export const FOCUS_BY_ID=new Map(FOCUS_SOUNDS.map(x=>[x.id,x]));
export function isFocusSound(id:string){return FOCUS_BY_ID.has(id);}
