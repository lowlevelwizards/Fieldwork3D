/** Exact gameplay authoring parity between C-R2 base and C-R3 build.
 * Required positions / identities cannot be "optimised" into new coordinates.
 */
import {readFileSync,writeFileSync} from 'node:fs';
const [oldPath,newPath,dest]=process.argv.slice(2);
const old=JSON.parse(readFileSync(oldPath,'utf8'));
const current=JSON.parse(readFileSync(newPath,'utf8'));
if(old.rows.length!==15||current.rows.length!==15)
 throw new Error('C11 mission parity corpus incomplete');
const differences=[];
for(let i=0;i<old.rows.length;i++){
 const a=old.rows[i],b=current.rows[i];
 if(JSON.stringify(a)!==JSON.stringify(b))
   differences.push({seed:a.seed,mission:a.mission,
    beforeHostiles:a.hostiles?.length,afterHostiles:b.hostiles?.length,
    beforeCivilians:a.civilians?.length,afterCivilians:b.civilians?.length,
    objectiveChanged:JSON.stringify(a.objective)!==JSON.stringify(b.objective),
    encounterChanged:JSON.stringify(a.hostiles)!==JSON.stringify(b.hostiles),
    civilChanged:JSON.stringify(a.civilians)!==JSON.stringify(b.civilians),
    errorsChanged:JSON.stringify(a.errors)!==JSON.stringify(b.errors)});
}
const report={before:old.summary,after:current.summary,differenceCount:differences.length,differences};
console.log('C11 mission parity',JSON.stringify(report));
if(dest)writeFileSync(dest,JSON.stringify(report,null,2)+'\n');
if(differences.length)process.exitCode=1;
