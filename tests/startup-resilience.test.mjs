import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const read=file=>readFileSync(new URL(file,root),'utf8');
const html=read('index.html'),entry=read('src/breach-main.ts');
test('startup monitor installs before Vite module',()=>{
 assert.ok(html.indexOf('fieldwork-startup-issue')>0);
 assert.ok(html.indexOf('fieldwork-startup-issue')<
   html.indexOf('<script type="module" src="./src/breach-main.ts"></script>'));
 assert.match(html,/window\.addEventListener\('error',/);
 assert.match(html,/window\.addEventListener\('unhandledrejection',/);
 assert.match(html,/LOAD LATEST BUILD/);
 assert.match(html,/fieldwork-build\.json/);
});
test('startup readiness follows runtime start',()=>{
 assert.ok(entry.lastIndexOf("dataset.fieldworkAppReady='1'")>
   entry.lastIndexOf('runtimeLoop.start();'));
 assert.match(entry,/window\.dispatchEvent\(new Event\('fieldwork:boot-ready'\)\)/);
});
test('scene readiness follows successfully rendering a frame',()=>{
 const part=entry.slice(entry.indexOf('function render(dt=0):void{'),
  entry.indexOf('function rejectAt('));
 assert.ok(part.indexOf("dataset.fieldworkFirstSceneFrame='1'")>
   part.indexOf('renderBreachTacticalWorldFrame('));
});
