/** Bounded authentic replay-frame capture. Never performs simulation,
 * changes the replay time, or presents an omniscient image.
 * The graphical gallery fallback is not a screenshot.
 */
import type {MissionRecorder} from './breach-replay.ts';
import type {HighlightMoment} from './breach-highlight-frames.ts';
export type HighlightStill={url:string;at:number;perspective:string;quality:number};
type Candidate={start:number;end:number;next:number;attempts:number};
export class HighlightCapture{
 private cache=new WeakMap<MissionRecorder,Map<string,HighlightStill>>();
 private pending=new WeakMap<MissionRecorder,Map<string,Candidate>>();
 private readonly maxBytes=1048576;
 private readonly attempts=6;
 queue(rec:MissionRecorder,moments:readonly HighlightMoment[]):void{
  const candidates=new Map<string,Candidate>();
  const stored=this.cache.get(rec)??new Map<string,HighlightStill>();
  for(const m of moments.slice(0,5)){
   if(stored.has(m.id))continue;
   const start=Math.max(0,m.at-.5),end=Math.min(rec.duration,
     Math.max(m.end,m.at+.6)+1);
   if(end>start)candidates.set(m.id,{start,end,next:start,attempts:0});
  }
  this.pending.set(rec,candidates);
 }
 get(rec:MissionRecorder,id:string):HighlightStill|null{
  return this.cache.get(rec)?.get(id)??null;
 }
 frame(rec:MissionRecorder,scene:HTMLCanvasElement|null,
   overlay:HTMLCanvasElement,time:number,perspective:string):void{
  const pending=this.pending.get(rec);if(!pending?.size)return;
  const entry=[...pending].find(([,c])=>time>=c.next&&time<=c.end);
  if(!entry)return;
  const [id,candidate]=entry;
  if(candidate.attempts>=this.attempts){pending.delete(id);return;}
  candidate.attempts++;candidate.next=time+.28;
  const source=scene??overlay;
  if(source.width<=0||source.height<=0)return;
  try{
   const width=640,height=360,canvas=document.createElement('canvas');
   canvas.width=width;canvas.height=height;
   const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)return;
   ctx.fillStyle='#172820';ctx.fillRect(0,0,width,height);
   const scale=Math.min(width/source.width,height/source.height);
   const w=source.width*scale,h=source.height*scale;
   const x=(width-w)/2,y=(height-h)/2;
   if(scene)ctx.drawImage(scene,x,y,w,h);
   ctx.drawImage(overlay,x,y,w,h);
   const pixels=ctx.getImageData(width/4,height/4,width/2,height/2).data;
   let min=255,max=0,mean=0,samples=0;
   for(let i=0;i<pixels.length;i+=160){
     const l=(pixels[i]+pixels[i+1]+pixels[i+2])/3;
     min=Math.min(min,l);max=Math.max(max,l);mean+=l;samples++;
   }
   const contrast=max-min;
   if(contrast<15)return;
   const quality=Math.round(Math.min(100,contrast*.45+
     Math.min(35,(mean/Math.max(1,samples))*.2)));
   const previous=this.cache.get(rec)?.get(id);
   if(previous&&previous.quality>=quality)return;
   const url=canvas.toDataURL('image/webp',.70);
   if(!url.startsWith('data:image/')||url.length>this.maxBytes)return;
   const cache=this.cache.get(rec)??new Map<string,HighlightStill>();
   const used=[...cache.entries()].reduce((n,[key,v])=>
     n+(key===id?0:v.url.length),0);
   if(used+url.length>this.maxBytes)return;
   cache.set(id,{url,at:time,perspective,quality});this.cache.set(rec,cache);
   if(quality>=62)pending.delete(id);
  }catch{/* Browser GPU readback/export can fail without blocking the gallery. */}
  if(candidate.attempts>=this.attempts)pending.delete(id);
 }
}
export const highlightCapture=new HighlightCapture();
