import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, cpSync, existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

rmSync("dist", { recursive: true, force: true });
mkdirSync("dist", { recursive: true });
execFileSync("tar", ["-xzf", "site.tar.gz", "-C", "dist"], {
  stdio: "inherit"
});

// Keep large artwork in the original archive and review application updates as source.
if (existsSync("site-overrides")) cpSync("site-overrides", "dist", {recursive:true});
function patchHtml(dir) {
  for (const entry of readdirSync(dir, {withFileTypes:true})) {
    const file=join(dir,entry.name);
    if(entry.isDirectory()) {patchHtml(file);continue;}
    if(!entry.name.endsWith('.html'))continue;
    let html=readFileSync(file,'utf8');
    html=html.replace(/<script src="\/prism-paper-feed-v2\.js"><\/script>/g,'');
    html=html.replace(/<script src="\/pushin-paper-app-v1\.js" defer><\/script>/g,
      '<link rel="stylesheet" href="/pushin-mainnet.css"/><script src="/pushin-mainnet-wallet.js" defer></script><script src="/pushin-simulator.js" defer></script><script src="/pushin-mainnet-app.js" defer></script>');
    html=html.replace(/PrismPerp|PRISMPERP/g,'PUSHIN');
    writeFileSync(file,html);
  }
}
patchHtml('dist');
