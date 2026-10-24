/**
 * Build 016 — Ground bears weight.
 *
 * Ground traction, bearing capacity, load damage and recovery, determined
 * by REAL soil saturation and the static ground material. Nothing here
 * changes hydrology, terrain elevation, or water balance; deformation is
 * a shallow surface-condition layer until physical reshaping is implemented.
 */
import { GRID_CELLS, CELL_SIZE, terrainHeight } from './terrain-model.ts';
import { surfaceAt as physicalSurfaceAt, type SurfaceKind } from './surface-materials.ts';

export type TrafficKind = 'foot' | 'vehicle';
export type TrafficCondition = 'firm' | 'slow' | 'difficult' | 'blocked';
export type TrafficObservation = {
  material: SurfaceKind;
  saturation: number;
  mud: number;
  bearingKPa: number;
  traction: number;
  slopeDegrees: number;
  waterDepthM: number;
  rutDepthM: number;
  speedFactor: number;
  condition: TrafficCondition;
};
export type TrafficContext = {
  soilFraction(index:number):number;
  surfaceLevel(id:number):number|null;
  watershed:{cells:readonly {x:number;z:number;height:number}[];cellBasin:readonly number[]};
  waterDepthAtCell?(index:number):number;
};
export type GroundConditionState = {rutDepths:number[];rutAngles:number[]};

const clamp=(v:number,min=0,max=1)=>Math.max(min,Math.min(max,v));
const smooth=(a:number,b:number,v:number)=>{
  const t=clamp((v-a)/(b-a));
  return t*t*(3-2*t);
};

type SoilStrength = {
  dryBearing:number;wetBearing:number;
  dryGrip:number;wetGrip:number;
  deformability:number;recovery:number;
};
export const STRENGTH:Record<SurfaceKind,SoilStrength>={
  loam:{dryBearing:280,wetBearing:63,dryGrip:.96,wetGrip:.48,deformability:.80,recovery:1},
  clay:{dryBearing:340,wetBearing:39,dryGrip:.95,wetGrip:.26,deformability:1,recovery:.64},
  sand:{dryBearing:225,wetBearing:108,dryGrip:.77,wetGrip:.59,deformability:.42,recovery:1.35},
  rock:{dryBearing:1500,wetBearing:1200,dryGrip:1,wetGrip:.68,deformability:0,recovery:0},
  organic:{dryBearing:145,wetBearing:21,dryGrip:.85,wetGrip:.31,deformability:1,recovery:.84},
};
export const LOADS:Record<TrafficKind,{pressureKPa:number;waterLimitM:number;slopeLimitDegrees:number}>={
  foot:{pressureKPa:42,waterLimitM:.40,slopeLimitDegrees:40},
  vehicle:{pressureKPa:195,waterLimitM:.19,slopeLimitDegrees:26},
};
export const MAX_RUT_DEPTH_M=.075;

export function slopeAt(x:number,z:number):number {
  // Ground slope is measured from the original physically authoritative height.
  const d=CELL_SIZE;
  const gx=(terrainHeight(x+d,z)-terrainHeight(x-d,z))/(2*d);
  const gz=(terrainHeight(x,z+d)-terrainHeight(x,z-d))/(2*d);
  return Math.atan(Math.hypot(gx,gz))*180/Math.PI;
}

/** Water depth at the selected cell, supplied by the actual catchment solver. */
export function standingDepthAt(index:number,ctx:TrafficContext):number{
  // Include temporary flood depth and running stream depth (017–020)
  // rather than only the old pooled basin surfaces.
  if(ctx.waterDepthAtCell)return ctx.waterDepthAtCell(index);
  const basin=ctx.watershed.cellBasin[index];
  if(basin<0)return 0;
  const level=ctx.surfaceLevel(basin);
  if(level===null)return 0;
  return Math.max(0,level-ctx.watershed.cells[index].height);
}

export function evaluateTraffic(
  material:SurfaceKind,saturation:number,depthM:number,
  slopeDegrees:number,rutDepthM:number,kind:TrafficKind,
):TrafficObservation {
  const spec=STRENGTH[material];
  const load=LOADS[kind];
  const wet=clamp(saturation);
  const mud=smooth(.30,.91,wet)*spec.deformability;
  // Rock may be slippery when wet, but never becomes muddy.
  const bearing=spec.dryBearing+(spec.wetBearing-spec.dryBearing)*smooth(.20,1,wet);
  const traction=clamp(spec.dryGrip+(spec.wetGrip-spec.dryGrip)*smooth(.22,1,wet)
    -clamp(rutDepthM/MAX_RUT_DEPTH_M)*.10,.05,1);
  // Higher pressure on weak soil yields progressive sinkage. Foot movement
  // is less sensitive to bearing failure than heavy wheeled vehicles.
  const stress=Math.max(0,load.pressureKPa/Math.max(1,bearing)-.60);
  const sinkFactor=1/(1+stress*(kind==='vehicle' ? 1.65 : .42));
  const slopeFactor=clamp(1-slopeDegrees/load.slopeLimitDegrees*(kind==='vehicle'?.75:.50),.08,1);
  const rutFactor=1-clamp(rutDepthM/MAX_RUT_DEPTH_M)* (kind==='vehicle'?.38:.12);
  const waterFactor=depthM>=load.waterLimitM?0:
    clamp(1-depthM/load.waterLimitM*(kind==='vehicle'?.78:.55),0,1);
  const speed=clamp(traction*sinkFactor*slopeFactor*rutFactor*waterFactor);
  const condition:TrafficCondition = speed<.18?'blocked':speed<.42?'difficult':
    speed<.72?'slow':'firm';
  return {
    material,saturation:wet,mud,bearingKPa:bearing,traction,
    slopeDegrees,waterDepthM:depthM,rutDepthM,speedFactor:speed,condition,
  };
}
export function observeCell(
  index:number,context:TrafficContext,rutDepthM:number,kind:TrafficKind,
):TrafficObservation {
  const cell=context.watershed.cells[index];
  // SurfaceKind comes from the same categorical physical soil properties
  // used by infiltration in Build 014; visual feathering cannot change it.
  const material=physicalSurfaceAt(cell.x,cell.z).kind;
  return evaluateTraffic(material,context.soilFraction(index),
    standingDepthAt(index,context),slopeAt(cell.x,cell.z),rutDepthM,kind);
}

export class GroundLoad {
  readonly rutDepths:Float32Array;
  readonly rutAngles:Float32Array;
  private revision=0;
  private recoverySinceVisualRefresh=0;

  constructor(saved?:unknown) {
    this.rutDepths=new Float32Array(GRID_CELLS*GRID_CELLS);
    this.rutAngles=new Float32Array(GRID_CELLS*GRID_CELLS);
    if(saved&&typeof saved==='object'){
      const record=saved as Partial<GroundConditionState>;
      if(Array.isArray(record.rutDepths)&&record.rutDepths.length===this.rutDepths.length){
        for(let i=0;i<this.rutDepths.length;i++){
          const v=record.rutDepths[i];
          if(typeof v==='number'&&Number.isFinite(v))this.rutDepths[i]=clamp(v,0,MAX_RUT_DEPTH_M);
        }
      }
      if(Array.isArray(record.rutAngles)&&record.rutAngles.length===this.rutAngles.length){
        for(let i=0;i<this.rutAngles.length;i++){
          const v=record.rutAngles[i];
          if(typeof v==='number'&&Number.isFinite(v))this.rutAngles[i]=v;
        }
      }
    }
  }
  getRevision():number{return this.revision;}
  observe(index:number,ctx:TrafficContext,kind:TrafficKind):TrafficObservation{
    return observeCell(index,ctx,this.rutDepths[index],kind);
  }
  /** Each explicit foot/vehicle passage applies stress only along its path. */
  pass(index:number,ctx:TrafficContext,kind:TrafficKind,headingRadians=0):number{
    const condition=this.observe(index,ctx,kind);
    const spec=STRENGTH[condition.material];
    const load=LOADS[kind];
    // Dry, firm ground is resistant; soaked weak ground readily deforms.
    const overload=clamp((load.pressureKPa/condition.bearingKPa-.48)/2.2);
    const softness=(.14+condition.mud*.86);
    const potential=kind==='vehicle'?.014:.0010;
    const add=potential*spec.deformability*softness*overload;
    if(add<=1e-8)return 0;
    const previous=this.rutDepths[index];
    const next=Math.min(MAX_RUT_DEPTH_M,previous+add);
    this.rutDepths[index]=next;
    this.rutAngles[index]=headingRadians;
    if(next>previous)this.revision++;
    return next-previous;
  }
  /**
   * Soil drying permits gradual recovery, not instant erasure. The wetter
   * the ground, the more ruts persist. Rock is unaffected.
   */
  advance(hours:number,ctx:TrafficContext):boolean{
    if(!Number.isFinite(hours)||hours<=0)return false;
    let changed=false;
    for(let i=0;i<this.rutDepths.length;i++){
      const before=this.rutDepths[i];
      if(before<=0)continue;
      const cell=ctx.watershed.cells[i];
      const material=physicalSurfaceAt(cell.x,cell.z).kind;
      const spec=STRENGTH[material];
      const dry=1-clamp(ctx.soilFraction(i));
      const recovery=.00055*spec.recovery*(.10+.90*dry)*hours;
      const after=Math.max(0,before-recovery);
      if(Math.abs(after-before)>1e-10){
        this.rutDepths[i]=after;
        changed=true;
        this.recoverySinceVisualRefresh+=before-after;
      }
    }
    // Do not rebuild track geometry for microscopic drying per render frame.
    if(this.recoverySinceVisualRefresh>.002){
      this.revision++;
      this.recoverySinceVisualRefresh=0;
    }
    return changed;
  }
  clear():void{
    this.rutDepths.fill(0);this.rutAngles.fill(0);
    this.recoverySinceVisualRefresh=0;this.revision++;
  }
  snapshot():GroundConditionState{
    return {rutDepths:Array.from(this.rutDepths),rutAngles:Array.from(this.rutAngles)};
  }
}
