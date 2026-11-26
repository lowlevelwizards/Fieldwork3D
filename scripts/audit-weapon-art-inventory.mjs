/** WA0.1 read-only source inventory. Run with Node 22:
 * node --experimental-strip-types scripts/audit-weapon-art-inventory.mjs
 * This is catalog coverage, not visual or measured render evidence.
 */
import {mkdirSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {ARSENAL_REFERENCES,ARSENAL_PLATFORMS,arsenalCatalogIssues} from '../src/arsenal/catalog.ts';
import {FAMILY_PARTS,FAMILY_PRESETS} from '../src/equipment-weapon-families.ts';
import {WEAPON_ATTACHMENTS} from '../src/equipment-weapon-assemblies.ts';
import {SIDEARM_PREVIEW_REFERENCES} from '../src/weapons/geometry/sidearm-preview.ts';
import {SECONDARY_CAPACITY} from '../src/secondary-equipment.ts';
import {VERIFIED_RIGID_FACTORY_IDS} from '../src/weapons/geometry/validated-factory-rigid-compile.ts';

export function collectWeaponArtInventory(){
 const issues=arsenalCatalogIssues();
 if(issues.length)throw Error(issues.join('; '));
 const primary=ARSENAL_REFERENCES.map(ref=>({
  id:ref.id,name:ref.name,platform:ref.platformId,family:ref.legacy.family,
  status:'primary-reference',parts:{...ref.legacy.parts},
  verifiedRigidFactory:VERIFIED_RIGID_FACTORY_IDS.includes(ref.id)
 }));
 const sidearms=SIDEARM_PREVIEW_REFERENCES.map(ref=>({
  id:ref.id,name:ref.name,platform:ref.family,family:ref.family,
  status:Object.hasOwn(SECONDARY_CAPACITY,ref.id)?'issued-sidearm-appearance':'preview-only',
  parts:null,verifiedRigidFactory:false
 }));
 const fallback={id:'legacy-shotgun',name:'Legacy shotgun fallback',
  platform:'legacy',family:'legacy',status:'fallback',parts:null,verifiedRigidFactory:false};
 const references=[...primary,...sidearms,fallback];
 if(new Set(references.map(r=>r.id)).size!==references.length)
  throw Error('Duplicate WA reference ID');
 if(primary.length!==FAMILY_PRESETS.length)
  throw Error('Incomplete primary reference coverage');
 if(Object.keys(SECONDARY_CAPACITY).some(id=>!sidearms.some(r=>r.id===id&&r.status==='issued-sidearm-appearance')))
  throw Error('Issued secondary has no appearance reference');
 const used=new Set(primary.flatMap(r=>Object.values(r.parts)));
 const parts=Object.values(FAMILY_PARTS).map(part=>({
  id:part.id,name:part.name,family:part.family,slot:part.slot,
  appearsInFactory:used.has(part.id)
 })).sort((a,b)=>a.id.localeCompare(b.id));
 const attachments=Object.entries(WEAPON_ATTACHMENTS).map(([id,part])=>({
  id,name:part.name,slot:part.slot
 })).sort((a,b)=>a.id.localeCompare(b.id));
 return {schema:'fieldwork-wa0-source-inventory',version:1,
  evidence:'source catalogs only; no visual, compatibility, or performance approval',
  totals:{primary:primary.length,sidearms:sidearms.length,
   authoredReferences:primary.length+sidearms.length,fallback:1,
   issuedSidearms:sidearms.filter(r=>r.status==='issued-sidearm-appearance').length,
   previewSidearms:sidearms.filter(r=>r.status==='preview-only').length,
   primaryPlatforms:ARSENAL_PLATFORMS.length,parts:parts.length,
   partsOutsideFactory:parts.filter(p=>!p.appearsInFactory).length,
   attachments:attachments.length},
  byPrimaryPlatform:Object.fromEntries(ARSENAL_PLATFORMS.map(p=>[
   p.id,primary.filter(r=>r.platform===p.id).length])),
  references,parts,attachments};
}
function main(){
 const report=collectWeaponArtInventory();
 const output=process.argv[2]??'reports/wa0-source-inventory.json';
 mkdirSync(dirname(output),{recursive:true});
 writeFileSync(output,JSON.stringify(report,null,2)+'\n');
 console.log('WA0 source census:',JSON.stringify(report.totals),output);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main();
