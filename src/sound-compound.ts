/** Wave 03 — compound physical sound studies built from each user's
 * approved Wave 02 reference. Six timing/material narratives per cue.
 * Wave 03 is a listening pass: never alters existing choices until approved.
 */
export const COMPOUND_DIRECTIONS=['A','B','C','D','E','F'] as const;
export type CompoundDirection=typeof COMPOUND_DIRECTIONS[number];
export const COMPOUND_RECIPES=[
 {id:'A',label:'Strike → settle',layers:['base','contact','settle'],why:'Immediate event followed by a small physical settling'},
 {id:'B',label:'Prepare → strike',layers:['handling','base','mass'],why:'A touch, grip or preliminary movement before the main contact'},
 {id:'C',label:'Strike → rebound',layers:['base','rebound','rattle'],why:'Audible reaction and secondary contacts after the first hit'},
 {id:'D',label:'Mechanical chain',layers:['base','mechanism','release'],why:'A believable sequence of moving parts in separate beats'},
 {id:'E',label:'Surface & friction',layers:['base','scrape','grain'],why:'Close-up material identity, friction and imperfect edges'},
 {id:'F',label:'Whole physical event',layers:['base','mass','detail','space'],why:'Multiple restrained layers with nearby environmental response'}
] as const;
type Cue={id:string;why:string;names:readonly [string,string,string,string,string,string];
 details:readonly [string,string,string,string,string,string]};
export const COMPOUND_SOUNDS:readonly Cue[]=[
 {id:'weapons.carbine',why:'You kept the heavy AR report, then chose a tighter muzzle attack. Test the physical events just after it.',
  names:['Crack & receiver','Ready, then fire','Recoil and brass','Bolt-return sequence','Powder and housing','Carbine close-up'],
  details:['Short muzzle crack and restrained receiver settling','A tiny grip/handling noise before the shot','Shot body, stock movement, then brass contact','Muzzle report with cycling and a distinct return click','Dry powder rasp and close receiver texture','Crack, mass, mechanism and small early wall response']},
 {id:'weapons.rifle',why:'Heavy rifle followed by a tight attack suggests punch with definition, not a longer boomy report.',
  names:['Crack, then clack','Stock & muzzle','Recoil with case','Stamped-action echo','Harsh metal housing','Full rifle impulse'],
  details:['A sharp leading edge and delayed mechanical return','Subtle shoulder shift leading into the report','Low recoil shunt followed by casing tap','Two hard receiver contacts after the report','Rough stamped-metal buzz and friction','Distinct report, weight, brass and restrained reflections']},
 {id:'weapons.rifle_suppressed',why:'You prefer mechanical suppressed fire but chose more body in Wave 02. Find the right baffle/bolt relationship.',
  names:['Baffle, then settle','Handling into pop','Bolt & brass','Action under gas','Baffle rubbing','Whole suppressor cycle'],
  details:['Close dull baffle pop with soft chamber settling','Soft weapon movement before a low-pressure pop','Bolt return and quiet casing after the shot','Gas release and two separated action clicks','Compressed gritty air and baffle texture','Gas, pop, bolt, contact and very short interior response']},
 {id:'combat.flash',why:'You kept the deep explosion and reinforced its physical punch. Test pressure shape and room details.',
  names:['Flash and collapse','Pinpoint then pressure','Blast, then debris','Two-step concussion','Raw interior grit','Flash room event'],
  details:['Initial white snap with a rapid pressure collapse','Small sharp pre-impulse leading into the main concussion','Pressure shock followed by a brief secondary scatter','First impulse, second close boundary slap','Short gritty surface vibration in the tail','Snap, pressure, nearby reflections and restrained scatter']},
 {id:'doors.kick',why:'Your unique Wave 02 texture choice suggests the door material matters as much as the force.',
  names:['Sole and frame','Weight into panel','Panel gives, rattles','Latch fights back','Wood grain tear','Complete kick'],
  details:['Defined boot slap and abrupt frame settling','Foot movement before a weighty panel hit','Panel impact followed by loosened latch rattle','Distinct heel strike, latch and hinge reaction','A tough scrape/splinter texture at the contact point','Boot, slab, frame, latch and room in a short sequence']},
 {id:'equipment.reload',why:'Your D→B progression suggests a sequence of mechanical events that still feels weighted and physical.',
  names:['Seat and settle','Grip, then insert','Magazine rebounds','Release, seat, rack','Metal-on-polymer','Complete reload'],
  details:['Strong seat click plus a subtle final hand movement','Fabric/hand movement before magazine insertion','Distinct magazine seat and small spring rebound','Release, insertion, bolt movement in separate stages','Close metal, polymer and small nylon friction','Handling, magazine, receiver and restrained clothing']},
 {id:'movement.boot',why:'You selected mechanical heel-to-toe followed by extra weight. Test the micro-sequence of foot contact.',
  names:['Heel and settle','Leg into step','Heel, toe, grit','Sole articulation','Floor scuff','Boot with kit'],
  details:['Heel contact and small final weight shift','Faint approach scuff before the shoe lands','Heel, toe and a controlled pebble-like contact','Sole roll and a small second sole click','Rubber texture against the surface','Sole impact, body weight, floor and faint fabric']},
 {id:'impacts.body_hit',why:'Gritty initial contact plus more physical body in Wave 02: test clothing and equipment follow-through.',
  names:['Impact and cloth','Movement into contact','Body then gear','Fabric and plate','Material friction','Kinetic impact'],
  details:['Immediate impact and a brief fabric settling','A soft cloth movement ahead of the forceful hit','Body movement and one small equipment knock','Contact, armor movement and short gear rattle','Abrasive cloth and equipment friction','Contact, momentum, cloth and low gear movement']},
 {id:'doors.close',why:'You kept the lo-fi closure but reinforced its body. Test the order of door slab, latch and panel vibration.',
  names:['Panel and catch','Handle, then close','Latch rebound','Hinge to latch','Gritty edge','Door assembly'],
  details:['Door mass lands and latch catches quietly','Handle contact ahead of the closing panel','Door lands, rattles once and catches','Hinge movement, panel impact, final latch','Scraping jamb and worn material texture','Slab, hinge, latch, panel and short corridor response']},
 {id:'orders.waypoint',why:'You picked the smallest possible refinement. These contrasts test tactile feedback without turning planning into a noisy process.',
  names:['Touch and release','Pencil before click','Two tiny contacts','Switch detent','Paper-surface tap','Minimal tactile marker'],
  details:['Single crisp click and a tiny release','Very quiet pre-touch ahead of the tap','Two restrained tactile contacts, not a double notification','Small mechanical click with a second soft detent','Soft drawing/surface texture behind a tiny click','A modest layered marker with no long tail']}
] as const;
export const COMPOUND_SOUND_IDS=COMPOUND_SOUNDS.map(x=>x.id);
export const COMPOUND_BY_ID=new Map(COMPOUND_SOUNDS.map(x=>[x.id,x]));
