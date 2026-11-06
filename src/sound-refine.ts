/** Wave 02A is a deliberate, SMALL refinement round, using Wave 01 choices
 * as immutable reference sounds. Directions A-F are refinements, NOT aliases
 * of Wave 01 A-F. All notes are authored per cue to guide listening.
 */
export const REFINEMENT_DIRECTIONS=['A','B','C','D','E','F'] as const;
export type RefinementDirection=typeof REFINEMENT_DIRECTIONS[number];
export type RefinementLayer='core'|'attack'|'body'|'texture'|'action'|'space';
export const REFINEMENT_RECIPES=[
 {id:'A',label:'Keep it tight',layers:['core','attack'],why:'Original character, with a clearer first contact'},
 {id:'B',label:'More physical',layers:['core','attack','body'],why:'Body and pressure beneath the initial sound'},
 {id:'C',label:'More texture',layers:['core','texture','attack'],why:'Material grain and close-up tactile detail'},
 {id:'D',label:'More sequence',layers:['core','action','attack'],why:'Separate contacts, releases and mechanisms'},
 {id:'E',label:'More space',layers:['core','space'],why:'Air and subtle nearby reflections'},
 {id:'F',label:'Layered balance',layers:['core','attack','body','texture','action','space'],
  why:'A deliberately restrained combination of all useful components'}
] as const;
type RefinementCue={
 id:string;intent:string;
 names:readonly [string,string,string,string,string,string];
 details:readonly [string,string,string,string,string,string];
};
export const REFINEMENT_SOUNDS:readonly RefinementCue[]=[
 {id:'weapons.carbine',intent:'Preserve the weight of your original rifle report while testing definition, action and environment.',
  names:['Crisp muzzle','Deep shoulder','Powder break','Bolt follows','Courtyard slap','The complete carbine'],
  details:['Keep the body; emphasize the leading crack','Add a short low chest-pressure layer','Dusty, granular propellant texture behind the report','Separate bolt-cycle click after the muzzle','Short near-wall reflections without a cinematic echo','Weight + muzzle + restrained cycling and room']},
 {id:'weapons.rifle',intent:'Find the distinction between the deeper rifle body, sharp muzzle crack and loose metal.',
  names:['Whip front','Thick report','Ragged burst','Receiver recoil','Open-air tail','Rifle composite'],
  details:['Harder high snap over the existing rifle','A grounded low-frequency impact underneath','Rough-edged report with dirt and grit','Independent receiver movement just behind the shot','Brief outdoor response, not booming reverb','Dense rifle body with controlled mechanical detail']},
 {id:'weapons.rifle_suppressed',intent:'A pressure-and-mechanism event rather than a tiny unsuppressed gunshot.',
  names:['Dry baffle','Subsonic push','Escaping gas','Bolt then settle','Small-room cough','Silenced action stack'],
  details:['Tighter baffle-pop above the original','Soft low pressure pulse','Breathy gas noise, no exaggerated hiss','Audible bolt movement and soft return','Quiet interior reflection, closer than the loud rifle','Baffle pop + action + air, still convincingly subdued']},
 {id:'combat.flash',intent:'Retain the flashbang concussion while separating the initial crack and the room response.',
  names:['White snap','Pressure hit','Fragmented edge','Two-stage blast','Four-wall slap','Compact detonation'],
  details:['Sharper initial shock transient','Lower pressure bloom behind the report','Ragged noise edge with short debris-like grain','Initial crack and a second pressure arrival','Contained reflections from a small interior','Fast snap, weight and short reflections with no giant tail']},
 {id:'doors.kick',intent:'A physical breach built out of sole contact, panel response and latch movement.',
  names:['Boot contact','Panel weight','Splinter scrape','Heel to latch','Hallway thump','Forceful entry stack'],
  details:['Defined sole strike on the door surface','Lower, solid panel impact','A quick rough wood/material scrape','Distinct heel impact and delayed latch reaction','Short nearby wall reflection','Boot, door body and latch layered at separate times']},
 {id:'equipment.reload',intent:'An audible sequence of separate real-world contacts, not one synthetic squeak.',
  names:['Clean mag click','Weighted insertion','Nylon friction','Release and seat','Close mic handling','Full reload stack'],
  details:['Clear short first click','Add physical magazine-seat body','Small fabric/hand movement below the clicks','Separated magazine release, seat and bolt/action','Quiet near-field detail, little room','Release, seat, action and clothing as separate layers']},
 {id:'movement.boot',intent:'Retain a recognizable heel-toe rhythm without making four operators sound like drums.',
  names:['Sharper heel','Heavier sole','Sole scuff','Heel then toe','Floor response','Boot and fabric'],
  details:['More precise initial heel contact','Low weight kept restrained enough for repeated steps','Rough rubbing under the footfall','Two short consecutive foot contacts','Tiny floor-reflected response','Heel, sole, scuff and soft clothing beneath']},
 {id:'impacts.body_hit',intent:'Explore tactile confirmation with texture and equipment response, not exaggerated gore.',
  names:['Tight contact','Momentum thud','Cloth rip','Kit jolt','Close room','Physical hit stack'],
  details:['One distinct impact attack','A weighted follow-through beneath the grit','Small fabric friction rather than splatter','Slight delayed equipment collision','Very subtle near-field reflection','Contact, body and clothing in a compact stack']},
 {id:'doors.close',intent:'Use the rough closure you liked but test cleaner latch and more recognizable panel movement.',
  names:['Latching click','Door mass','Rough scrape','Panel then latch','Hall reflection','Old-door closure'],
  details:['A clearer final latch contact','A small heavy door-slab impulse','Keep the roughened character, add rubbing','Panel lands first; latch catches a moment later','Only a little adjacent-room sound','Heavy panel, gritty surface and precise latch']},
 {id:'orders.waypoint',intent:'Keep planning responsive and quiet; see how much tactile layering is useful.',
  names:['Dry micro-tick','Firm pin','Paper grain','Double confirmation','Soft spatial tick','Tactile marker'],
  details:['Your small sharp tick with more definition','Subtle lower click behind the tap','Tiny textured pen-on-paper character','Two tiny events: touch and commit','Very short reflected marker sound','A small combined tap with just enough body']}
] as const;
export const REFINEMENT_SOUND_IDS=REFINEMENT_SOUNDS.map(x=>x.id);
export const REFINEMENT_BY_ID=new Map(REFINEMENT_SOUNDS.map(x=>[x.id,x]));
export function refinable(id:string){return REFINEMENT_BY_ID.has(id);}
