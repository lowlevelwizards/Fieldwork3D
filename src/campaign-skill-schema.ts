/** Shared career skill vocabulary.
 * A pure leaf: campaign state and progression may both read this exact key
 * list without creating a runtime import loop or changing save fields.
 */
import type {ShootingSkills} from './breach-skills.ts';
export type SkillName=keyof ShootingSkills;
export const SKILL_NAMES:SkillName[]=[
 'pointShooting','longRange','precision','recoilControl','composure','handling'
];
