/** V3-D: one featured highlight; real image or clearly labeled schematic.
 * Never print a fabricated still or reveal undiscovered enemy positions.
 */
import type {MissionRecorder} from '../breach-replay.ts';
import type {HighlightMoment} from '../breach-highlight-frames.ts';
import {highlightCapture} from '../breach-highlight-capture.ts';
const el=(tag:string,cls='',text?:string)=>{
 const e=document.createElement(tag);e.className=cls;
 if(text!==undefined)e.textContent=text;return e;
};
const time=(t:number)=>Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0');
function schematic(moment:HighlightMoment):HTMLElement{
 const graphic=el('div','fw-v3-highlight-graphic fw-v5-highlight-fallback');
 graphic.setAttribute('role','img');
 graphic.setAttribute('aria-label',
  'Factual incident summary; no verified replay image is available');
 const heading=el('div','fw-v5-highlight-fallback-heading');
 heading.append(el('small','','RECORDED INCIDENT'),
  el('strong','',time(moment.at)));
 graphic.append(heading,el('p','',moment.summary),
  el('small','fw-v5-highlight-fallback-note',
   'NO VERIFIED FRAME · WATCH CLIP FOR RECORDED PLAYBACK'));
 return graphic;
}
export function renderAfterActionHighlights(
 moments:readonly HighlightMoment[],rec:MissionRecorder,
 selectedId:string|null,choose:(id:string)=>void,
 watch:(moment:HighlightMoment)=>void
):HTMLElement{
 const root=el('section','fw-v3-highlights');
 if(!moments.length){
  root.append(el('div','fw-after-empty','NO FEATURED EVENTS IN THIS RECORD'));
  return root;
 }
 const active=moments.find(m=>m.id===selectedId)??moments[0];
 const hero=el('div','fw-v3-highlight-hero');
 const image=highlightCapture.get(rec,active.id);
 if(image){
   const img=document.createElement('img');
   img.src=image.url;img.alt='Recorded '+image.perspective+
     ' replay frame near '+time(image.at);
   hero.append(img);
   hero.append(el('div','fw-v3-highlight-still-label',
     'RECORDED REPLAY FRAME · '+image.perspective));
 }else{
   hero.className+=' fw-v6-highlight-no-frame';
   hero.append(schematic(active));
 }
 const info=el('div','fw-v3-highlight-info');
 const actorNames=active.actorIds.map(id=>rec.manifest?.actors
   .find(actor=>actor.id===id)?.name??null).filter((name):
   name is string=>name!==null);
 info.append(el('small','',time(active.at)+' · RECORDED MOMENT'),
   el('h2','',active.label),
   el('p','',active.summary));
 if(actorNames.length)info.append(el('small','fw-v6-moment-participants',
   'INVOLVED · '+actorNames.slice(0,4).join(' · ')));
 const play=document.createElement('button');play.type='button';
 play.className='fw-v3-highlight-play';play.textContent='▶ WATCH CLIP';
 play.addEventListener('click',()=>watch(active));
 info.append(play);root.append(hero,info);
 const rail=el('div','fw-v3-highlight-rail');
 rail.setAttribute('aria-label','Select featured highlight');
 for(const [i,m] of moments.entries()){
  const b=document.createElement('button');b.type='button';
  b.className='fw-v3-highlight-chip';
  b.setAttribute('aria-pressed',String(m.id===active.id));
  b.setAttribute('aria-label','Highlight '+(i+1)+' '+m.label);
  const thumb=highlightCapture.get(rec,m.id);
  if(thumb){const img=document.createElement('img');img.src=thumb.url;img.alt='';
    img.loading='lazy';b.append(img);}
  b.append(el('small','fw-v5-highlight-chip-time',
    String(i+1).padStart(2,'0')+' · '+time(m.at)),
    el('strong','fw-v5-highlight-chip-title',m.label));
  b.addEventListener('click',()=>choose(m.id));
  rail.append(b);
 }
 root.append(rail);
 if(image){
   const save=document.createElement('a');save.className='fw-v3-highlight-save';
   save.href=image.url;save.download='fieldwork-highlight-'+active.id.replace(/[^a-z0-9-]/gi,'')+'.webp';
   save.textContent='SAVE IMAGE';root.append(save);
 }
 return root;
}
