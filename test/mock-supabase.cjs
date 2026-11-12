const crypto=require('crypto');
module.exports=KEY=>{
/* ---- Supabase simulado: Auth + PostgREST + RLS + trigger keep_newer ---- */
const M={users:new Map(),tok:new Map(),ref:new Map(),rows:new Map(),log:[],refreshCalls:0};
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'apikey,authorization,content-type,prefer','Access-Control-Allow-Methods':'GET,POST,OPTIONS'};
const J=(route,status,body)=>route.fulfill({status,headers:{...cors,'Content-Type':'application/json'},body:body===undefined?'':JSON.stringify(body)});
const sess=(u)=>{const a='at-'+crypto.randomUUID(),r='rt-'+crypto.randomUUID();M.tok.set(a,u.id);M.ref.set(r,u.id);return{access_token:a,refresh_token:r,expires_in:3600,user:{id:u.id,email:u.email}}};
async function handle(route){if(M.down)return route.abort('failed');const rq=route.request(),u=new URL(rq.url()),h=rq.headers();
 if(rq.method()==='OPTIONS')return route.fulfill({status:204,headers:cors});
 M.log.push({m:rq.method(),p:u.pathname,apikey:h.apikey,auth:h.authorization});
 if(h.apikey!==KEY)return J(route,401,{message:'Invalid API key'});
 const body=()=>{try{return JSON.parse(rq.postData()||'null')}catch{return null}};
 if(u.pathname==='/auth/v1/signup'){const b=body();if(M.users.has(b.email))return J(route,422,{msg:'User already registered'});const usr={id:crypto.randomUUID(),email:b.email,pw:b.password};M.users.set(b.email,usr);return J(route,200,sess(usr))}
 if(u.pathname==='/auth/v1/token'){const b=body(),g=u.searchParams.get('grant_type');
  if(g==='password'){const usr=M.users.get(b.email);if(!usr||usr.pw!==b.password)return J(route,400,{error:'invalid_grant',error_description:'Invalid login credentials'});return J(route,200,sess(usr))}
  if(g==='refresh_token'){M.refreshCalls++;const id=M.ref.get(b.refresh_token);if(!id)return J(route,400,{error:'invalid_grant'});M.ref.delete(b.refresh_token);return J(route,200,sess([...M.users.values()].find(x=>x.id===id)))}}
 if(u.pathname==='/rest/v1/records'){const a=(h.authorization||'').replace('Bearer ',''),uid=M.tok.get(a);if(!uid)return J(route,401,{message:'JWT invalid'});
  if(rq.method()==='POST'){const rows=body();if(rows.some(r=>r.user_id!==uid))return J(route,403,{message:'new row violates row-level security policy'});
   for(const r of rows){const k=`${uid}|${r.tbl}|${r.uid}`,old=M.rows.get(k);if(old&&Date.parse(r.updated_at)<Date.parse(old.updated_at))continue;M.rows.set(k,r)}return J(route,201)}
  if(rq.method()==='GET'){const gte=(u.searchParams.get('updated_at')||'gte.').slice(4),lim=+u.searchParams.get('limit')||1000,off=+u.searchParams.get('offset')||0;
   const rows=[...M.rows.entries()].filter(([k])=>k.startsWith(uid+'|')).map(([,r])=>r).filter(r=>Date.parse(r.updated_at)>=Date.parse(gte)).sort((a,b)=>a.updated_at<b.updated_at?-1:a.updated_at>b.updated_at?1:a.tbl+a.uid<b.tbl+b.uid?-1:1).slice(off,off+lim).map(({tbl,uid,data,updated_at,deleted})=>({tbl,uid,data,updated_at,deleted}));return J(route,200,rows)}}
 return J(route,404,{message:'not found'})}
const mine=(email)=>[...M.rows.entries()].filter(([k])=>k.startsWith(M.users.get(email).id+'|')).map(([,r])=>r);
return{M,handle,mine}};
