import {mkdir,copyFile,cp,readFile,writeFile,rm} from 'node:fs/promises';
import {build} from 'esbuild';
const dir='android/app/src/main/assets/www';await rm(dir,{recursive:true,force:true});await mkdir(dir,{recursive:true});
for(const f of ['index.html','styles.css','journey.css','world.css','companion.css','store-data.json','nintendo-world.json','catalog.json','library-seed.json'])await copyFile(f,`${dir}/${f}`);
await cp('assets',`${dir}/assets`,{recursive:true});
const app=await readFile('app.js','utf8');const imports=app.match(/^import .+;$/gm)||[];
const body=app.replace(/^import .+;\n/gm,'');
// Android's factory WebView may predate optional chaining and top-level await.
// Bundle to a classic script; the async startup retains the same application flow.
await build({stdin:{contents:imports.join('\n')+'\nasync function launch(){\n'+body+'\n}\nlaunch().catch(function(){document.getElementById("main").textContent="تعذّر بدء التطبيق. حدّث Android System WebView ثم أعد فتحه.";});',resolveDir:process.cwd(),sourcefile:'app.js',loader:'js'},bundle:true,format:'iife',target:['chrome70'],outfile:`${dir}/app-bundle.js`,banner:{js:'if(typeof globalThis==="undefined")window.globalThis=window;if(!Object.fromEntries)Object.fromEntries=function(entries){var o={};for(var p of entries)o[p[0]]=p[1];return o;};if(!Object.hasOwn)Object.hasOwn=function(o,k){return Object.prototype.hasOwnProperty.call(o,k);};if(!globalThis.structuredClone)globalThis.structuredClone=function(v){return JSON.parse(JSON.stringify(v));};'},legalComments:'inline'});
let html=await readFile(`${dir}/index.html`,'utf8');html=html.replace('<link rel="manifest" href="./manifest.webmanifest">','').replace('<script type="module" src="./app.js"></script>','<script src="./app-bundle.js"></script>').replace("connect-src 'self' https: http://127.0.0.1:8787 http://localhost:8787;","connect-src 'self'; frame-src 'none'; frame-ancestors 'none';");
html=html.replace("connect-src 'self'; frame-src","connect-src 'self' https://yasseralq90coder.github.io; frame-src");
await writeFile(`${dir}/index.html`,html);
console.log('Android assets bundled for WebView Chrome 70+, without server code or secrets.');
