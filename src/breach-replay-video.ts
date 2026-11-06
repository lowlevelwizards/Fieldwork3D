/** Replay R2: bounded browser-native quick video export.
 * One composite canvas records the completed WebGL scene + tactical overlay.
 * This is real-time capture, not frame-accurate offline Studio Export.
 */
export const QUICK_VIDEO_SECONDS=20;
/** Canvas capture encoders need more than an instantaneous terminal frame. */
export const MIN_VIDEO_WALL_MS=1800;

export function replayVideoMime(
  supports:(mime:string)=>boolean
):string|null{
  // Prefer WebM in Chromium: advertised MP4 support may still produce
  // an empty blob for short canvas captures. Safari uses MP4 fallback.
  for(const mime of [
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp9,opus',
    'video/webm',
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4'
  ])if(supports(mime))return mime;
  return null;
}
export function replayVideoSize(width:number,height:number){
  return width>=height?{width:1280,height:720}:{width:720,height:1280};
}
export class ReplayQuickVideo{
  private recorder:MediaRecorder|null=null;
  private stream:MediaStream|null=null;
  private canvas:HTMLCanvasElement|null=null;
  private ctx:CanvasRenderingContext2D|null=null;
  private parts:Blob[]=[];
  private stopping=false;
  private since=0;
  private mime='';
  private startedWall=0;
  private endOfFilm=false;
  private capturedFrames=0;
  private readonly onComplete:(file:Blob,mime:string)=>void;
  private readonly onError:(reason:string)=>void;
  constructor(onComplete:(file:Blob,mime:string)=>void,
    onError:(reason:string)=>void){
    this.onComplete=onComplete;
    this.onError=onError;
  }
  get active(){return !!this.recorder&&!this.stopping;}
  get pendingEnd(){return this.endOfFilm;}
  start(time:number,viewport:{width:number;height:number},
    audioStream:MediaStream|null=null):boolean{
    if(this.recorder||typeof MediaRecorder==='undefined')return false;
    const mime=replayVideoMime(type=>MediaRecorder.isTypeSupported(type));
    if(!mime)return false;
    try{
      const video=document.createElement('canvas');
      const size=replayVideoSize(viewport.width,viewport.height);
      video.width=size.width;video.height=size.height;
      const ctx=video.getContext('2d',{alpha:false});
      if(!ctx||typeof video.captureStream!=='function')return false;
      const stream=video.captureStream(30);
      if(audioStream)
        for(const track of audioStream.getAudioTracks())
          stream.addTrack(track);
      this.stream=stream;
      const recorder=new MediaRecorder(stream,{
        mimeType:mime,videoBitsPerSecond:3_000_000
      });
      this.canvas=video;this.ctx=ctx;
      this.recorder=recorder;this.parts=[];this.stopping=false;
      this.since=time;this.mime=mime;
      this.startedWall=performance.now();this.endOfFilm=false;
      this.capturedFrames=0;
      recorder.ondataavailable=event=>{
        if(event.data.size)this.parts.push(event.data);
      };
      recorder.onerror=()=>{
        recorder.onstop=null;
        this.onError('VIDEO ENCODER ERROR');this.cleanup();
      };
      recorder.onstop=()=>{
        const blob=new Blob(this.parts,{type:this.mime});
        const mimeOut=this.mime;
        this.cleanup();
        if(blob.size)this.onComplete(blob,mimeOut);
        else this.onError('EMPTY VIDEO RECORDING');
      };
      recorder.start(500);
      return true;
    }catch{
      this.cleanup();return false;
    }
  }
  /** Call immediately after both battlefield and overlay are rendered. */
  drawFrame(scene:HTMLCanvasElement|null,
    overlay:HTMLCanvasElement,time:number):void{
    if(!this.active||!this.canvas||!this.ctx)return;
    const ctx=this.ctx,w=this.canvas.width,h=this.canvas.height;
    ctx.fillStyle='#142422';ctx.fillRect(0,0,w,h);
    const source=scene??overlay;
    const sw=source.width,sh=source.height;
    if(sw<=0||sh<=0)return;
    const scale=Math.min(w/sw,h/sh);
    const dw=sw*scale,dh=sh*scale,x=(w-dw)/2,y=(h-dh)/2;
    if(scene)ctx.drawImage(scene,x,y,dw,dh);
    ctx.drawImage(overlay,x,y,dw,dh);
    ctx.fillStyle='#12201fbd';ctx.fillRect(18,14,272,36);
    ctx.fillStyle='#e4d8c0';ctx.font='600 18px monospace';
    ctx.fillText('FIELDWORK  ·  REPLAY',28,39);
    this.capturedFrames++;
    if(time-this.since>=QUICK_VIDEO_SECONDS)this.finishAtEnd();
    if(this.endOfFilm&&this.capturedFrames>=2&&
      performance.now()-this.startedWall>=MIN_VIDEO_WALL_MS)this.stop();
  }
  /** Hold the last battlefield frame while the browser encoder receives
   * enough real-time frames to finalize even a 0.3s terminal replay.
   * This does not lengthen or change the authoritative mission recording.
   */
  finishAtEnd():void{
    if(this.recorder)this.endOfFilm=true;
  }
  stop():void{
    if(!this.recorder||this.stopping)return;
    this.stopping=true;
    try{
      if(this.recorder.state==='recording')this.recorder.stop();
      else this.cleanup();
    }catch{
      this.onError('COULD NOT FINALIZE VIDEO');this.cleanup();
    }
  }
  private cleanup():void{
    for(const track of this.stream?.getTracks()??[])track.stop();
    this.endOfFilm=false;this.capturedFrames=0;
    this.recorder=null;this.stream=null;this.canvas=null;this.ctx=null;
    this.parts=[];this.stopping=false;
  }
}
