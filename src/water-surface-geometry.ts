/**
 * Build 024.1 — mesh-safe shoreline clipping shared by river, flood and pond
 * patches. The water solver is the source of elevations, not this renderer.
 *
 * IMPORTANT: Never connect a dry terrain-height vertex directly to a remote
 * raised-water vertex. That constructs a dark, almost vertical sheet in 3-D.
 * Each locally supported water patch is instead clipped against the actual
 * sampled ground, and only the submerged polygon is triangulated.
 */
export type WaterVertex={
  x:number;z:number;groundY:number;waterY:number;coverage:number;
};
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
export function submergedDepth(v:WaterVertex):number{
  return Math.max(0,v.waterY-v.groundY);
}
export function waterCoverage(v:WaterVertex):number{
  return clamp(v.coverage);
}
export function wetSignal(v:WaterVertex):number{
  // Both depth AND nonzero supported footprint are necessary. A render
  // smoothing kernel by itself does not get to create wet terrain.
  return Math.min(v.waterY-v.groundY, (v.coverage-0.0001)*0.04);
}
function interpolate(a:WaterVertex,b:WaterVertex,t:number):WaterVertex{
  const mix=(x:number,y:number)=>x+(y-x)*t;
  return {
    x:mix(a.x,b.x),z:mix(a.z,b.z),
    groundY:mix(a.groundY,b.groundY),
    waterY:mix(a.waterY,b.waterY),
    coverage:mix(a.coverage,b.coverage),
  };
}
export function clipWaterTriangle(
  a:WaterVertex,b:WaterVertex,c:WaterVertex,
):WaterVertex[][]{
  const vertices=[a,b,c];
  // Refuse triangles bridging implausible local steps in water surface
  // elevation. They are unrelated patches, not the wall of a river.
  const levels=vertices.map(v=>v.waterY);
  if(Math.max(...levels)-Math.min(...levels)>.12)return [];
  let output:WaterVertex[]=[];
  for(let i=0;i<3;i++){
    const first=vertices[i],second=vertices[(i+1)%3];
    const da=wetSignal(first),db=wetSignal(second);
    const firstWet=da>0,secondWet=db>0;
    if(firstWet)output.push(first);
    if(firstWet!==secondWet){
      const t=Math.max(0,Math.min(1,da/(da-db)));
      output.push(interpolate(first,second,t));
    }
  }
  if(output.length<3)return [];
  const triangles:WaterVertex[][]=[];
  for(let i=1;i<output.length-1;i++){
    const p=output[0],q=output[i],r=output[i+1];
    const area=Math.abs((q.x-p.x)*(r.z-p.z)-(q.z-p.z)*(r.x-p.x));
    if(area<1e-9)continue;
    triangles.push([p,q,r]);
  }
  return triangles;
}

/** No visible water should be emitted if all samples are dry or unsupported. */
export function triangleHasVisibleWater(vertices:readonly WaterVertex[]):boolean{
  return vertices.some(v=>submergedDepth(v)>.00025&&waterCoverage(v)>.015);
}
