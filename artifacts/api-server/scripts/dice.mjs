import { Storage } from '@google-cloud/storage';
const SIDECAR='http://127.0.0.1:1106';
const storage=new Storage({credentials:{audience:'replit',subject_token_type:'access_token',token_url:`${SIDECAR}/token`,type:'external_account',credential_source:{url:`${SIDECAR}/credential`,format:{type:'json',subject_token_field_name:'access_token'}},universe_domain:'googleapis.com'},projectId:''});
const sp=(process.env.PUBLIC_OBJECT_SEARCH_PATHS||'').split(',')[0].trim();
const bucket=sp.replace(/^\/+/,'').replace(/\/+$/,'').split('/')[0];
const [files]=await storage.bucket(bucket).getFiles({prefix:'public/risk/dice/'});
console.log(files.map(f=>f.name.split('/').pop()).sort().join(' '));
