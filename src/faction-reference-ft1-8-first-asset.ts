/** FT1.8E: first-asset production *draft*, not authorization to model.
 * Reviewers must verify sources, real silhouettes and complexity before FT1.9.
 */
import {buildContentCandidates} from './faction-reference-production-candidates.ts';
export const FT18_FIRST_ASSET_SCOPE={
 id:'ft1-8-g36-draft',
 candidateId:'gap:g36-family',
 gapId:'g36-family',
 state:'proposed-primary-awaiting-review',
 title:'G36-family recognizable service-rifle silhouette',
 rationale:'Existing Bundeswehr woodland and desert looks currently use unrelated AR visual proxies. One authentic family silhouette may improve both.',
 requiredVariants:['Agree on one specifically evidenced period-appropriate service variant before geometry begins'],
 deliverables:[
  'Distinct G36 receiver, carry-handle/optic profile, handguard, barrel, polymer magazine and folding-stock silhouette',
  'Game-compatible receiver/stock/grip/magazine/handguard/barrel family preset using existing weapon-render pipeline',
  'Palette calibrated against current arsenal metal and polymer materials; avoid inventing a new shading system',
  'Representative reference selection only after verifying correct configuration for each authored look',
  'Studio and live-game views with no barrel, magazine, hand, or attachment clipping regressions'
 ],
 constraints:[
  'Separate each historically distinct G36 variant; do not label a generic silhouette exact',
  'Reuse existing equipment rendering and sockets when geometrically compatible',
  'Do not modify ballistics, weapon inventory, unlocks, ammunition rules, or saves',
  'Keep unrelated AR proxies explicitly labeled until accepted replacement exists'
 ],
 visualAcceptance:[
  'Front, side, and three-quarter silhouettes recognizable at gameplay camera scale',
  'Verify carry-handle/sight, stock, fore-end and magazine forms against cited period visual references',
  'Consistent neutral material palette and scale next to completed FNC, HK and AR families',
  'Check left/right handed poses, low-ready, high-ready and short-stock for intersections'
 ],
 technicalAcceptance:[
  'Builds with TypeScript and production Vite',
  'Family preset resolves and equips without invalid assembly parts',
  'Operator Studio and gameplay render without material leaks or invalid poses',
  'Scoped weapon/faction reference regressions pass'
 ],
 blockers:[
  'Dated primary/credible image references for the specific variant',
  'Actual model silhouette and integration-cost assessment',
  'Reviewer identity, four scores, date, and explicit authorization rationale'
 ],
 outOfScope:[
  'Additional G36 variants without individual review',
  'Other new rifles, helmets, armor, inventory or faction content',
  'Historical issuance dates inferred from authored appearance snapshot years'
 ]
} as const;
export function ft18FirstAssetReadiness(){
 const candidate=buildContentCandidates().find(x=>x.id===FT18_FIRST_ASSET_SCOPE.candidateId);
 return {
  candidateExists:!!candidate,
  gapMatches:!!candidate?.gapIds.includes(FT18_FIRST_ASSET_SCOPE.gapId),
  candidateReadiness:candidate?.readiness??'missing',
  authorized:!!candidate&&candidate.readiness==='approved-for-future-work'&&
   candidate.reviewMissing.length===0,
  missingReview:candidate?.reviewMissing??['candidate missing']
 };
}
