/** Lightweight five-moment gallery.
 * Image source is an actual completed replay frame or nothing.
 */
import type {MissionRecorder} from '../breach-replay.ts';
import type {HighlightMoment} from '../breach-highlight-frames.ts';
import {highlightCapture} from '../breach-highlight-capture.ts';
const make=(tag:string,cls='',text?:string)=>{
 const el=document.createElement(tag);if(cls)el.className=cls;
 if(text!==undefined)el.textContent=text;return el;
};
const stamp=(t:number)=>Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0');
export function renderAfterActionHighlights(
 moments:readonly HighlightMoment[],rec:MissionRecorder,
 watch:(moment:HighlightMoment)=>void
):HTMLElement{
 const root=make('section','fw-after-section');
 root.append(make('h2','fw-after-heading','MISSION HIGHLIGHTS'),
   make('p','fw-after-muted',
    'Ranked tactical events. Still images are captured only from authentic replay frames.'));
 if(!moments.length)root.append(make('p','fw-after-empty',
   'No notable event cluster is recorded for this mission.'));
 for(const moment of moments){
  const card=make('article','fw-highlight-card');
  const still=highlightCapture.get(rec,moment.id);
  if(still){
   const picture=document.createElement('img');
   picture.src=still.url;picture.alt=moment.label+
     ' · '+still.perspective+' at '+stamp(still.at);
   picture.loading='lazy';card.append(picture);
   card.append(make('small','fw-after-muted',still.perspective+
     ' · VERIFIED REPLAY FRAME'));
  }else{
   card.append(make('div','fw-highlight-placeholder',
     'NO VERIFIED STILL · WATCH REPLAY TO COLLECT'));
  }
  card.append(make('h3','',stamp(moment.at)+' · '+moment.label),
    make('p','fw-after-muted',moment.summary));
  const buttons=make('div','fw-highlight-actions');
  const play=document.createElement('button');play.type='button';
  play.textContent='VIEW LOOPED BODYCAM';play.addEventListener('click',()=>watch(moment));
  buttons.append(play);
  if(still){
    const save=document.createElement('a');save.textContent='SAVE IMAGE';
    save.href=still.url;save.download='fieldwork-highlight-'+moment.id.replace(/[^a-z0-9-]/gi,'')+'.webp';
    buttons.append(save);
  }
  card.append(buttons);root.append(card);
 }
 return root;
}
