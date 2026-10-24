import { CELL_AREA, CELL_SIZE } from './terrain-model.ts';

/**
 * A shallow trapezoidal stream bed, not a painted line. Moving water fills
 * its section until bankfull, then the additional conserved flood volume
 * occupies the adjacent floodplain area. Distances are metres, litres real.
 */
export type HydraulicSection={
  bottomWidthM:number;
  bankHeightM:number;
  bankWidthM:number;
  sideSlope:number;
  channel:boolean;
};
const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x));

export function hydraulicSection(contributingCells:number,channel:boolean):HydraulicSection {
  if(!channel)return {
    bottomWidthM:CELL_SIZE,bankHeightM:.012,
    bankWidthM:CELL_SIZE,sideSlope:0,channel:false,
  };
  const catchment=Math.sqrt(Math.max(1,contributingCells));
  const bottomWidthM=clamp(.070+.009*catchment,.075,.205);
  const bankHeightM=clamp(.057+.0012*catchment,.058,.082);
  const sideSlope=1.25;
  return {bottomWidthM,bankHeightM,
    bankWidthM:bottomWidthM+2*sideSlope*bankHeightM,
    sideSlope,channel:true};
}

export function channelVolumeAtDepth(section:HydraulicSection,depth:number):number{
  if(!Number.isFinite(depth)||depth<=0)return 0;
  const d=Math.min(depth,section.bankHeightM);
  if(!section.channel)return d*CELL_AREA*1000;
  return CELL_SIZE*1000*(section.bottomWidthM*d+section.sideSlope*d*d);
}

export function channelCapacity(section:HydraulicSection):number{
  return channelVolumeAtDepth(section,section.bankHeightM);
}

export function channelDepthForLitres(section:HydraulicSection,litres:number):number{
  if(!Number.isFinite(litres)||litres<=0)return 0;
  const cap=channelCapacity(section);
  if(litres>=cap)return section.bankHeightM;
  if(!section.channel)return litres/(CELL_AREA*1000);
  // Invert the exact trapezoidal section: volume = length*(b*h+s*h*h).
  const area=litres/(CELL_SIZE*1000);
  const b=section.bottomWidthM;
  return (-b+Math.sqrt(b*b+4*section.sideSlope*area))/
    (2*section.sideSlope);
}

/**
 * Total local mobile level, including actual overbank storage. The second
 * reservoir starts at bankfull rather than becoming a separate blue film
 * painted through the river. The surrounding floodplain contributes area.
 */
export function hydraulicStage(
  section:HydraulicSection,channelLitres:number,floodLitres:number,
):number {
  if(!section.channel){
    return (Math.max(0,channelLitres)+Math.max(0,floodLitres))/
      (CELL_AREA*1000);
  }
  const contained=Math.min(channelCapacity(section),Math.max(0,channelLitres));
  const excess=Math.max(0,channelLitres-channelCapacity(section))+
    Math.max(0,floodLitres);
  return channelDepthForLitres(section,contained)+excess/(CELL_AREA*1000);
}

export function channelWettedWidth(section:HydraulicSection,stage:number):number {
  if(stage<=0)return 0;
  if(!section.channel)return CELL_SIZE;
  const inBank=section.bottomWidthM+
    2*section.sideSlope*Math.min(stage,section.bankHeightM);
  // Above bankfull, water widens across the valley floor. The *actual*
  // terrain height later clips this envelope; it is never a guaranteed wet
  // polygon just because the river is nearby.
  const overbank=Math.max(0,stage-section.bankHeightM);
  return Math.min(CELL_SIZE*3,inBank+Math.min(.95,overbank*9));
}
