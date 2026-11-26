/** EB1: shared group identity data. Generation, loadout and disclosure read
 * this same catalog; individual role and competence never imply equipment. */
export const AI_COMPETENCE=['untrained','experienced','trained','specialist'] as const;
export type AiCompetence=typeof AI_COMPETENCE[number];
export type AiGroupKind='opportunists'|'organised-criminals'|'armed-irregulars'|'security'|'regular-force'|'specialists'|'fugitives';
export type AiMotivation='survive'|'protect-assignment'|'support-group'|'avoid-capture';
export type EncounterDoctrine='irregular'|'security'|'organised';
export type GroupProfile={label:string;competenceCutoffs:readonly [number,number,number];motivation:AiMotivation;doctrine:EncounterDoctrine;loyalty:number};
export const AI_GROUP_PROFILES:Readonly<Record<AiGroupKind,GroupProfile>>={
 opportunists:{label:'Opportunists',competenceCutoffs:[.65,.94,.998],motivation:'survive',doctrine:'irregular',loyalty:.35},
 fugitives:{label:'Fugitives',competenceCutoffs:[.55,.90,.99],motivation:'avoid-capture',doctrine:'irregular',loyalty:.35},
 'organised-criminals':{label:'Organized criminals',competenceCutoffs:[.08,.39,.94],motivation:'support-group',doctrine:'organised',loyalty:.68},
 'armed-irregulars':{label:'Armed irregulars',competenceCutoffs:[.12,.55,.96],motivation:'support-group',doctrine:'organised',loyalty:.68},
 security:{label:'Security personnel',competenceCutoffs:[.15,.65,.98],motivation:'protect-assignment',doctrine:'security',loyalty:.53},
 'regular-force':{label:'Regular forces',competenceCutoffs:[.03,.23,.94],motivation:'support-group',doctrine:'organised',loyalty:.68},
 specialists:{label:'Specialists',competenceCutoffs:[.01,.10,.60],motivation:'support-group',doctrine:'organised',loyalty:.68}
};
export const AI_GROUP_KINDS=Object.keys(AI_GROUP_PROFILES) as AiGroupKind[];
