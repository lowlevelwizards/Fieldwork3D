/** Audio-only application boundary.
 * Consumes live/recorded events and read-only spatial context. Never advances
 * gameplay, changes tactical plans, discloses hidden audio positions to the UI,
 * or seeks replay time. AudioContext unlock remains an explicit user gesture.
 */
import {WALLS,doorCenter,type Pt} from './breach-core.ts';
import {team,type Session} from './breach-game.ts';
import {WEAPONS} from './breach-combat.ts';
import type {MissionRecorder} from './breach-replay.ts';
import {shotVisibility} from './breach-presentation.ts';
import {heardIntensity} from './breach-acoustics.ts';
import {weaponAudioCue,audibleImpact} from './breach-combat-audio.ts';
import {defaultSoundPack,readSoundPack,SOUND_STORAGE_KEY}
  from './sound-catalog.ts';
import {playPackSound} from './sound-synth.ts';
import {hashString} from './sound-live-tactility.ts';
import {withFieldworkLiveMix} from './breach-live-sound-pack.ts';
import {acousticResponseForCue} from './breach-audio-environment.ts';
import {ReplaySoundTimeline,replayDoorSoundId}
  from './breach-replay-audio.ts';
import {liveAudioCuesForEvent} from './breach-audio-event-cues.ts';
import {replayAudioListener,replayBodycamPan}
  from './breach-replay-bodycam-controls.ts';

export const LIVE_MIX_PREF='fieldwork3d.sound.live-mix';
export const ROOM_AUDIO_PREF='fieldwork3d.sound.room-acoustics';
export const UI_SOUND_PREF='fieldwork3d.ui.sound';
export type BreachAudioContext={
  state:Session;selected:string;
  bodycamActive:boolean;observerId:string|null;
};
export type UiCueKind='select'|'command'|'go'|'pause'|'warning';

export function createBreachAudioController(config:{
  getContext:()=>BreachAudioContext;
  showUiHelp:(message:string,duration:number)=>void;
  /** Tests or restricted embeddings may omit the browser storage surface. */
  storage?:Pick<Storage,'getItem'|'setItem'>;
  storageEvents?:Pick<Window,'addEventListener'>;
  createContext?:()=>AudioContext|null;
  now?:()=>number;
}){
  const storage=config.storage??(typeof localStorage!=='undefined'?localStorage:null);
  const storageEvents=config.storageEvents??(typeof window!=='undefined'?window:null);
  const now=config.now??(()=>performance.now());
  const selectedActor=(state:Session,id:string)=>
    state.operators.find(actor=>actor.id===id);
  const clamp=(value:number,min:number,max:number)=>
    Math.max(min,Math.min(max,value));
  const readPreference=(key:string)=>{try{return storage?.getItem(key)!=='off';}
    catch{return true;}};
  const savePreference=(key:string,enabled:boolean)=>{
    try{storage?.setItem(key,enabled?'on':'off');}
    catch{/* Preferences may be ephemeral in private browsing. */}
  };
  let audio:AudioContext|null=null;
  let videoAudioDestination:MediaStreamAudioDestinationNode|null=null;
  let liveMixEnabled=readPreference(LIVE_MIX_PREF);
  let roomAudioEnabled=readPreference(ROOM_AUDIO_PREF);
  let uiSoundEnabled=readPreference(UI_SOUND_PREF);
  let replaySoundEnabled=true;
  let approvedSoundPack=liveMixEnabled?
    withFieldworkLiveMix(readSoundPack()):defaultSoundPack();
  const refreshSoundPack=()=>{
    const base=readSoundPack();
    approvedSoundPack=liveMixEnabled?
      withFieldworkLiveMix(base):defaultSoundPack();
  };
  storageEvents?.addEventListener('storage',(event:Event)=>{
    const change=event as StorageEvent;
    if(change.key===LIVE_MIX_PREF){
      liveMixEnabled=change.newValue!=='off';refreshSoundPack();
    }else if(change.key===ROOM_AUDIO_PREF)
      roomAudioEnabled=change.newValue!=='off';
    else if(change.key===UI_SOUND_PREF)
      uiSoundEnabled=change.newValue!=='off';
    else if(change.key===SOUND_STORAGE_KEY)refreshSoundPack();
  });
  const replaySoundNodes=new Set<OscillatorNode>();
  const replaySoundBuffers=new Set<AudioBufferSourceNode>();
  let replaySoundTimeline:ReplaySoundTimeline|null=null;
  let lastSoundShotId=0,lastEventAudio='',lastFootstepSoundTime=0;
  let variationCounter=0,lastUiCue=0;

  function unlock():void{
    try{
      if(!audio)audio=config.createContext?
        config.createContext():
        typeof AudioContext!=='undefined'?new AudioContext():null;
      if(audio?.state==='suspended')void audio.resume();
    }catch{/* Audio unlock can be rejected in embedded browsers. */}
  }
  function stopReplaySounds():void{
    for(const node of replaySoundNodes)try{node.stop();}catch{}
    replaySoundNodes.clear();
    for(const source of replaySoundBuffers)try{source.stop();}catch{}
    replaySoundBuffers.clear();
  }
  function resetLive():void{
    lastSoundShotId=0;lastEventAudio='';lastFootstepSoundTime=0;
  }
  function beginReplay(recorder:MissionRecorder):void{
    stopReplaySounds();
    replaySoundTimeline=new ReplaySoundTimeline(recorder.ballistics.shots,
      recorder.events);
  }
  function endReplay():void{
    replaySoundTimeline=null;stopReplaySounds();
    videoAudioDestination=null;
  }
  function beginVideoCapture():MediaStream|null{
    unlock();
    videoAudioDestination=audio?.state==='running'&&replaySoundEnabled?
      audio.createMediaStreamDestination():null;
    return videoAudioDestination?.stream??null;
  }
  function endVideoCapture():void{videoAudioDestination=null;}

  function playTone(frequency:number,decay:number,noise=false,level=1,
    pan=0,replayCue=false):void{
    try{
      if(!audio)return;
      const osc=audio.createOscillator(),gain=audio.createGain();
      osc.type=noise?'sawtooth':'triangle';osc.frequency.value=frequency;
      gain.gain.setValueAtTime(.065*Math.max(.02,level),audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+decay);
      osc.connect(gain);
      if(typeof audio.createStereoPanner==='function'){
        const stereo=audio.createStereoPanner();
        stereo.pan.value=clamp(pan,-1,1);
        gain.connect(stereo);stereo.connect(audio.destination);
        if(replayCue&&videoAudioDestination)stereo.connect(videoAudioDestination);
      }else{
        gain.connect(audio.destination);
        if(replayCue&&videoAudioDestination)gain.connect(videoAudioDestination);
      }
      if(replayCue){
        replaySoundNodes.add(osc);
        osc.onended=()=>replaySoundNodes.delete(osc);
      }
      osc.start();osc.stop(audio.currentTime+decay+.01);
    }catch{/* Audio feedback cannot interrupt gameplay. */}
  }
  /** Returns true for a recognized cue, including a disabled Sound Lab cue. */
  function playApprovedCue(id:string,level=1,pan=0,replayCue=false,
    rate=1,sourcePosition?:Pt,variationSeed?:number):boolean{
    if(!audio)return false;
    const {state,selected,bodycamActive,observerId}=config.getContext();
    const listener=replayCue&&bodycamActive?
      (observerId?replayAudioListener(team(state),selected,observerId)?.p:
        undefined):
      selectedActor(state,selected)?.p;
    const acoustics=roomAudioEnabled&&sourcePosition?
      acousticResponseForCue(state.site??undefined,sourcePosition,id,
        listener,state.doors,WALLS):null;
    return playPackSound(audio,id,{
      level,pan,rate,acoustics,liveTactile:liveMixEnabled,
      variationSeed:liveMixEnabled?
        (variationSeed??++variationCounter):undefined,
      output:replayCue?videoAudioDestination:null,
      onSource:replayCue?(source)=>{
        replaySoundBuffers.add(source);
        const previous=source.onended;
        source.onended=(event)=>{
          previous?.call(source,event);
          replaySoundBuffers.delete(source);
        };
      }:undefined
    },approvedSoundPack);
  }
  /** Audio origin selection is local to playback; it reveals no new intel. */
  function liveEventAudioPosition(event:string,state:Session,selected:string):
    Pt|undefined{
    const door=state.doors.find(d=>event.startsWith(d.id+' '));
    if(door)return doorCenter(door);
    if(event.includes('FLASH DETONATED'))return state.flashBursts.at(-1)?.p;
    const actor=state.operators.find(a=>event.startsWith(a.name+' '));
    return actor?.p??selectedActor(state,selected)?.p;
  }
  function playLiveEventCue(id:string,source?:Pt,scale=1):boolean{
    const {state,selected}=config.getContext();
    const listener=selectedActor(state,selected)?.p;
    if(!source||!listener)return playApprovedCue(id,scale,0,false,1,source);
    const radius=id==='combat.flash'?420:
      id.startsWith('doors.')?265:id.startsWith('equipment.')?145:190;
    const level=heardIntensity(source,listener,radius,state.doors,WALLS);
    if(level<.025)return true;
    return playApprovedCue(id,Math.max(.02,level*scale),
      clamp((source.x-listener.x)/210,-1,1),false,1,source);
  }
  function playOrderCue(id:string):void{
    if(!uiSoundEnabled)return;
    unlock();playApprovedCue(id,.25);
  }
  function uiClickTone(kind:UiCueKind):void{
    if(!uiSoundEnabled)return;
    const at=now();if(at-lastUiCue<75)return;
    lastUiCue=at;unlock();
    try{
      if(!audio||audio.state!=='running')return;
      if(playApprovedCue('ui.'+(kind==='command'?'confirm':kind),.30))
        return;
      const frequencies={select:480,command:610,go:330,
        pause:255,warning:170};
      const oscillator=audio.createOscillator(),gain=audio.createGain();
      oscillator.type=kind==='go'?'triangle':'sine';
      oscillator.frequency.setValueAtTime(frequencies[kind],audio.currentTime);
      if(kind==='go')oscillator.frequency.exponentialRampToValueAtTime(
        240,audio.currentTime+.14);
      const duration=kind==='go'?.15:kind==='pause'?.085:.055;
      gain.gain.setValueAtTime(kind==='go'?.018:.010,audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+duration);
      oscillator.connect(gain);gain.connect(audio.destination);
      oscillator.start();oscillator.stop(audio.currentTime+duration+.015);
    }catch{/* Never block UI feedback on audio context state. */}
  }

  /** Live outcomes are consumed after the simulation; this never drives it. */
  function consumeLiveFrame(state:Session,recorder:MissionRecorder,
    selected:string,replaying=false):void{
    const freshShots:typeof state.shots=[];
    let newestShotId=lastSoundShotId;
    for(const shot of state.shots){
      if(shot.id<=lastSoundShotId)continue;
      if(shot.id>newestShotId)newestShotId=shot.id;
      if(audio&&!replaying){
        if(freshShots.length===3)freshShots.shift();
        freshShots.push(shot);
      }
    }
    if(audio&&!replaying)for(const shot of freshShots){
      const firingActor=state.operators.find(a=>a.id===shot.shooterId);
      const weapon=firingActor?.weapon??'carbine';
      const listener=selectedActor(state,selected)?.p;
      const level=listener?heardIntensity(shot.start,listener,
        WEAPONS[weapon].noise,state.doors,WALLS):1;
      if(level<.01)continue;
      const pan=listener?(shot.start.x-listener.x)/210:0;
      const suppressed=firingActor?.weaponConfiguration?.
        slots.muzzle==='muzzle-suppressor';
      const cue=weaponAudioCue(weapon,suppressed);
      if(!playApprovedCue('weapons.'+weapon+
        (suppressed?'_suppressed':''),level,pan,false,1,shot.start,shot.id)){
        playTone(cue.crackHz,cue.crackSeconds,true,level,pan);
        playTone(cue.bodyHz,cue.bodySeconds,false,level*cue.bodyLevel,pan);
      }
      // A hidden successful hit does not become an audible confirmation.
      const impactLevel=listener?heardIntensity(shot.end,listener,
        88,state.doors,WALLS):0;
      if(shot.hit&&audibleImpact(shotVisibility(state,shot).impact,impactLevel))
        if(!playApprovedCue('impacts.body_hit',
          level*Math.max(.22,impactLevel),pan,false,1,shot.end,shot.id+197))
          playTone(shot.down?75:225,shot.down?.25:.10,
            shot.down,level*Math.max(.22,impactLevel),pan);
    }
    lastSoundShotId=newestShotId;
    // Physical touchdown evidence, not a synthesized time-step footfall loop.
    if(!replaying&&state.phase==='running'){
      const from=Math.max(lastFootstepSoundTime,state.seconds-.16);
      if(audio?.state==='running'){
        const ids=team(state).map(a=>a.id);
        for(const touch of recorder.motion.touchdownsBetween(
          from,state.seconds,ids).slice(-5)){
          const listener=selectedActor(state,selected)?.p;
          const level=listener?heardIntensity(touch.position,listener,
            36,state.doors,WALLS):.24;
          if(level<.025)continue;
          const pan=listener?(touch.position.x-listener.x)/210:0;
          if(!playApprovedCue('movement.boot',level*.20,pan,false,1,
            touch.position,hashString(touch.id+'|'+touch.foot+'|'+
              touch.at.toFixed(3))))
            playTone(touch.foot===0?62:67,.055,true,level*.12,pan);
        }
      }
    }
    lastFootstepSoundTime=state.seconds;
    const event=state.events.at(-1)??'';
    if(!replaying&&event!==lastEventAudio){
      const source=liveEventAudioPosition(event,state,selected);
      for(const cue of liveAudioCuesForEvent(event)){
        if(!playLiveEventCue(cue.id,source,cue.scale)&&cue.fallback)
          playTone(cue.fallback[0],cue.fallback[1],
            cue.fallback[2]??false);
      }
    }
    lastEventAudio=event;
  }
  /** Continuous historical intervals only. A seek never audits past events. */
  function playReplayBetween(start:number,end:number,recorder:MissionRecorder,
    rate:number):void{
    if(!replaySoundEnabled||!replaySoundTimeline||
      !audio||audio.state!=='running'||end<=start||rate>2)return;
    const {state,selected,bodycamActive,observerId}=config.getContext();
    const listenerActor=bodycamActive&&!observerId?null:
      replayAudioListener(team(state),selected,
        bodycamActive?observerId:null);
    if(bodycamActive&&!listenerActor)return;
    const listener=listenerActor?.p;
    const rateScale=Math.max(.5,Math.min(2,1/rate));
    for(const event of replaySoundTimeline.between(start,end,7)){
      const p=event.p;
      const level=p&&listener?heardIntensity(p,listener,
        event.kind==='gunshot'?
          WEAPONS[event.weapon??'carbine'].noise:150,
        state.doors,WALLS):.35;
      if(level<.025)continue;
      const pan=p&&listener?
        (bodycamActive&&listenerActor?
          replayBodycamPan(p,listenerActor):(p.x-listener.x)/210):0;
      if(event.kind==='gunshot'){
        const cue=weaponAudioCue(event.weapon??'carbine',event.suppressed);
        if(!playApprovedCue('weapons.'+(event.weapon??'carbine')+
          (event.suppressed?'_suppressed':''),level,pan,true,1/rateScale,
          p??undefined,hashString(event.id))){
          playTone(cue.crackHz,cue.crackSeconds*rateScale,
            true,level,pan,true);
          playTone(cue.bodyHz,cue.bodySeconds*rateScale,false,
            level*cue.bodyLevel,pan,true);
        }
        // Hit confirmation is never replayed unless disclosed independently.
      }else{
        const tones={door:[160,.16],flash:[1350,.65],
          reload:[280,.09],interaction:[210,.12],
          surrender:[210,.22]} as const;
        const [hz,length]=tones[event.kind];
        const soundId={door:replayDoorSoundId(event.description),
          flash:'combat.flash',reload:'equipment.reload',
          interaction:'',surrender:'people.surrender'}[event.kind];
        if(!soundId||!playApprovedCue(soundId,Math.min(level,.7),
          pan,true,1/rateScale,p??undefined,hashString(event.id)))
          playTone(hz,length*rateScale,event.kind==='flash',
            Math.min(level,.7),pan,true);
      }
    }
    const ids=team(state).map(a=>a.id);
    for(const touch of recorder.motion.touchdownsBetween(
      start,end,ids).slice(-6)){
      const level=listener?heardIntensity(touch.position,listener,
        36,state.doors,WALLS):.2;
      if(level<.025)continue;
      const pan=listener?
        (bodycamActive&&listenerActor?
          replayBodycamPan(touch.position,listenerActor):
          (touch.position.x-listener.x)/210):0;
      if(!playApprovedCue('movement.boot',level*.20,pan,true,1/rateScale,
        touch.position,hashString(touch.id+'|'+touch.foot+'|'+
          touch.at.toFixed(3))))
        playTone(touch.foot===0?62:67,.055*rateScale,true,
          level*.12,pan,true);
    }
  }
  function toggleReplaySound():boolean{
    replaySoundEnabled=!replaySoundEnabled;
    if(!replaySoundEnabled)stopReplaySounds();
    else unlock();
    return replaySoundEnabled;
  }
  function toggleLiveMix():boolean{
    liveMixEnabled=!liveMixEnabled;refreshSoundPack();
    savePreference(LIVE_MIX_PREF,liveMixEnabled);
    config.showUiHelp(liveMixEnabled?
      'APPROVED SOUND LAB MIX ACTIVE':
      'TEST MIX OFF · ORIGINAL GAME AUDIO ACTIVE',2400);
    return liveMixEnabled;
  }
  function toggleRoomAudio():boolean{
    roomAudioEnabled=!roomAudioEnabled;
    savePreference(ROOM_AUDIO_PREF,roomAudioEnabled);
    config.showUiHelp(roomAudioEnabled?
      'ROOM ACOUSTICS ENABLED':
      'ROOM ACOUSTICS OFF · DRY SOURCE AUDIO',2400);
    return roomAudioEnabled;
  }
  function toggleUiSound():boolean{
    uiSoundEnabled=!uiSoundEnabled;
    savePreference(UI_SOUND_PREF,uiSoundEnabled);
    if(uiSoundEnabled)uiClickTone('select');
    return uiSoundEnabled;
  }
  /** Keep settings presentation here, not in the tactical HUD renderer. */
  function bindSettings(controls:{
    liveMix:HTMLButtonElement;
    roomAudio:HTMLButtonElement;
    uiSound:HTMLButtonElement;
  }):void{
    const sync=()=>{
      controls.liveMix.textContent=liveMixEnabled?'TEST MIX ON':'TEST MIX OFF';
      controls.liveMix.setAttribute('aria-pressed',String(liveMixEnabled));
      controls.roomAudio.textContent=roomAudioEnabled?
        'ROOM ACOUSTICS ON':'ROOM ACOUSTICS OFF';
      controls.roomAudio.setAttribute('aria-pressed',String(roomAudioEnabled));
      controls.uiSound.textContent=uiSoundEnabled?'UI SOUND ON':'UI SOUND OFF';
      controls.uiSound.setAttribute('aria-pressed',String(uiSoundEnabled));
    };
    controls.liveMix.addEventListener('click',()=>{toggleLiveMix();sync();});
    controls.roomAudio.addEventListener('click',()=>{toggleRoomAudio();sync();});
    controls.uiSound.addEventListener('click',()=>{toggleUiSound();sync();});
    sync();
  }
  function bindReplayMute(button:HTMLButtonElement,
    refreshHud:()=>void):void{
    button.addEventListener('click',()=>{
      toggleReplaySound();refreshHud();
    });
  }
  return {
    unlock,stopReplaySounds,resetLive,beginReplay,endReplay,
    beginVideoCapture,endVideoCapture,
    consumeLiveFrame,playReplayBetween,playOrderCue,uiClickTone,
    toggleReplaySound,toggleLiveMix,toggleRoomAudio,toggleUiSound,
    bindSettings,bindReplayMute,
    get replaySoundEnabled(){return replaySoundEnabled;},
    get liveMixEnabled(){return liveMixEnabled;},
    get roomAudioEnabled(){return roomAudioEnabled;},
    get uiSoundEnabled(){return uiSoundEnabled;}
  };
}
