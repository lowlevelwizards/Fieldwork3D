/** Data-driven future proficiency hooks. All default to the same neutral
 * baseline until training/progression is a real gameplay system. */
export type ShootingSkills={
  pointShooting:number;longRange:number;precision:number;
  recoilControl:number;composure:number;handling:number;
};
export const DEFAULT_SKILLS:ShootingSkills=Object.freeze({
  pointShooting:.5,longRange:.5,precision:.5,
  recoilControl:.5,composure:.5,handling:.5
});
export const skillMultiplier=(skill:number,strength=.3)=>
  1+(Math.min(1,Math.max(0,skill))-.5)*strength;
