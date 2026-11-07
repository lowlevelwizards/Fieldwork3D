import {defineConfig} from '@playwright/test';
export default defineConfig({
  testDir:'./tests/browser',testMatch:'**/*.spec.mjs',
  fullyParallel:false,workers:1,retries:0,timeout:120000,
  expect:{timeout:15000},
  reporter:[['list'],['html',{outputFolder:'playwright-report',open:'never'}],['junit',{outputFile:'reports/browser/results.xml'}]],
  outputDir:'test-results',
  use:{baseURL:'http://127.0.0.1:4317',viewport:{width:390,height:844},
    deviceScaleFactor:1,isMobile:true,hasTouch:true,actionTimeout:15000,navigationTimeout:30000,
    trace:'retain-on-failure',screenshot:'only-on-failure',
    launchOptions:{args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}},
  webServer:{command:'node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4317 --strictPort',
    url:'http://127.0.0.1:4317',reuseExistingServer:false,timeout:30000},
});
