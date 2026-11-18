import fs from 'node:fs';
import {verifyD330Mainline} from './lib/d3-30-physical-gate.mjs';
const filename=process.argv[2];
if(!filename)throw Error('Expected actual 11-site audit JSON path');
const result=verifyD330Mainline(JSON.parse(fs.readFileSync(filename,'utf8')));
console.log('D3.30 physical release truth',JSON.stringify(result,null,2));
if(!result.ok)throw Error('D3.30 mainline physical gate: '+result.errors.join('; '));
