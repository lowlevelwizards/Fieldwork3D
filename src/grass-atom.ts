import { terrainHeight } from './terrain-model.ts';
import { surfaceAt } from './surface-materials.ts';

/**
 * A single grass patch is our first vegetation atom.
 *
 * Its permanent roots are established once in ordinary soil, rather than
 * appearing or disappearing every time the rain changes. This is NOT an
 * ecological map, biome system, concealment simulation, or vegetation roster.
 */
export const GRASS_PATCH={x:-1.65,z:.45,radius:.82} as const;
export type GrassBlade={id:number;x:number;z:number;y:number;height:number;
  width:number;angle:number;lean:number;tint:number};
const hash=(n:number)=>{
  let v=Math.imul(n+0x6d2b79f5,0x85ebca6b);
  v^=v>>>13;v=Math.imul(v,0xc2b2ae35);v^=v>>>16;
  return (v>>>0)/4294967296;
};

/** Generates one small, inspectable group of real ground-anchored blades. */
export function establishGrassPatch(count=144):GrassBlade[]{
  if(!Number.isInteger(count)||count<0||count>1000)
    throw new Error('Invalid number of grass candidates');
  const blades:GrassBlade[]=[];
  for(let i=0;i<count;i++){
    const theta=hash(i*19+2901)*Math.PI*2;
    const radial=Math.sqrt(hash(i*31+711))*GRASS_PATCH.radius;
    const x=GRASS_PATCH.x+Math.cos(theta)*radial;
    const z=GRASS_PATCH.z+Math.sin(theta)*radial;
    // A fixed patch on a dry-enough terrace. Soil classes are stable;
    // hourly water changes cannot teleport a planted blade.
    const substrate=surfaceAt(x,z).kind;
    if(substrate==='rock'||substrate==='sand')continue;
    const y=terrainHeight(x,z);
    const grad=.07;
    const slope=Math.hypot(
      terrainHeight(x+grad,z)-terrainHeight(x-grad,z),
      terrainHeight(x,z+grad)-terrainHeight(x,z-grad));
    if(slope>.125||y<-.065)continue;
    const height=(.125+hash(i*47+23)*.125)*(substrate==='organic'?1.1:1);
    blades.push({id:i,x,z,y,height,width:.020+hash(i*13+51)*.011,
      angle:theta+hash(i*37+3)*3.2,
      lean:(hash(i*43+118)-.5)*.075,
      tint:hash(i*17+76)});
  }
  return blades;
}
