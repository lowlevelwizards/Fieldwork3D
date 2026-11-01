/** Optional and allocation-bounded CPU frame measurements.
 * GPU work is asynchronous: renderer statistics are counts, NOT GPU milliseconds. */
export type FrameMeasures={frame:number;cadence?:number;sim:number;scene:number;overlay:number;steps:number;draws:number;triangles:number};
export class FrameMeter{
  private samples:FrameMeasures[]=[];
  add(value:FrameMeasures){this.samples.push(value);if(this.samples.length>120)this.samples.shift();}
  summary(){
    const data=this.samples;
    const series=(key:keyof FrameMeasures)=>data.map(s=>s[key]??0).sort((a,b)=>a-b);
    const percentile=(v:number[],p:number)=>v.length?v[Math.min(v.length-1,Math.floor(p*(v.length-1)))]:0;
    const avg=(key:keyof FrameMeasures)=>data.reduce((sum,s)=>sum+s[key],0)/Math.max(1,data.length);
    return {fps:1000/Math.max(.001,percentile(series('frame'),.5)),
      p50:percentile(series('frame'),.5),p95:percentile(series('frame'),.95),
      rafP50:percentile(series('cadence'),.5),
      rafP95:percentile(series('cadence'),.95),
      worst:percentile(series('frame'),1),
      simulation:avg('sim'),scene:avg('scene'),overlay:avg('overlay'),
      steps:avg('steps'),draws:avg('draws'),triangles:avg('triangles')};
  }
}