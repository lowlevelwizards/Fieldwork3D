/** Replay R2: precise transport, independent of render FPS and simulation. */
export type TimeSample={t:number};
const EPS=1e-7;
export function stepReplaySample(
  frames:readonly TimeSample[],time:number,direction:-1|1
):number{
  if(!frames.length)return 0;
  let lo=0,hi=frames.length;
  if(direction>0){
    while(lo<hi){
      const mid=(lo+hi)>>>1;
      if(frames[mid].t<=time+EPS)lo=mid+1;else hi=mid;
    }
    return frames[Math.min(lo,frames.length-1)].t;
  }
  while(lo<hi){
    const mid=(lo+hi)>>>1;
    if(frames[mid].t<time-EPS)lo=mid+1;else hi=mid;
  }
  return frames[Math.max(0,lo-1)].t;
}

/** Visual interpolation step, not an authoritative simulation tick. */
export function stepReplayPresentation(
  time:number,duration:number,direction:-1|1,fps:30|60=60
):number{
  const frame=direction>0?
    Math.floor(time*fps+EPS)+1:Math.ceil(time*fps-EPS)-1;
  return Math.max(0,Math.min(duration,frame/fps));
}

export function formatReplayTime(time:number):string{
  const ms=Math.max(0,Math.round(time*1000));
  const seconds=Math.floor(ms/1000),minutes=Math.floor(seconds/60);
  return String(minutes).padStart(2,'0')+':'+
    String(seconds%60).padStart(2,'0')+'.'+
    String(ms%1000).padStart(3,'0');
}
