import { Storage } from '@google-cloud/storage';
import { writeFileSync } from 'fs';
const SIDECAR='http://127.0.0.1:1106';
const storage=new Storage({credentials:{audience:'replit',subject_token_type:'access_token',token_url:`${SIDECAR}/token`,type:'external_account',credential_source:{url:`${SIDECAR}/credential`,format:{type:'json',subject_token_field_name:'access_token'}},universe_domain:'googleapis.com'},projectId:''});
const sp=(process.env.PUBLIC_OBJECT_SEARCH_PATHS||'').split(',')[0].trim();
const bucket=sp.replace(/^\/+/,'').split('/')[0];
const S=sp.replace(/^\/+/,'').split('/').slice(1).join('/'); // search-path prefix inside bucket
const [files]=await storage.bucket(bucket).getFiles({});     // ENTIRE bucket
const names=files.map(f=>f.name).sort();
writeFileSync('/tmp/bucket-objects.txt', names.join('\n'));
// Print structure with S redacted as <SP>
const red=names.map(n=> S && n.startsWith(S+'/') ? '<SP>/'+n.slice(S.length+1) : n);
const counts={};
for(const n of red){const seg=n.split('/');const k=seg.slice(0,Math.min(3,seg.length-1)).join('/')||'(root)';counts[k]=(counts[k]||0)+1;}
for(const k of Object.keys(counts).sort())console.log(counts[k].toString().padStart(4),k);
console.log('TOTAL',names.length,'| SP prefix is',S? 'non-empty (redacted)':'EMPTY');
writeFileSync('/tmp/bucket-redacted.txt', red.join('\n'));
