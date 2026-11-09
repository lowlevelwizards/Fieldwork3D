/** Optional and allocation-bounded CPU frame measurements.
 * GPU work is asynchronous: renderer statistics are counts, NOT GPU milliseconds. */
export type FrameMeasures={frame:number;cadence?:number;sim:number;scene:number;overlay:number;recording?:number;steps:number;draws:number;triangles:number};
export class FrameMeter{
  private samples:FrameMeasures[]=[];
  private next=0;
  /** Fixed-capacity rolling sample window. Replacing the oldest slot avoids
   * shifting 119 entries every RAF when the optional perf overlay is active. */
  add(value:FrameMeasures){
    if(this.samples.length<120){this.samples.push(value);return;}
    this.samples[this.next]=value;
    this.next=(this.next+1)%120;
  }
  summary(){
    const data=this.samples;
    const series=(key:keyof FrameMeasures)=>data.map(s=>s[key]??0).sort((a,b)=>a-b);
    const percentile=(v:number[],p:number)=>v.length?v[Math.min(v.length-1,Math.floor(p*(v.length-1)))]:0;
    const avg=(key:keyof FrameMeasures)=>data.reduce((sum,s)=>sum+(s[key]??0),0)/Math.max(1,data.length);
    return {fps:1000/Math.max(.001,percentile(series('frame'),.5)),
      p50:percentile(series('frame'),.5),p95:percentile(series('frame'),.95),
      rafP50:percentile(series('cadence'),.5),
      rafP95:percentile(series('cadence'),.95),
      worst:percentile(series('frame'),1),
      simulation:avg('sim'),recording:avg('recording'),scene:avg('scene'),overlay:avg('overlay'),
      steps:avg('steps'),draws:avg('draws'),triangles:avg('triangles')};
  }
}