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

/** Experience modifies existing assessment/commitment, never hit points,
 * accuracy, visual reach, geometry or physical motor permissions. */
export const AI_EXPERIENCE:Readonly<Record<AiCompetence,{reaction:number;orientation:number;inspection:number;assignment:number}>>={
 untrained:{reaction:1.40,orientation:1.45,inspection:.80,assignment:.80},
 experienced:{reaction:1.08,orientation:1.12,inspection:1,assignment:.95},
 trained:{reaction:.88,orientation:.90,inspection:1.18,assignment:1.08},
 specialist:{reaction:.72,orientation:.78,inspection:1.25,assignment:1.20}
};
