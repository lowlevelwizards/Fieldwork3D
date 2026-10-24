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
