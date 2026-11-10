/** Authentic screenshots sampled from already rendered replay canvases.
 * No resimulation, no hidden offscreen battlefield render, no live GPU work.
 * A failed/poor frame is simply absent from the gallery.
 */
import type {MissionRecorder} from './breach-replay.ts';
import type {HighlightMoment} from './breach-highlight-frames.ts';
export type HighlightStill={url:string;at:number;perspective:string};
class HighlightCapture{
 private cache=new WeakMap<MissionRecorder,Map<string,HighlightStill>>();
 private pending=new WeakMap<MissionRecorder,Map<string,number>>();
 private maxBytes=1048576;
 queue(rec:MissionRecorder,moments:readonly HighlightMoment[]):void{
  const queue=new Map<string,number>();
  const stored=this.cache.get(rec)??new Map<string,HighlightStill>();
  for(const m of moments.slice(0,5))if(!stored.has(m.id))
    queue.set(m.id,Math.min(rec.duration,m.at+.45));
  this.pending.set(rec,queue);
 }
 get(rec:MissionRecorder,id:string):HighlightStill|null{
  return this.cache.get(rec)?.get(id)??null;
 }
 frame(rec:MissionRecorder,scene:HTMLCanvasElement|null,
   overlay:HTMLCanvasElement,time:number,perspective:string):void{
  const queue=this.pending.get(rec);
  if(!queue?.size)return;
  const current=[...queue].find(([,at])=>Math.abs(time-at)<.08);
  if(!current)return;
  const [id,at]=current;queue.delete(id);void at;
  const source=scene??overlay;
  if(source.width<=0||source.height<=0)return;
  try{
   const w=640,h=360,canvas=document.createElement('canvas');
   canvas.width=w;canvas.height=h;
   const ctx=canvas.getContext('2d',{alpha:false});
   if(!ctx)return;
   ctx.fillStyle='#152520';ctx.fillRect(0,0,w,h);
   const scale=Math.min(w/source.width,h/source.height);
   const dw=source.width*scale,dh=source.height*scale;
   const x=(w-dw)/2,y=(h-dh)/2;
   if(scene)ctx.drawImage(scene,x,y,dw,dh);
   ctx.drawImage(overlay,x,y,dw,dh);
   // Distinguish a blank/unrendered GPU buffer from a useful photograph.
   const pixels=ctx.getImageData(w/4,h/4,w/2,h/2).data;
   let min=255,max=0;
   for(let i=0;i<pixels.length;i+=240){
    const light=(pixels[i]+pixels[i+1]+pixels[i+2])/3;
    min=Math.min(min,light);max=Math.max(max,light);
   }
   if(max-min<12)return;
   const url=canvas.toDataURL('image/webp',.73);
   if(!url.startsWith('data:image/')||url.length>this.maxBytes)return;
   const cache=this.cache.get(rec)??new Map<string,HighlightStill>();
   const used=[...cache.values()].reduce((n,v)=>n+v.url.length,0);
   if(used+url.length>this.maxBytes)return;
   cache.set(id,{url,at:time,perspective});
   this.cache.set(rec,cache);
  }catch{
   // Safari GPU buffer or canvas export can fail: text cards remain usable.
  }
 }
}
export const highlightCapture=new HighlightCapture();
