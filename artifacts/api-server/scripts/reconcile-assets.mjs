import { Storage } from '@google-cloud/storage';
import { readFileSync } from 'fs';

const SIDECAR='http://127.0.0.1:1106';
const storage=new Storage({credentials:{audience:'replit',subject_token_type:'access_token',token_url:`${SIDECAR}/token`,type:'external_account',credential_source:{url:`${SIDECAR}/credential`,format:{type:'json',subject_token_field_name:'access_token'}},universe_domain:'googleapis.com'},projectId:''});
const sp=(process.env.PUBLIC_OBJECT_SEARCH_PATHS||'').split(',')[0].trim();
const parts=sp.replace(/^\/+/,'').replace(/\/+$/,'').split('/');
const BUCKET=parts[0], SP=parts.slice(1).join('/');
const bucket=storage.bucket(BUCKET);
const RAW='https://raw.githubusercontent.com/ales27pm/worldDOMINATION_2026/main/web/public/risk/';

const ct=(n)=> n.endsWith('.mp3')?'audio/mpeg': n.endsWith('.png')?'image/png': n.endsWith('.webp')?'image/webp': n.endsWith('.svg')?'image/svg+xml':'application/octet-stream';

// Current bucket state
const [files]=await bucket.getFiles({});
const names=new Set(files.map(f=>f.name));
const at=(rel)=>`${SP}/${rel}`;

async function put(rel, buf){
  await bucket.file(at(rel)).save(buf,{contentType:ct(rel),resumable:false,metadata:{cacheControl:'public, max-age=3600'}});
  console.log('uploaded', rel, buf.length);
}
async function fetchBuf(url){
  const r=await fetch(url);
  if(!r.ok) throw new Error(`fetch ${url} -> ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

// 1) Repo-sourced: world-map + full sfx + full dice sets
const tree=JSON.parse(readFileSync('/tmp/upstream/tree.json','utf8'));
const repo=tree.tree.map(e=>e.path);
const wanted=repo.filter(p=>/^web\/public\/risk\/(sfx|dice)\//.test(p)).map(p=>p.replace('web/public/risk/',''));
wanted.push('world-map.png');
let up=0;
for(const rel of wanted){
  const key=at('public/risk/'+rel);
  if(names.has(key)) continue;
  await put('public/risk/'+rel, await fetchBuf(RAW+rel)); up++;
}
console.log('repo sync uploads:', up, 'of wanted', wanted.length);

// 2) CDN art -> public/risk/art/
const artSrc=readFileSync('/tmp/upstream/weblib/art.ts','utf8');
const urls={}; const re=/(\w+):\s*\n?\s*"(https:[^"]+)"/g; let m;
while((m=re.exec(artSrc))) urls[m[1]]=m[2];
const nameMap={seaParchment:'sea-parchment.png',compassRose:'compass-rose.png',ship:'ship.png',seaSerpent:'sea-serpent.png',woodTable:'wood-table.png',warCrest:'war-crest.png',laurelWreath:'laurel-wreath.png',heroPainting:'hero-painting.png',infantry:'piece-infantry.png',cavalry:'piece-cavalry.png',artillery:'piece-artillery.png'};
for(const [key,fname] of Object.entries(nameMap)){
  if(!urls[key]) { console.error('MISSING URL for', key); process.exit(1); }
  const rel='public/risk/art/'+fname;
  if(names.has(at(rel))) continue;
  await put(rel, await fetchBuf(urls[key]));
}

// 3) Delete junk: <SP>/risk/**, <SP>/map/**, <SP>/pieces/**, junk files in dice/
const junkPrefixes=[`${SP}/risk/`,`${SP}/map/`,`${SP}/pieces/`];
const diceJunk=['bun.lock','components.json','eslint.config.js','index.html','package.json','postcss.config.js','tailwind.config.ts','tsconfig.app.json','tsconfig.json','tsconfig.node.json','vite.config.ts','vitest.browser.config.ts','vitest.config.ts'].map(n=>at('public/risk/dice/'+n));
let del=0;
for(const f of files){
  if(junkPrefixes.some(p=>f.name.startsWith(p)) || diceJunk.includes(f.name)){ await f.delete(); del++; }
}
console.log('deleted junk objects:', del);

// 4) Final verify
const [after]=await bucket.getFiles({});
const rel=after.map(f=>f.name.startsWith(SP+'/')?f.name.slice(SP.length+1):f.name).sort();
const count=(p)=>rel.filter(r=>r.startsWith(p)).length;
console.log('FINAL: sfx',count('public/risk/sfx/'),'dice',count('public/risk/dice/'),'fireworks',count('public/risk/fireworks/'),'battle-views',count('public/battle-views/'),'art',count('public/risk/art/'),'world-map',rel.includes('public/risk/world-map.png'),'total',rel.length);
const diceNames=rel.filter(r=>r.startsWith('public/risk/dice/')).map(r=>r.split('/').pop()).join(' ');
console.log('dice:',diceNames);
const sfxNames=rel.filter(r=>r.startsWith('public/risk/sfx/')).map(r=>r.split('/').pop()).join(' ');
console.log('sfx:',sfxNames);
