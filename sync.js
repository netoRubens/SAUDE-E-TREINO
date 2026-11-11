/* Conta e sincronização (Supabase Auth + PostgREST via fetch, sem bibliotecas).
   Estratégia: envia registros alterados (updatedAt) e exclusões; baixa o que mudou; conflito = vence o mais recente (LWW). */
(function(){
const C=window.SATORI_CFG,EPOCH='1970-01-01T00:00:00.000Z',iso=ms=>new Date(ms).toISOString();
const ORDER=['foods','workouts','habits','goals','weights','plan','foodlog','sessions','water','profileLog','steps','habitlog','kv'];
const REFS={plan:[['foodId','foods']],foodlog:[['foodId','foods']],sessions:[['wid','workouts']]};
async function api(path,{method='GET',body,token,headers={}}={}){let r;
  try{r=await fetch(C.url+path,{method,headers:{apikey:C.key,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{}),...headers},body:body?JSON.stringify(body):undefined})}catch{throw Object.assign(new Error('Sem conexão com o servidor'),{offline:true})}
  const t=await r.text();let j=null;try{j=t?JSON.parse(t):null}catch{}
  if(!r.ok)throw Object.assign(new Error(j?.msg||j?.message||j?.error_description||j?.error||'HTTP '+r.status),{status:r.status});return j}
const getS=()=>db.kv.get('session'),setS=s=>db.kv.put({key:'session',...s});
const toS=(j,old)=>({access_token:j.access_token,refresh_token:j.refresh_token,expires_at:Date.now()+(j.expires_in||3600)*1000,user:{id:(j.user||old.user).id,email:(j.user||old.user).email}});
async function token(){let s=await getS();if(!s)throw new Error('Sem sessão');
  if(s.expires_at-Date.now()<60000){try{s=toS(await api('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:s.refresh_token}}),s);await setS(s)}catch(e){if(e.status===400||e.status===401){await db.kv.delete('session');throw new Error('Sessão expirada: entre novamente')}throw e}}return s}
async function signUp(email,password){const j=await api('/auth/v1/signup',{method:'POST',body:{email,password}});if(!j?.access_token)return{needsConfirm:true};await setS(toS(j));return{ok:true}}
async function signIn(email,password){await setS(toS(await api('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password}})));return{ok:true}}
const signOut=()=>db.kv.delete('session');
let busy=false;
async function syncNow({auto=false}={}){if(busy)return null;busy=true;let st;
 try{const s=await token();st=(await db.kv.get('sync'))||{key:'sync',push:0,pull:EPOCH};
  if(st.userId!==s.user.id){if(auto)return null;st={key:'sync',push:0,pull:EPOCH,userId:s.user.id}}  // 1ª sincronização com esta conta só manual (com confirmação na tela)
  const t0=Date.now(),pushed=await push(s,st),pulled=await pull(s,st);st.push=t0-1000;st.at=Date.now();delete st.err;await db.kv.put(st);return{pushed,pulled}}
 catch(e){if(st){st.err=e.message;await db.kv.put(st)}throw e}finally{busy=false}}
async function push(s,st){const uid=s.user.id,rows=[],idmap={};
 for(const n of['foods','workouts','habits'])idmap[n]=Object.fromEntries((await db[n].toArray()).map(r=>[r.id,r.uid]));
 for(const n of ORDER){
  if(n==='kv'){for(const k of KVSYNC){const r=await db.kv.get(k);if(r&&r.updatedAt>=st.push)rows.push({user_id:uid,tbl:'kv',uid:k,data:r,updated_at:iso(r.updatedAt),deleted:false})}continue}
  for(const r of await db[n].toArray()){if(!(r.updatedAt>=st.push))continue;let{id,...d}=r,u=r.uid;
   if(n==='steps')u=r.date;
   if(n==='habitlog'){const hu=idmap.habits[r.habitId];if(!hu)continue;u=`${r.date}|${hu}`;d={date:r.date,habitUid:hu,done:r.done,updatedAt:r.updatedAt}}
   else for(const[f,p]of REFS[n]||[]){d[f+'Uid']=idmap[p][r[f]]??null;delete d[f]}
   if(u)rows.push({user_id:uid,tbl:n,uid:u,data:d,updated_at:iso(r.updatedAt),deleted:false})}}
 for(const t of(await db.kv.get('tombstones'))?.items||[])if(t.at>=st.push)rows.push({user_id:uid,tbl:t.t,uid:t.uid||t.key,data:{},updated_at:iso(t.at),deleted:true});
 for(let i=0;i<rows.length;i+=200)await api('/rest/v1/records?on_conflict=user_id,tbl,uid',{method:'POST',token:s.access_token,headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:rows.slice(i,i+200)});
 return rows.length}
async function pull(s,st){const all=[];for(let off=0;;){const rows=await api(`/rest/v1/records?select=tbl,uid,data,updated_at,deleted&updated_at=gte.${encodeURIComponent(st.pull)}&order=updated_at.asc,tbl.asc,uid.asc&limit=500&offset=${off}`,{token:s.access_token});all.push(...rows);off+=rows.length;if(rows.length<500)break}
 const by={};for(const r of all)(by[r.tbl]||(by[r.tbl]=[])).push(r);let n=0,skipped=false;const u2i={};
 const maps=async t=>{const m={};for(const r of await db[t].toArray())if(r.uid)m[r.uid]=r;return m};
 for(const t of ORDER){const rows=by[t];if(!rows){if(['foods','workouts','habits'].includes(t))u2i[t]=Object.fromEntries(Object.entries(await maps(t)).map(([u,r])=>[u,r.id]));continue}
  const tb=db[t],raw=tb.raw||tb,keyed=t==='steps'||t==='habitlog'||t==='kv',loc=keyed?null:await maps(t);
  for(const r of rows){const ts=Date.parse(r.updated_at);let d={...r.data},local,key;
   if(t==='kv'){key=r.uid;local=await db.kv.get(key)}
   else if(t==='steps'){key=r.uid;local=await db.steps.get(key)}
   else if(t==='habitlog'){const[dt,hu]=r.uid.split('|'),h=(u2i.habits||{})[hu];if(!h){if(!r.deleted)skipped=true;continue}key=`${dt}|${h}`;d={key,date:dt,habitId:h,done:d.done,updatedAt:d.updatedAt};local=await db.habitlog.get(key)}
   else local=loc[r.uid];
   if(local&&(local.updatedAt||0)>=ts)continue;
   if(r.deleted){if(local){await raw.delete(keyed?key:local.id);n++}continue}
   let bad=false;if(!keyed)for(const[f,p]of REFS[t]||[]){const pu=d[f+'Uid'];delete d[f+'Uid'];if(pu){const id=(u2i[p]||{})[pu];if(id==null)bad=true;else d[f]=id}else d[f]=null}
   if(bad){skipped=true;continue}
   if(t==='kv')await db.kv.raw.put({...d,key});else if(t==='steps'||t==='habitlog')await raw.put(d);else if(local)await raw.put({...d,id:local.id});else await raw.add(d);n++}
  if(['foods','workouts','habits'].includes(t))u2i[t]=Object.fromEntries(Object.entries(await maps(t)).map(([u,r])=>[u,r.id]))}
 if(!skipped&&all.length)st.pull=all[all.length-1].updated_at;return n}
let tm;function schedule(){clearTimeout(tm);tm=setTimeout(async()=>{if(!navigator.onLine)return;try{const r=await syncNow({auto:true});if(r&&r.pulled)window.dispatchEvent(new Event('satori-synced'))}catch(e){console.warn('sync:',e.message)}},4000)}
window.Sync={signUp,signIn,signOut,syncNow,schedule,session:getS,state:()=>db.kv.get('sync')};
})();
