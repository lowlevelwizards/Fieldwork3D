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
