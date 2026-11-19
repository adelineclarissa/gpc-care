import { createServer } from 'node:http';
import { randomBytes, timingSafeEqual, scryptSync, createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { demo, empty } from './seed.js';

const production = Boolean(process.env.CRM_USERS);
if (production && !/^https:\/\/[^/]+$/.test(process.env.CRM_ORIGIN || '')) throw Error('Set CRM_ORIGIN to the public HTTPS origin.');
const users = production ? JSON.parse(process.env.CRM_USERS) : demo.users;
if (production && (!Array.isArray(users) || !users.length || new Set(users.map(u => u.id)).size !== users.length || new Set(users.map(u => u.email?.toLowerCase())).size !== users.length || users.some(u => !u.id || !u.name || !u.email || typeof u.password !== 'string' || u.password.length < 12))) throw Error('CRM_USERS requires unique IDs and emails, names, and passwords of at least 12 characters.');
const day = () => new Intl.DateTimeFormat('en-CA',{timeZone:process.env.CRM_TIMEZONE || 'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
process.umask(0o077);
const db = new DatabaseSync(process.env.CRM_DB || (production ? 'churchcare.sqlite' : 'demo.sqlite'));
db.exec('CREATE TABLE IF NOT EXISTS app_mode (id INTEGER PRIMARY KEY, production INTEGER NOT NULL)');
db.prepare('INSERT OR IGNORE INTO app_mode VALUES (1,?)').run(Number(production));
if (db.prepare('SELECT production FROM app_mode WHERE id=1').get().production !== Number(production)) throw Error('Use separate database files for demo and production.');
db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS data (id INTEGER PRIMARY KEY, version INTEGER NOT NULL, state TEXT NOT NULL); CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user TEXT NOT NULL, expires INTEGER NOT NULL);');
db.prepare('INSERT OR IGNORE INTO data VALUES (1,0,?)').run(JSON.stringify(production ? empty : demo));
const read = () => db.prepare('SELECT version,state FROM data WHERE id=1').get();
const write = (state,version) => db.prepare('UPDATE data SET state=?,version=version+1 WHERE id=1 AND version=?').run(JSON.stringify(state),version).changes;
const update = fn => {const row=read(), state=JSON.parse(row.state); fn(state); write(state,row.version);};
const digest = token => createHash('sha256').update(token).digest('hex');
const authUsers = users.map(u => ({id:u.id,name:u.name,email:u.email,hash:u.password && scryptSync(u.password,u.id,64)}));
const vapid = process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY;
const webpush = vapid ? (await import('web-push')).default : null;
if(vapid) webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@example.com',process.env.VAPID_PUBLIC_KEY,process.env.VAPID_PRIVATE_KEY);
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2','.webmanifest':'application/manifest+json'};
const publicFiles=new Set(['/','/index.html','/styles.css','/app.js','/icons.js','/sw.js','/manifest.webmanifest','/icon-192.png','/icon-512.png','/dm-sans.woff2','/manrope.woff2']);
const attempts=new Map();
function fail(message,status=400){throw Object.assign(Error(message),{status});}
async function body(req){
  let data='';
  for await(const chunk of req){data+=chunk;if(data.length>500000)fail('Request too large.',413);}
  try{return JSON.parse(data);}catch{fail('Invalid request.');}
}
function validate(data, state){
  if(!data || ['members','attendance','followups','interactions'].some(key=>!Array.isArray(data[key]))) fail('Invalid church records.');
  const date = value=>typeof value==='string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10)===value;
  const str = (value,max=250)=>typeof value==='string' && value.length<=max;
  const id = value=>str(value,100) && Boolean(value);
  const owner = value=>value==='' || users.some(user=>user.id===value);
  const unique = values=>new Set(values).size===values.length;
  if(data.members.some(m=>!m || !id(m.id) || !str(m.name) || !m.name.trim() || !str(m.email) || !str(m.phone) || !date(m.created) || (m.birthday!=='' && !date(m.birthday)) || !owner(m.owner) || !['Active','New member','Inactive'].includes(m.status)) || !unique(data.members.map(m=>m.id))) fail('Check member details.');
  const members=new Set(data.members.map(m=>m.id));
  if(data.attendance.some(a=>!a || !date(a.date) || a.date>day() || !str(a.label) || !a.label.trim() || !Array.isArray(a.present) || !unique(a.present) || a.present.some(m=>!members.has(m)) || (a.sample!==undefined && (production || !Number.isInteger(a.sample) || a.sample<0))) || !unique(data.attendance.map(a=>a.date))) fail('Check attendance details.');
  if(data.followups.some(f=>!f || !id(f.id) || !members.has(f.member) || !str(f.reason,1000) || !f.reason.trim() || !owner(f.owner) || !date(f.due) || !['Open','In progress','Complete','Overdue'].includes(f.status)) || !unique(data.followups.map(f=>f.id))) fail('Check follow-up details.');
  if(data.interactions.some(i=>!i || !id(i.id) || !members.has(i.member) || !str(i.note,5000) || !i.note.trim() || !['Call','Message','Visit','Other'].includes(i.type) || !date(i.date) || !id(i.author) || (!owner(i.author) && !state.interactions.some(old=>old.id===i.id && old.author===i.author))) || !unique(data.interactions.map(i=>i.id))) fail('Check interaction details.');
  for(const key of ['members','attendance','followups','interactions']) state[key]=data[key];
}
createServer(async(req,res)=>{
  const json=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Content-Security-Policy',"default-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'");
  try{
    const path=new URL(req.url,'http://localhost').pathname;
    const token=req.headers.cookie?.match(/(?:^|;\s*)crm=([a-f0-9]{64})(?:;|$)/)?.[1];
    const session=token && db.prepare('SELECT user FROM sessions WHERE token=? AND expires>?').get(digest(token),Date.now());
    let user=authUsers.find(u=>u.id===session?.user);
    if(!production && !user) user=authUsers[0];
    if(path.startsWith('/api/') && req.method!=='GET' && req.headers.origin){
      if(req.headers.origin !== (process.env.CRM_ORIGIN || ('http://'+req.headers.host)) && (production || req.headers['sec-fetch-site']!=='same-origin')) fail('Invalid origin.',403);
    }
    if(path==='/api/login' && req.method==='POST'){
      const {email,password,userId}=await body(req);
      const key=req.socket.remoteAddress;
      const now=Date.now();
      for(const [ip, attempt] of attempts) if(attempt.until<now) attempts.delete(ip);
      const old=attempts.get(key) || {count:0,until:now+600000};
      if(production && old.count>=10) fail('Try again in 10 minutes.',429);
      if(production) attempts.set(key,{...old,count:old.count+1});
      const candidate=authUsers.find(u=>production ? u.email.toLowerCase()===String(email).toLowerCase().trim() : u.id===userId);
      const hash=production ? scryptSync(String(password || '').slice(0,1024),candidate?.id || 'invalid-login',64) : null;
      if(!candidate || (production && !timingSafeEqual(hash,candidate.hash))) fail('Invalid email or password.',401);
      attempts.delete(key);
      const newToken=randomBytes(32).toString('hex');
      db.prepare('DELETE FROM sessions WHERE expires<=?').run(now);
      db.prepare('INSERT INTO sessions VALUES (?,?,?)').run(digest(newToken),candidate.id,now+604800000);
      res.setHeader('Set-Cookie','crm='+newToken+'; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800'+(production?'; Secure':''));
      return json(200,{ok:true});
    }
    if(path.startsWith('/api/') && !user) fail('Sign in to continue.',401);
    if(path==='/api/logout' && req.method==='POST'){
      if(token) db.prepare('DELETE FROM sessions WHERE token=?').run(digest(token));
      res.setHeader('Set-Cookie','crm=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0'+(production?'; Secure':''));
      return json(200,{ok:true});
    }
    if(path==='/api/state' && req.method==='GET'){
      const row=read(), {subscriptions,preferences,alerts,...records}=JSON.parse(row.state);
      return json(200,{...records,version:row.version,users:authUsers.map(({id,name})=>({id,name})),user:{id:user.id,name:user.name},
        demo:!production,today:day(),vapid:vapid ? process.env.VAPID_PUBLIC_KEY : null,telegramAvailable:!!process.env.TELEGRAM_BOT_TOKEN,
        preferences:{birthdays:true,inactivity:true,followups:true,telegram:'',...preferences[user.id]}});
    }
    if(path==='/api/state' && req.method==='PUT'){
      const incoming=await body(req), row=read(), state=JSON.parse(row.state);
      if(incoming.version!==row.version) fail('Someone updated the records. Reload and try again.',409);
      validate(incoming,state);
      write(state,row.version);
      return json(200,{version:row.version+1});
    }
    if(path==='/api/preferences' && req.method==='PUT'){
      const p=await body(req);
      if(['birthdays','inactivity','followups'].some(k=>typeof p[k]!=='boolean') || typeof p.telegram!=='string' || !/^(|[1-9]\d{0,17})$/.test(p.telegram)) fail('Enter a valid private Telegram chat ID.');
      update(s=>{s.preferences[user.id]={birthdays:p.birthdays,inactivity:p.inactivity,followups:p.followups,telegram:p.telegram};});
      return json(200,{ok:true});
    }
    if(path==='/api/push' && (req.method==='PUT' || req.method==='DELETE')){
      const sub=await body(req);
      if(typeof sub?.endpoint!=='string' || sub.endpoint.length>2048) fail('Invalid push subscription.');
      const url=new URL(sub.endpoint);
      if(url.protocol!=='https:' || url.port || url.username || url.password || !/^(?:fcm\.googleapis\.com|android\.googleapis\.com|updates\.push\.services\.mozilla\.com|(?:[a-z0-9-]+\.)?push\.apple\.com)$/.test(url.hostname)) fail('Unsupported push service.');
      if(req.method==='PUT' && (!vapid || !/^[\w-]{87}$/.test(sub.keys?.p256dh || '') || !/^[\w-]{22}$/.test(sub.keys?.auth || ''))) fail('Push is unavailable or the subscription is invalid.');
      update(s=>{
        for(const [id,list] of Object.entries(s.subscriptions)){
          if(req.method==='PUT' || id===user.id) s.subscriptions[id]=list.filter(item=>item.endpoint!==sub.endpoint);
        }
        if(req.method==='PUT') s.subscriptions[user.id]=[...(s.subscriptions[user.id] || []),sub].slice(-10);
      });
      return json(200,{ok:true});
    }
    if(!publicFiles.has(path) || req.method!=='GET') return json(404,{error:'Page not found.'});
    const file=path==='/' ? '/index.html' : path;
    res.writeHead(200,{'Content-Type':types[extname(file)],'Cache-Control':'no-cache'});
    res.end(await readFile(resolve('public','.'+file)));
  }catch(error){if(!error.status) console.error(error); if(!res.headersSent) json(error.status || 500,{error:error.status ? error.message : 'Something went wrong.'}); else res.end();}
}).listen(process.env.PORT || 3000,'0.0.0.0',()=>console.log('ChurchCare listening on port '+(process.env.PORT || 3000)));

function pendingAlerts(state,today){
  const result=[];
  for(const m of state.members){
    if(m.status==='Inactive') continue;
    if((m.birthday?.slice(5)===today.slice(5) || (m.birthday?.endsWith('-02-29') && today.endsWith('-03-01') && new Date(today.slice(0,4)+'-02-29T12:00:00Z').getUTCMonth()===2))) result.push({kind:'birthdays',key:'birthday:'+m.id+':'+today,owner:m.owner,title:'Birthday reminder'});
    const missed=state.attendance.filter(a=>a.date>=m.created && a.date<=today).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,3);
    if(missed.length===3 && missed.every(a=>!a.present.includes(m.id))){
      const episode=state.attendance.filter(a=>a.date>=m.created && a.date<=today && a.present.includes(m.id)).map(a=>a.date).sort().at(-1) || m.created;
      result.push({kind:'inactivity',key:'inactivity:'+m.id+':'+episode,owner:m.owner,title:'Attendance check-in',member:m.id});
    }
  }
  for(const f of state.followups){
    if(f.due<=today && f.status!=='Complete') result.push({kind:'followups',key:'followup:'+f.id+':'+f.due,owner:f.owner,title:'Follow-up due'});
  }
  return result;
}
let scanning=false;
async function scan(){
  if(scanning || !production) return;
  scanning=true;
  try{
    const state=JSON.parse(read().state), today=day();
    for(const alert of pendingAlerts(state,today)){
      if(alert.member && !state.alerts['task:'+alert.key]){
        update(s=>{
          if(!s.followups.some(f=>f.member===alert.member && f.reason==='Missed 3 services' && f.status!=='Complete')){
            s.followups.push({id:randomBytes(12).toString('hex'),member:alert.member,owner:alert.owner,due:today,reason:'Missed 3 services',status:'Open'});
          }
          s.alerts['task:'+alert.key]=today;
        });
      }
      for(const user of authUsers.filter(u=>!authUsers.some(a=>a.id===alert.owner) || alert.owner===u.id)){
        const p=state.preferences[user.id] || {}, key=user.id+':'+alert.key;
        if(p[alert.kind]===false || state.alerts[key]) continue;
        const message='Open ChurchCare for details.';
        let delivered=false;
        for(const sub of vapid ? state.subscriptions[user.id] || [] : []){
          try{await webpush.sendNotification(sub,JSON.stringify({title:alert.title,body:message,tag:alert.key}),{timeout:10000,TTL:3600});delivered=true;}
          catch(error){
            if([404,410].includes(error.statusCode)) update(s=>{s.subscriptions[user.id]=(s.subscriptions[user.id] || []).filter(item=>item.endpoint!==sub.endpoint);});
          }
        }
        if(!delivered && p.telegram && process.env.TELEGRAM_BOT_TOKEN){
          try{
            const response=await fetch('https://api.telegram.org/bot'+process.env.TELEGRAM_BOT_TOKEN+'/sendMessage',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:p.telegram,text:alert.title+' — '+message}),signal:AbortSignal.timeout(10000)});
            delivered=response.ok;
          }catch{}
        }
        if(delivered) update(s=>{s.alerts[key]=today;});
      }
    }
  }catch(error){console.error('Alert scan failed:',error.message);}
  finally{scanning=false;}
}
setInterval(scan,60000).unref();
scan();
