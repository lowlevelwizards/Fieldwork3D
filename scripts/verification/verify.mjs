import {spawnSync} from 'node:child_process';
for (const script of ['check:toolchain','test:core','build','check:artifact','test:browser']) {
  const run = spawnSync('npm',['run',script],{stdio:'inherit'});
  if (run.status !== 0) process.exit(run.status ?? 1);
}
