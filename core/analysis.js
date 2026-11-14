/* Análises de corrida (JavaScript puro): parciais, ritmo ajustado à inclinação (RAI/GAP), recordes, previsões,
   zonas de ritmo, forma e fadiga, insights e GPX. Tudo calculado localmente a partir do trajeto salvo. */
import {haversine,createTracker} from './running.js';
export const STD=[['1 km',1000],['5 km',5000],['10 km',10000],['Meia maratona',21097.5]];
export const FULL=['42,195 km',42195];
/* Rota salva = [lat,lon,t,brk,alt,cum,act]; rotas antigas/GPX sem cum/act são recalculadas (distância por haversine, tempo = decorrido). */
export function normalize(route){const P=route.map(p=>Array.isArray(p)?{lat:p[0],lon:p[1],t:p[2],brk:p[3]===1?1:0,alt:p[4]??undefined,cum:p[5],act:p[6]}:{...p});
  if(P.length&&P.every(p=>Number.isFinite(p.cum)&&Number.isFinite(p.act)))return P;let c=0;P.forEach((p,i)=>{if(i&&!p.brk)c+=haversine(P[i-1],p);p.cum=c;p.act=p.t-P[0].t});return P}
function at(P,d){const n=P.length-1;if(d<=P[0].cum)return P[0];if(d>=P[n].cum)return P[n];let lo=0,hi=n;while(hi-lo>1){const m=(lo+hi)>>1;P[m].cum<=d?lo=m:hi=m}const a=P[lo],b=P[hi],f=b.cum===a.cum?0:(d-a.cum)/(b.cum-a.cum);return{cum:d,act:a.act+f*(b.act-a.act),alt:a.alt!=null&&b.alt!=null?a.alt+f*(b.alt-a.alt):undefined}}
/* Custo energético da corrida por inclinação (Minetti et al., 2002), usado para o ritmo ajustado à inclinação */
const cost=g=>155.4*g**5-30.4*g**4-43.3*g**3+46.3*g**2+19.5*g+3.6;
export const gapPace=(pace,grade)=>pace/(cost(Math.max(-0.3,Math.min(0.3,grade)))/3.6);
export function splits(P,unit=1000){if(P.length<2)return[];const tot=P[P.length-1].cum,out=[];let prev=P[0],k=1;
  const mk=(i,dist,p)=>{const ms=p.act-prev.act,dAlt=p.alt!=null&&prev.alt!=null?p.alt-prev.alt:null,pace=ms/1000/(dist/1000);return{i,distM:dist,ms,paceSecKm:pace,dAlt,gapSecKm:dAlt==null?null:gapPace(pace,dAlt/dist)}};
  for(;k*unit<=tot;k++){const p=at(P,k*unit);out.push(mk(k,unit,p));prev=p}const rem=tot-(k-1)*unit;if(rem>=50)out.push({...mk(k,rem,at(P,tot)),partial:true});return out}
export function bestEffort(P,D){const n=P.length;if(!n||P[n-1].cum<D)return null;let best=Infinity;for(const p of P){if(p.cum+D>P[n-1].cum)break;best=Math.min(best,at(P,p.cum+D).act-p.act)}return best===Infinity?null:best}
export function prs(acts,skipId=null){const out={};for(const a of acts){if(a.id===skipId||!a.route?.length)continue;const P=normalize(a.route);for(const[n,D]of[...STD,FULL]){const ms=bestEffort(P,D);if(ms!=null&&(!out[n]||ms<out[n].ms))out[n]={ms,D,id:a.id,date:a.date}}}return out}
export const riegel=(t1,d1,d2)=>t1*(d2/d1)**1.06;
export function predictions(pr){const base=[...STD].reverse().map(([n])=>pr[n]).find(Boolean);if(!base)return null;return{base,list:[...STD.slice(1),FULL].map(([n,D])=>({n,D,ms:riegel(base.ms,base.D,D)}))}}
export function thresholdPace(pr,acts,manual){if(manual>0)return manual;if(pr['5 km'])return pr['5 km'].ms/1000/5*1.05;const p=acts.filter(a=>a.avgPaceSecKm>0).slice(-10).map(a=>a.avgPaceSecKm).sort((a,b)=>a-b);return p.length?p[Math.floor(p.length/2)]*0.97:null}
export const ZONES=[['Z1 Recuperação',0,.8],['Z2 Aeróbico',.8,.9],['Z3 Ritmo',.9,.97],['Z4 Limiar',.97,1.04],['Z5 Intenso',1.04,9]];
/* Velocidade medida em janelas de ≥20 s (o ritmo entre pontos consecutivos do GPS oscila demais). */
export function zoneTimes(P,T){const vT=1000/T,z=[0,0,0,0,0];let i=0;while(i<P.length-1){let j=i+1;while(j<P.length-1&&P[j].act-P[i].act<20000)j++;
    const dt=P[j].act-P[i].act,d=P[j].cum-P[i].cum;let gap=false;for(let k=i+1;k<=j;k++)if(P[k].brk)gap=true;
    if(dt>0&&d>0&&!gap){const f=(d/(dt/1000))/vT,k=ZONES.findIndex(([,a,b])=>f>=a&&f<b);z[k<0?4:k]+=dt}i=j}return z}
/* Carga de treino ≈ horas × fator de intensidade² × 100 (fator = velocidade média / velocidade de limiar). Forma (CTL, 42 d), fadiga (ATL, 7 d), frescor (TSB = CTL − ATL). Estimativa — sem sensor de frequência cardíaca. */
export const loadOf=(a,T)=>{if(!T||!(a.activeMs>0)||!(a.distM>0))return 0;const IF=Math.max(.5,Math.min(1.15,(a.distM/(a.activeMs/1000))/(1000/T)));return a.activeMs/36e5*IF*IF*100};
export function fitness(acts,T,today,n=90){if(!acts.length||!T)return[];const by={};for(const a of acts)by[a.date]=(by[a.date]||0)+loadOf(a,T);const day=s=>Date.UTC(+s.slice(0,4),+s.slice(5,7)-1,+s.slice(8,10))/864e5;
  const d0=Math.min(...acts.map(a=>day(a.date))),d1=day(today),k42=1-Math.exp(-1/42),k7=1-Math.exp(-1/7),out=[];let c=0,t=0;
  for(let d=d0;d<=d1;d++){const s=new Date(d*864e5).toISOString().slice(0,10),l=by[s]||0;c+=(l-c)*k42;t+=(l-t)*k7;out.push({d:s,ctl:c,atl:t,tsb:c-t})}return out.slice(-n)}
export function insights(a,hist){const out=[],P=normalize(a.route||[]),sp=splits(P).filter(s=>!s.partial),fmt=ms=>{const s=Math.round(ms/1000);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')};
  const old=prs(hist,a.id),now=prs([a]),others=hist.filter(h=>h.id!==a.id).length;for(const[n]of[...STD,FULL]){if(!now[n])continue;if(old[n]&&now[n].ms<old[n].ms)out.push(`🏆 Novo recorde pessoal de ${n}: ${fmt(now[n].ms)}`);else if(!old[n]&&others>0)out.push(`🎉 Primeira vez que você completa ${n}: ${fmt(now[n].ms)}`)}
  if(sp.length>=2){const h=Math.floor(sp.length/2),A=sp.slice(0,h),B=sp.slice(sp.length-h),pa=A.reduce((x,s)=>x+s.paceSecKm,0)/h,pb=B.reduce((x,s)=>x+s.paceSecKm,0)/h;
    if(pb<pa*0.97)out.push('Você acelerou na segunda metade (negative split) — ótimo controle de ritmo.');else if(pb>pa*1.05)out.push('Seu ritmo caiu na segunda metade; comece um pouco mais leve para manter o pace.');
    const m=sp.reduce((x,s)=>x+s.paceSecKm,0)/sp.length,sd=Math.sqrt(sp.reduce((x,s)=>x+(s.paceSecKm-m)**2,0)/sp.length);if(sd/m<0.03)out.push('Ritmo muito constante entre os quilômetros.');
    const f=sp.reduce((x,s)=>s.paceSecKm<x.paceSecKm?s:x);out.push(`Seu km mais rápido foi o ${f.i}º (${fmt(f.paceSecKm*1000)}/km).`)}
  const prev=hist.filter(h=>h.id!==a.id).slice(-5);if(prev.length>=2){const avg=prev.reduce((x,h)=>x+h.distM,0)/prev.length,df=(a.distM-avg)/avg*100;if(Math.abs(df)>=10)out.push(`Esta corrida foi ${Math.abs(Math.round(df))}% ${df>0?'mais longa':'mais curta'} que a média das últimas ${prev.length}.`)}
  if(a.gainM>=10)out.push(`Subida acumulada de ${Math.round(a.gainM)} m (altitude do GPS, estimativa).`);return out}
/* ---- GPX ---- */
const esc=s=>String(s).replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]));
export function toGPX(a){const P=normalize(a.route||[]);let o=`<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Satori" xmlns="http://www.topografix.com/GPX/1/1"><metadata><name>${esc(a.name||'Corrida')}</name><time>${new Date(a.startedAt).toISOString()}</time></metadata><trk><name>${esc(a.name||'Corrida')}</name><type>running</type><trkseg>`;
  P.forEach((p,i)=>{if(i&&p.brk)o+='</trkseg><trkseg>';o+=`<trkpt lat="${p.lat}" lon="${p.lon}">${p.alt!=null?`<ele>${p.alt}</ele>`:''}<time>${new Date(p.t).toISOString()}</time></trkpt>`});return o+'</trkseg></trk></gpx>'}
export function parseGPX(text){if(typeof text!=='string'||text.length>25e6)throw Error('Arquivo GPX grande demais');if(!/<gpx[\s>]/i.test(text))throw Error('Não é um arquivo GPX válido');
  const name=(text.match(/<trk>[\s\S]*?<name>([^<]*)<\/name>/i)||text.match(/<name>([^<]*)<\/name>/i)||[])[1],pts=[];let m;
  const segs=text.split(/<trkseg>/i).slice(1);let cnt=0;for(const sg of segs){let first=true;const body=sg.split(/<\/trkseg>/i)[0];const r2=/<trkpt\s+([^>]*?)(?:\/>|>([\s\S]*?)<\/trkpt>)/gi;while((m=r2.exec(body))){const la=+(m[1].match(/lat="([^"]+)"/)||[])[1],lo=+(m[1].match(/lon="([^"]+)"/)||[])[1],tm=(m[2]||'').match(/<time>([^<]+)<\/time>/i),el=(m[2]||'').match(/<ele>([^<]+)<\/ele>/i),t=tm?Date.parse(tm[1]):NaN;
    if(!Number.isFinite(la)||!Number.isFinite(lo)||Math.abs(la)>90||Math.abs(lo)>180)throw Error('Coordenada inválida no GPX');if(++cnt>200000)throw Error('GPX com pontos demais');
    pts.push({lat:la,lon:lo,t,alt:el&&Number.isFinite(+el[1])?+el[1]:undefined,brk:first&&pts.length?1:0});first=false}}
  if(pts.length<2)throw Error('O GPX não tem trajeto (trkpt)');return{name:name&&name.trim()?name.trim().replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').slice(0,60):null,points:pts,hasTime:pts.every(p=>Number.isFinite(p.t))}}
/* GPX → atividade: passa os pontos pelo mesmo motor da corrida (mesmos filtros). Sem horário no GPX, não dá para calcular pace. */
export function gpxToActivity(g,{autoPause=true}={}){if(!g.hasTime)throw Error('Este GPX não tem horários: só dá para usá-lo como rota para seguir.');const tr=createTracker({autoPause});tr.start(g.points[0].t);for(const p of g.points)tr.addPoint({t:p.t,lat:p.lat,lon:p.lon,acc:5,alt:p.alt});const end=g.points[g.points.length-1].t;tr.finish(end);const s=tr.snapshot(end);
  return{startedAt:g.points[0].t,endedAt:end,activeMs:s.activeMs,elapsedMs:s.elapsedMs,distM:s.distM,avgPaceSecKm:s.avgPaceSecKm,avgKmh:s.avgKmh,gainM:s.gainM,lossM:s.lossM,gapMs:s.gapMs,route:tr.route()}}
