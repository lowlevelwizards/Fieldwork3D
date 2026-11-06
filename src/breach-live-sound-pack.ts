/** User-approved Wave 01→03 selections for live game audition.
 * This mixes onto a COPY of the visitor's own pack; it never writes localStorage
 * or changes a Sound Lab selection. Switch OFF for an immediate A/B baseline.
 * The 10 Wave 03 choices come from fieldwork-sound-pack-v1(4).json.
 */
import type {SoundPack,SoundChoice,Variant} from './sound-catalog.ts';
import type {RefinementDirection} from './sound-refine.ts';
import type {CompoundDirection} from './sound-compound.ts';

export type LiveMixPick={id:string;wave1:Variant;
 wave2:RefinementDirection;wave3:CompoundDirection};
export const LIVE_AUDIO_MIX:readonly LiveMixPick[]=[
 {id:'orders.waypoint',wave1:'A',wave2:'A',wave3:'E'},
 {id:'movement.boot',wave1:'D',wave2:'B',wave3:'A'},
 {id:'equipment.reload',wave1:'D',wave2:'B',wave3:'A'},
 {id:'weapons.carbine',wave1:'B',wave2:'A',wave3:'A'},
 {id:'weapons.rifle',wave1:'B',wave2:'A',wave3:'E'},
 {id:'weapons.rifle_suppressed',wave1:'D',wave2:'B',wave3:'A'},
 {id:'impacts.body_hit',wave1:'C',wave2:'B',wave3:'E'},
 {id:'doors.close',wave1:'G',wave2:'B',wave3:'E'},
 {id:'doors.kick',wave1:'B',wave2:'C',wave3:'B'},
 {id:'combat.flash',wave1:'B',wave2:'B',wave3:'E'}
] as const;
/** Additional approved foundational Wave 01 cues; no invented Wave 03 choice. */
const FOUNDATION:readonly {id:string;choice:Variant}[]=[
 {id:'ui.go',choice:'D'},{id:'ui.pause',choice:'D'},
 {id:'doors.open',choice:'A'},{id:'doors.kick_resisted',choice:'G'},
 {id:'doors.forced_open',choice:'B'},{id:'weapons.shotgun',choice:'B'}
];
export function withFieldworkLiveMix(base:SoundPack):SoundPack{
 const choices={...base.choices};
 for(const {id,choice} of FOUNDATION){
  const current=choices[id];if(!current)continue;
  choices[id]={...current,choice,enabled:true,explored:true,reviewed:true,
   // A new parent Wave 01 choice cannot retain approval from another version.
   refinement:undefined,compound:undefined,edits:undefined};
 }
 for(const pick of LIVE_AUDIO_MIX){
  const current=choices[pick.id];
  if(!current)continue;
  const approved:SoundChoice={...current,enabled:true,reviewed:true,
   explored:true,choice:pick.wave1,
   refinement:{choice:pick.wave2,approved:true},
   compound:{choice:pick.wave3,approved:true},
   edits:undefined};
  choices[pick.id]=approved;
 }
 return {...base,choices};
}
