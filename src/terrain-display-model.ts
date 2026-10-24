/**
 * Build 015.2 — display-only smoothing. Soil water stored in hydrology is
 * never changed; this is a low-pass filter for the continuous terrain color.
 *
 * Both cell-centre and shared-corner vertices bilinearly sample the SAME
 * filtered field. This avoids triangular, disconnected moisture patches.
 */
import { CELL_SIZE, WORLD_HALF } from './terrain-model.ts';

const WEIGHTS = [1,4,6,4,1] as const;
const clamp = (v:number, a:number,b:number) => Math.max(a,Math.min(b,v));

export function smoothDisplayMoisture(source:ArrayLike<number>, n:number):Float32Array {
  if (!Number.isInteger(n) || n<=0 || source.length!==n*n) {
    throw new Error('Expected square moisture cell field');
  }
  const horizontal=new Float32Array(n*n);
  const filtered=new Float32Array(n*n);
  // Separable 5x5 [1,4,6,4,1] Gaussian: much cheaper than 25 samples
  // per cell and normalized at every boundary by clamped sampling.
  for(let row=0;row<n;row++) for(let col=0;col<n;col++){
    let value=0;
    for(let offset=-2;offset<=2;offset++){
      const c=clamp(col+offset,0,n-1);
      value+=source[row*n+c]*WEIGHTS[offset+2];
    }
    horizontal[row*n+col]=value/16;
  }
  for(let row=0;row<n;row++) for(let col=0;col<n;col++){
    let value=0;
    for(let offset=-2;offset<=2;offset++){
      const r=clamp(row+offset,0,n-1);
      value+=horizontal[r*n+col]*WEIGHTS[offset+2];
    }
    filtered[row*n+col]=clamp(value/16,0,1);
  }
  return filtered;
}

export function sampleDisplayMoisture(
  field:ArrayLike<number>,x:number,z:number,n:number,
):number {
  if (field.length!==n*n)throw new Error('Moisture field size mismatch');
  // Terrain grid boundaries are at integer cells, while field samples live
  // at the centre of those cells: half-cell shift is required here.
  const u=clamp((x+WORLD_HALF)/CELL_SIZE-.5,0,n-1);
  const v=clamp((z+WORLD_HALF)/CELL_SIZE-.5,0,n-1);
  const c0=Math.floor(u),r0=Math.floor(v);
  const c1=Math.min(n-1,c0+1),r1=Math.min(n-1,r0+1);
  const tx=u-c0,tz=v-r0;
  const a=field[r0*n+c0]*(1-tx)+field[r0*n+c1]*tx;
  const b=field[r1*n+c0]*(1-tx)+field[r1*n+c1]*tx;
  return a*(1-tz)+b*tz;
}

/** Brightness contribution from broad, shallow concavity, not a dark stain. */
export function reliefBrightness(local:number,neighborAverage:number):number {
  return clamp(1-(neighborAverage-local)*.45,.96,1.01);
}

/** Wet ground stays visibly damp without dark, high-contrast spot halos. */
export function displayWetnessWeight(fraction:number):number {
  return Math.pow(clamp(fraction,0,1),.85)*.75;
}

/** Multiple broad, visual-only passes merge like wetness into a continuous
 * field. The physical cell stores remain untouched and at 32×32 resolution.
 */
export function smoothDisplayField(
  source:ArrayLike<number>,n:number,passes=2,
):Float32Array {
  if(!Number.isInteger(passes)||passes<0||passes>5)
    throw new Error('Invalid display smoothing pass count');
  if(source.length!==n*n||!Number.isInteger(n)||n<=0)
    throw new Error('Expected square display field');
  let field:Float32Array=Float32Array.from(source);
  for(let p=0;p<passes;p++)field=smoothDisplayMoisture(field,n);
  return field;
}

/**
 * Bilateral-style smoothing with the authoritative elevation as a guide.
 * Broad same-elevation floodplain patches merge; water/soil coloration is
 * not blurred across sharp gully walls or ridgelines. Only display values
 * are filtered, never terrain heights, basin membership, or litres.
 */
export function smoothDisplayFieldPreserveEdges(
  source:ArrayLike<number>,heights:ArrayLike<number>,n:number,
  passes=2,heightSigma=.075,
):Float32Array {
  if(source.length!==n*n||heights.length!==n*n||n<=0||
     !Number.isInteger(n)||passes<0||!Number.isInteger(passes)||passes>5||
     !Number.isFinite(heightSigma)||heightSigma<=0)
    throw new Error('Invalid edge-aware display field');
  let field=Float32Array.from(source);
  for(let pass=0;pass<passes;pass++){
    const out=new Float32Array(n*n);
    for(let r=0;r<n;r++)for(let c=0;c<n;c++){
      const center=r*n+c;
      let value=0,weight=0;
      for(let dr=-2;dr<=2;dr++)for(let dc=-2;dc<=2;dc++){
        const rr=clamp(r+dr,0,n-1),cc=clamp(c+dc,0,n-1);
        const other=rr*n+cc;
        const difference=(heights[other]-heights[center])/heightSigma;
        const guideWeight=Math.exp(-.5*difference*difference);
        const w=WEIGHTS[dr+2]*WEIGHTS[dc+2]*guideWeight;
        value+=field[other]*w;
        weight+=w;
      }
      out[center]=weight>0?Math.max(0,value/weight):Math.max(0,field[center]);
    }
    field=out;
  }
  return field;
}

/** A flood sheen should follow measured storage but share a single soft
 * visual surface, resisting uphill diffusion across steep landform edges.
 */
export function floodDisplayDepth(
  physicalDepth:ArrayLike<number>,cellElevations:ArrayLike<number>,n:number,
):Float32Array {
  return smoothDisplayFieldPreserveEdges(physicalDepth,cellElevations,n,2,.065);
}

/** Combine three actual ground signals without feeding them back into
 * hydrology: soil retention, surface runoff, and overbank accumulation.
 * Dry valleys remain dry; nearby physically damp ground looks continuous.
 */
export function composeDisplayWetness(
  soil:ArrayLike<number>,surfaceDepth:ArrayLike<number>,
  floodDepth:ArrayLike<number>,heights:ArrayLike<number>,n:number,
):Float32Array {
  if(soil.length!==n*n||surfaceDepth.length!==n*n||floodDepth.length!==n*n)
    throw new Error('Wetness fields must share the same grid');
  const earth=smoothDisplayField(soil,n,2);
  const moving=Float32Array.from(surfaceDepth,d=>clamp(d/.040,0,1));
  const spill=Float32Array.from(floodDepth,d=>clamp(d/.030,0,1));
  const nearbyRunoff=smoothDisplayFieldPreserveEdges(moving,heights,n,2,.08);
  const nearbyFlood=smoothDisplayFieldPreserveEdges(spill,heights,n,2,.065);
  const composite=new Float32Array(n*n);
  for(let i=0;i<composite.length;i++){
    composite[i]=clamp(Math.max(earth[i],
      nearbyFlood[i]*.82,nearbyRunoff[i]*.54),0,1);
  }
  return smoothDisplayFieldPreserveEdges(composite,heights,n,1,.095);
}
