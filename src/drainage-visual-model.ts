/** Render-only thresholds and interpolation for live, measured runoff. */
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));

/** Diffuse sheet runoff darkens soil but must not become a blue grid of rills. */
export function visibleStream(litres:number,upstreamCells:number,incisedProximity:number):boolean{
  if(!Number.isFinite(litres)||litres<=.09)return false;
  return upstreamCells>=18 ||
    (upstreamCells>=6 && incisedProximity>=.38) ||
    (incisedProximity>=.78 && litres>.20);
}

/** Width is hierarchical: a small headwater cannot look like the main stem. */
export function streamWidth(litres:number,upstreamCells:number):number{
  if(litres<=0)return 0;
  return clamp(.023+.014*Math.log1p(Math.max(0,litres))
    +.0055*Math.sqrt(Math.max(0,upstreamCells)),.025,.20);
}

export type ChannelPoint={x:number;z:number};

/**
 * Cubic Hermite segment through actual downstream cell centers. Its tangents
 * follow the contributing upstream and receiving downstream cells, not noise
 * or arbitrary river art. Both ends are exactly on the routed flow graph.
 */
export function flowCurvePoint(
  previous:ChannelPoint,start:ChannelPoint,end:ChannelPoint,following:ChannelPoint,t:number,
):ChannelPoint{
  const u=clamp(t,0,1),u2=u*u,u3=u2*u;
  const a=2*u3-3*u2+1,b=u3-2*u2+u,c=-2*u3+3*u2,d=u3-u2;
  return {
    x:a*start.x+b*(end.x-previous.x)*.5+c*end.x+d*(following.x-start.x)*.5,
    z:a*start.z+b*(end.z-previous.z)*.5+c*end.z+d*(following.z-start.z)*.5,
  };
}

/** Shallow flood films and deeper pools have gently feathered boundaries. */
export function floodOpacity(depth:number):number{
  if(!Number.isFinite(depth)||depth<=0)return 0;
  return clamp(Math.sqrt(depth)*1.9,0,.78);
}

/** A visual chain comprises downhill grid links; each link belongs to one chain.
 * At a junction, the most contributing incoming branch continues as the trunk,
 * while other branches terminate at the exact same physical confluence.
 */
export function extractChannelChains(
  downhill:readonly number[], active:readonly boolean[], contributing:readonly number[],
):number[][] {
  if(downhill.length!==active.length||active.length!==contributing.length)
    throw new Error('Channel arrays must have matching lengths');
  const n=downhill.length;
  const incoming:number[][]=Array.from({length:n},()=>[]);
  for(let i=0;i<n;i++){
    const target=downhill[i];
    if(active[i]&&target>=0&&target<n&&target!==i)incoming[target].push(i);
  }
  const trunk=new Int32Array(n).fill(-1);
  for(let i=0;i<n;i++){
    for(const upstream of incoming[i]){
      const best=trunk[i];
      if(best<0||contributing[upstream]>contributing[best]||
        (contributing[upstream]===contributing[best]&&upstream<best)){
        trunk[i]=upstream;
      }
    }
  }
  const visited=new Uint8Array(n);
  const chains:number[][]=[];
  const walk=(start:number)=>{
    const chain=[start];
    let current=start;
    while(active[current]&&!visited[current]){
      const next=downhill[current];
      if(next<0||next>=n||next===current)break;
      visited[current]=1;
      chain.push(next);
      // A side tributary terminates at the confluence. The trunk
      // occupies the following edge so no graph edge is duplicated.
      if(!active[next]||trunk[next]!==current)break;
      current=next;
    }
    if(chain.length>1)chains.push(chain);
  };
  for(let i=0;i<n;i++){
    if(!active[i]||downhill[i]<0||downhill[i]>=n)continue;
    if(trunk[i]<0)walk(i);
  }
  // Defensive coverage for unexpected cycles or malformed inputs.
  for(let i=0;i<n;i++){
    if(active[i]&&!visited[i]&&downhill[i]>=0&&downhill[i]<n)walk(i);
  }
  return chains;
}

/** Neighbor-aware stream width/opacity: identical junction positions never
 * receive repeated, independently changing per-link start/end profiles.
 */
export function smoothChannelProfile(values:readonly number[],radius=2):number[]{
  if(radius<0||!Number.isInteger(radius))throw new Error('Invalid profile radius');
  return values.map((v,i)=>{
    let sum=0,weight=0;
    for(let j=Math.max(0,i-radius);j<=Math.min(values.length-1,i+radius);j++){
      const w=radius+1-Math.abs(j-i);
      sum+=values[j]*w;
      weight+=w;
    }
    return weight?(.30*v+.70*sum/weight):v;
  });
}

export function channelChainPoint(
  points:readonly ChannelPoint[],segment:number,t:number,
):ChannelPoint {
  if(points.length<2||segment<0||segment>=points.length-1)
    throw new Error('Expected a downstream polyline segment');
  const start=points[segment],end=points[segment+1];
  const previous=points[segment-1]??{
    x:2*start.x-end.x,z:2*start.z-end.z,
  };
  const following=points[segment+2]??{
    x:2*end.x-start.x,z:2*end.z-start.z,
  };
  return flowCurvePoint(previous,start,end,following,t);
}

/** Core bank shape stays distinct while the drying fringe merges into soil. */
export function bankFringeWeight(proximity:number):number{
  const u=clamp((proximity-.08)/.85,0,1);
  return u*u*(3-2*u);
}
