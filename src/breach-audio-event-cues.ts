/** Pure semantic cue selection for already-emitted tactical events.
 * These sound intents never change visibility, AI hearing or mission results.
 * Multiple independent matches intentionally preserve the old layered kicks.
 */
export type LiveAudioCue={
  id:string;
  scale:number;
  fallback?:readonly [hz:number,seconds:number,noise?:boolean];
};
export function liveAudioCuesForEvent(event:string):LiveAudioCue[]{
  const cues:LiveAudioCue[]=[];
  if(event.includes('OPENED')||event.includes('CLOSING'))
    cues.push({id:event.includes('CLOSING')?'doors.close':'doors.open',
      scale:1,fallback:[160,.16]});
  if(event.includes('KICK RESISTED')){
    cues.push({id:'doors.kick',scale:1,fallback:[90,.25,true]});
    cues.push({id:'doors.kick_resisted',scale:.30});
  }
  if(event.includes('FORCED OPEN')){
    cues.push({id:'doors.kick',scale:1,fallback:[90,.25,true]});
    cues.push({id:'doors.forced_open',scale:.33});
  }
  if(event.includes('KICKED'))
    cues.push({id:'doors.kick',scale:1,fallback:[90,.25,true]});
  if(event.includes('FLASH DETONATED'))
    cues.push({id:'combat.flash',scale:1,fallback:[1350,.65,true]});
  if(event.includes('RELOADED'))
    cues.push({id:'equipment.reload',scale:1,fallback:[280,.09]});
  if(event.includes('FLASH OUT'))
    cues.push({id:'equipment.flash_throw',scale:1,fallback:[420,.07]});
  if(event.includes('SURRENDERED'))
    cues.push({id:'people.surrender',scale:1,fallback:[210,.22]});
  return cues;
}
