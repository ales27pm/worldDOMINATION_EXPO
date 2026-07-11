const sp = (process.env.PUBLIC_OBJECT_SEARCH_PATHS||'');
const paths = sp.split(',').map(p=>p.trim()).filter(Boolean);
console.log('numPaths:', paths.length);
paths.forEach((p,i)=>{
  console.log(`path${i}: startsWithSlash=${p.startsWith('/')} endsWithSlash=${p.endsWith('/')} doubleSlashInside=${/\/\//.test(p.slice(1))} segmentsAfterBucket=${p.replace(/^\/+/,'').replace(/\/+$/,'').split('/').length-1}`);
});
const priv = process.env.PRIVATE_OBJECT_DIR||'';
console.log('privEndsWithSlash:', priv.endsWith('/'));
