import {mkdir,copyFile,cp,readFile,writeFile} from 'node:fs/promises';
const dir='android/app/src/main/assets/www';await mkdir(dir,{recursive:true});
for(const f of ['index.html','app.js','core.js','nintendo-sync.js','styles.css','catalog.json','native-android.js'])await copyFile(f,`${dir}/${f}`);
await cp('assets',`${dir}/assets`,{recursive:true});
// APK assets are bundled, with no remote code, localhost bridge, or service worker.
let html=await readFile(`${dir}/index.html`,'utf8');html=html.replace('<link rel="manifest" href="./manifest.webmanifest">','').replace("connect-src 'self' https: http://127.0.0.1:8787 http://localhost:8787;","connect-src 'self'; frame-src 'none'; frame-ancestors 'none';");
await writeFile(`${dir}/index.html`,html);
console.log('Android web assets packaged; server code and secrets excluded.');
