import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');

test('Pages root opens the latest tactical Breach game',()=>{
  const index=read('index.html');
  assert.match(index,/<title>FIELDWORK — Tactical Breach<\/title>/);
  assert.match(index,/id="breachCanvas"/);
  assert.match(index,/id="rook"/);
  assert.match(index,/id="moss"/);
  assert.match(index,/id="play"/);
  assert.match(index,/src="\.\/src\/breach-main\.ts"/);
  assert.doesNotMatch(index,/src="\/src\/main\.ts"/,
    'the old Verdigris renderer must no longer own the Pages root');
});

test('Dedicated Breach URL remains directly accessible',()=>{
  const breach=read('breach.html');
  assert.match(breach,/src="\.\/src\/breach-main\.ts"/);
  assert.match(breach,/id="contextTools"/);
});

test('Original Verdigris is archived and included in the Pages build',()=>{
  const verdigris=read('verdigris.html');
  const vite=read('vite.config.ts');
  assert.match(verdigris,/Fieldwork — Verdigris Valley/);
  assert.match(verdigris,/src="\/src\/main\.ts"/);
  assert.match(vite,/main: 'index\.html'/);
  assert.match(vite,/verdigris: 'verdigris\.html'/);
  assert.match(vite,/breach: 'breach\.html'/);
  assert.match(vite,/breachVisualLab: 'breach-visual-lab\.html'/);
});

test('Main branch automatically deploys the Vite build to GitHub Pages',()=>{
  const workflow=read('.github/workflows/pages.yml');
  assert.match(workflow,/branches: \[main\]/);
  assert.match(workflow,/npm run build/);
  assert.match(workflow,/path: dist/);
  assert.match(workflow,/actions\/deploy-pages@v4/);
});
