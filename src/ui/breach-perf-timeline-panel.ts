/** Opt-in mobile-first developer telemetry. All DOM/canvas work is behind
 * ?perf=1, and visual painting is capped by the calling 750ms cadence.
 * The game controls and camera are never affected by this panel.
 */
import {PerformanceTimeline,performanceHotspot,
 type PerformanceTimelineBucket,PERFORMANCE_BUCKET_COUNT}
 from '../breach-performance-timeline.ts';

const style=<T extends HTMLElement>(e:T,s:string):T=>{e.style.cssText=s;return e;};
const button=(title:string)=>{
 const e=document.createElement('button');
 e.type='button';e.textContent=title;
 style(e,'background:#293c3d;color:#e1e9d5;border:1px solid #607675;'+
  'padding:5px 7px;border-radius:5px;font:11px monospace;'+
  'pointer-events:auto;touch-action:manipulation;cursor:pointer;');
 return e;
};
export class BreachPerfTimelinePanel{
 readonly root:HTMLDivElement;
 readonly metrics:HTMLPreElement;
 private readonly canvas:HTMLCanvasElement;
 private readonly graphButton:HTMLButtonElement;
 private readonly detailButton:HTMLButtonElement;
 private readonly copyButton:HTMLButtonElement;
 private readonly exportButton:HTMLButtonElement;
 private readonly insight:HTMLDivElement;
 private graphVisible=true;
 private expandedDetails=false;
 private selectedBucket:number|null=null;
 private policy='planning';
 private view='iso';
 private timeline:PerformanceTimeline|null=null;
 constructor(){
  const root=style(document.createElement('div'),
   'position:fixed;top:4px;right:4px;z-index:9999;'+
   'background:#102021eb;color:#d5ebd8;font:11px/1.25 monospace;'+
   'padding:6px;max-width:min(90vw,416px);width: min(90vw,416px);'+
   'max-height:62vh;overflow:auto;box-sizing:border-box;'+
   'pointer-events:none;border:1px solid #415c58;border-radius:6px;');
  root.setAttribute('aria-label','Fieldwork 60-second performance timeline');
  const bar=style(document.createElement('div'),
   'display:flex;gap:5px;align-items:center;justify-content:space-between;'+
   'margin-bottom:4px;flex-wrap:wrap;pointer-events:none;');
  const label=document.createElement('strong');
  label.textContent='PERF HISTORY · 60s';label.style.fontSize='11px';
  bar.append(label);
  const controls=style(document.createElement('div'),
   'display:flex;gap:4px;pointer-events:none;');
  this.graphButton=button('GRAPH ▾');
  this.detailButton=button('DETAILS');
  this.copyButton=button('COPY');
  this.exportButton=button('TXT');
  this.copyButton.title='Copy short chat summary';
  this.exportButton.title='Download complete 60-second TXT report';
  controls.append(this.graphButton,this.detailButton,this.copyButton,
   this.exportButton);
  bar.append(controls);root.append(bar);
  this.canvas=document.createElement('canvas');
  this.canvas.width=370;this.canvas.height=108;
  this.canvas.setAttribute('aria-label',
   'Rolling 60 second frame-time chart. Tap a spike to inspect its measured work.');
  style(this.canvas,'display:block;width:100%;height:108px;'+
   'pointer-events:auto;touch-action:manipulation;');
  root.append(this.canvas);
  this.insight=style(document.createElement('div'),
   'font:11px/1.35 monospace;min-height:28px;max-height:72px;'+
   'overflow:auto;white-space:normal;margin:4px 0;');
  this.insight.textContent='Collecting frame-time history…';
  root.append(this.insight);
  this.metrics=style(document.createElement('pre'),
   'white-space:pre;font:10.5px/1.2 monospace;'+
   'margin:2px 0 0;max-height:32px;overflow:hidden;'+
   'color:#d5ebd8;pointer-events:none;');
  root.append(this.metrics);
  this.root=root;
  this.graphButton.addEventListener('click',()=>{
   this.graphVisible=!this.graphVisible;
   this.canvas.style.display=this.graphVisible?'block':'none';
   this.insight.style.display=this.graphVisible?'block':'none';
   this.graphButton.textContent=this.graphVisible?'GRAPH ▾':'GRAPH ▸';
  });
  this.detailButton.addEventListener('click',()=>{
   this.expandedDetails=!this.expandedDetails;
   this.metrics.style.maxHeight=this.expandedDetails?'none':'32px';
   this.metrics.style.overflow=this.expandedDetails?'visible':'hidden';
   this.detailButton.textContent=this.expandedDetails?'LESS':'DETAILS';
  });
  this.copyButton.addEventListener('click',()=>{
   const report=this.timeline?.compactReport(this.policy,this.view)??'No history';
   if(navigator.clipboard?.writeText){
    void navigator.clipboard.writeText(report).then(()=>{
      this.copyButton.textContent='COPIED';
    }).catch(()=>this.selectReport(report));
   }else this.selectReport(report);
  });
  this.exportButton.addEventListener('click',()=>{
   const summary=this.timeline?.report(this.policy,this.view)??'No history';
   const csv=this.timeline?.bucketCSV()??'';
   const report=summary+'\n\nFULL 60s HISTORY (250ms bucket peaks)\n'+csv+'\n';
   const blob=new Blob([report],{type:'text/plain;charset=utf-8'});
   const url=URL.createObjectURL(blob);
   const link=document.createElement('a');
   link.href=url;
   link.download='fieldwork-perf-'+
    new Date().toISOString().slice(0,19).replace(/:/g,'-')+'.txt';
   document.body.appendChild(link);
   link.click();
   link.remove();
   window.setTimeout(()=>URL.revokeObjectURL(url),30000);
  });
  this.canvas.addEventListener('pointerdown',event=>{
   const history=this.timeline?.buckets();
   if(!history?.length)return;
   const bounds=this.canvas.getBoundingClientRect();
   const x=(event.clientX-bounds.left)/Math.max(1,bounds.width);
   const bucketAt=(history[history.length-1].bucket-
    (PERFORMANCE_BUCKET_COUNT-1))+Math.round(
     Math.min(1,Math.max(0,x))*(PERFORMANCE_BUCKET_COUNT-1));
   let nearest:PerformanceTimelineBucket|undefined;
   for(const item of history){
    if(!nearest||Math.abs(item.bucket-bucketAt)<
      Math.abs(nearest.bucket-bucketAt))nearest=item;
   }
   this.selectedBucket=nearest?.bucket??null;
   this.refreshInsight();
   this.draw();
  });
 }
 private selectReport(report:string):void{
  // Visible fallback for iOS browsers without clipboard permission.
  window.prompt('Copy Fieldwork performance report',report);
 }
 update(text:string,timeline:PerformanceTimeline,policy:string,view:string):void{
  this.timeline=timeline;this.policy=policy;this.view=view;
  this.metrics.textContent=text;
  this.refreshInsight();if(this.graphVisible)this.draw();
 }
 private refreshInsight():void{
  const list=this.timeline?.buckets();
  if(!list?.length){this.insight.textContent='Collecting 60s history…';return;}
  const latest=list[list.length-1].peak.at;
  const selected=list.find(b=>b.bucket===this.selectedBucket);
  const worst=this.timeline?.recentSpikes(1)[0];
  const peak=(selected??worst)?.peak;
  if(!peak){
   this.insight.textContent='No RAF gaps over 33ms in this window.';return;
  }
  const ago=Math.max(0,(latest-peak.at)/1000).toFixed(1);
  this.insight.textContent=(selected?'SELECTED':'WORST')+' · '+
   ago+'s ago · RAF '+peak.raf.toFixed(0)+'ms / JS '+
   peak.js.toFixed(0)+'ms / SYNC '+peak.sync.toFixed(0)+
   'ms · '+performanceHotspot(peak)+
   ' · fog +'+peak.fogPaints+' shadow +'+peak.shadowRefreshes+
   ' · '+peak.phase+', '+peak.camera;
 }
 private draw():void{
  const ctx=this.canvas.getContext('2d');
  if(!ctx)return;
  const w=this.canvas.width,h=this.canvas.height;
  ctx.clearRect(0,0,w,h);ctx.fillStyle='#162b2b';ctx.fillRect(0,0,w,h);
  const bins=this.timeline?.buckets();
  if(!bins?.length)return;
  const newest=bins[bins.length-1].bucket;
  // A 1-second browser stall must not make ordinary 33–100ms spikes invisible.
  // Off-scale bars receive a visible top marker; exact timing stays tappable.
  const max=Math.min(250,Math.max(100,
   Math.ceil((this.timeline?.maxRaf()??100)/50)*50));
  const top=h-12,chartHeight=h-25,zero=top;
  const y=(v:number)=>Math.max(4,zero-Math.min(max,v)/max*chartHeight);
  ctx.font='9px monospace';
  for(const threshold of [16.7,33.3,66.7]){
   ctx.strokeStyle='#3b5350';ctx.lineWidth=1;
   ctx.beginPath();ctx.moveTo(0,y(threshold));
   ctx.lineTo(w,y(threshold));ctx.stroke();
   ctx.fillStyle='#b0c3ba';
   ctx.fillText(Math.round(threshold)+'ms',3,y(threshold)-2);
  }
  const start=newest-(PERFORMANCE_BUCKET_COUNT-1);
  const x=(b:number)=>(b-start)/(PERFORMANCE_BUCKET_COUNT-1)*(w-2)+1;
  for(const bucket of bins){
   const px=x(bucket.bucket),peak=bucket.peak;
   ctx.lineWidth=1.1;
   ctx.strokeStyle=peak.raf>=66.7?'#e27475':
     peak.raf>=33.3?'#e4aa76':'#b0bd9d';
   ctx.beginPath();ctx.moveTo(px,zero);
   ctx.lineTo(px,y(peak.raf));ctx.stroke();
   if(peak.raf>max){
    ctx.fillStyle='#e27475';ctx.fillRect(px-1,2,3,3);
   }
   ctx.strokeStyle='#76c4bc';ctx.lineWidth=1.3;
   ctx.beginPath();ctx.moveTo(px,y(bucket.maxSync));
   ctx.lineTo(px+1,y(bucket.maxSync));ctx.stroke();
   if(bucket.bucket===this.selectedBucket){
    ctx.strokeStyle='#f2f2cc';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(px,0);ctx.lineTo(px,h);ctx.stroke();
   }
  }
  ctx.fillStyle='#d5ebd8';ctx.font='9px monospace';
  ctx.fillText('RAF bars / SYNC dots',7,h-2);
  ctx.fillText('← 60s',w-88,h-2);
  ctx.fillText('now →',w-41,h-2);
 }
}
