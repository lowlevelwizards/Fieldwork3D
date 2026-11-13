import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('A3.9 physicality inspector reports real committed height and renders that same pose',()=>{
 const probe=readFileSync(new URL('../src/a3-physicality-probe.ts',import.meta.url),'utf8');
 const lab=readFileSync(new URL('../src/a3-physicality-lab-main.ts',import.meta.url),'utf8');
 const html=readFileSync(new URL('../a3-physicality-lab.html',import.meta.url),'utf8');
 assert.match(probe,/coverStanceDrop:round\(shooter\.coverStanceDrop\?\?0\)/);
 assert.match(probe,/effectiveAimHeight\(target\)/);
 assert.match(lab,/coverStanceDrop:actor\.coverStanceDrop\?\?0/);
 assert.match(lab,/id=\\"coverStance\\"|el<HTMLElement>\('coverStance'\)/);
 assert.match(html,/id="coverStance"/);
});
