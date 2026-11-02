// Stamp every deployed HTML entrypoint and publish a tiny release identifier.
// GitHub Pages can serve stale HTML even while Vite's hashed assets have updated.
// An inline guard survives old asset failures and uses a versioned navigation URL.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function stampHtml(html, buildId) {
  if (!html.includes('</head>')) throw new Error('Missing HTML head for release stamp');
  const bootstrap = [
    '<meta name="fieldwork-build" content="' + buildId + '">',
    '<script>',
    '(function () {',
    '  const loadedBuild = ' + JSON.stringify(buildId) + ';',
    '  let checking = false;',
    '  function checkForNewBuild() {',
    '    if (checking || document.visibilityState === "hidden") return;',
    '    checking = true;',
    '    const endpoint = new URL("./fieldwork-build.json", document.baseURI);',
    '    endpoint.searchParams.set("_", String(Date.now()));',
    '    fetch(endpoint.href, { cache: "no-store" })',
    '      .then(response => response.ok ? response.json() : null)',
    '      .then(latest => {',
    '        if (!latest || typeof latest.id !== "string" || !latest.id || latest.id === loadedBuild) return;',
    '        const target = new URL(window.location.href);',
    '        if (target.searchParams.get("build") === latest.id) return;',
    '        target.searchParams.set("build", latest.id);',
    '        window.location.replace(target.href);',
    '      })',
    '      .catch(() => { /* Offline / not yet deployed: keep the current build running. */ })',
    '      .finally(() => { checking = false; });',
    '  }',
    '  function renderBuildLabel() {',
    '    if (document.getElementById("fieldwork-build-label")) return;',
    '    const label = document.createElement("small");',
    '    label.id = "fieldwork-build-label";',
    '    label.textContent = "BUILD " + loadedBuild.slice(0, 7);',
    '    label.title = "Deployed Pages release: " + loadedBuild;',
    '    label.style.cssText = "font:9px/1.2 monospace;color:#9bbcb1;letter-spacing:.06em;opacity:.9;pointer-events:none";',
    '    const mode = document.querySelector(".mode");',
    '    if (mode) mode.appendChild(label);',
    '    else {',
    '      label.style.cssText += ";position:fixed;right:8px;bottom:8px;z-index:20";',
    '      document.body.appendChild(label);',
    '    }',
    '  }',
    '  if (document.readyState === "loading") {',
    '    document.addEventListener("DOMContentLoaded", renderBuildLabel, { once: true });',
    '  } else renderBuildLabel();',
    '  checkForNewBuild();',
    '  window.setInterval(checkForNewBuild, 60000);',
    '  window.addEventListener("pageshow", checkForNewBuild);',
    '  document.addEventListener("visibilitychange", () => {',
    '    if (document.visibilityState === "visible") checkForNewBuild();',
    '  });',
    '})();',
    '</script>',
  ].join('\n');
  return html.replace('</head>', bootstrap + '\n</head>');
}

export function stampDist(distPath, buildId) {
  let stamped = 0;
  for (const name of readdirSync(distPath)) {
    if (!name.endsWith('.html')) continue;
    const file = join(distPath, name);
    writeFileSync(file, stampHtml(readFileSync(file, 'utf8'), buildId));
    stamped++;
  }
  if (!stamped) throw new Error('No HTML entrypoints found in dist');
  writeFileSync(join(distPath, 'fieldwork-build.json'), JSON.stringify({ id: buildId }) + '\n');
  return stamped;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  // Unique per deployment even when the same Git commit is rebuilt.
  const buildId = (process.env.GITHUB_SHA?.slice(0, 12) || 'local') + '-' + Date.now().toString(36);
  console.log('Stamped ' + stampDist(resolve('dist'), buildId) + ' Pages entrypoints: ' + buildId);
}
