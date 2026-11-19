import {icon} from './icons.js';

const root=document.querySelector('#app');
const dialog=document.querySelector('#dialog');
const routes={dashboard:['Dashboard','dashboard'],members:['Members','users'],attendance:['Attendance','calendar'],followups:['Follow-ups','heart'],birthdays:['Birthdays','cake'],settings:['Settings','settings']};
let state, range=4, myTasks=false, toastTimer, busy=false, installPrompt;
const esc=value=>String(value ?? '').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const date=(value,options={month:'short',day:'numeric'})=>value ? new Intl.DateTimeFormat('en-US',{timeZone:'UTC',...options}).format(new Date(value+'T12:00:00Z')) : '—';
const uid=()=>crypto.randomUUID?.() || Array.from(crypto.getRandomValues(new Uint8Array(16)),n=>n.toString(16).padStart(2,'0')).join('');
const member=id=>state.members.find(m=>m.id===id);
const owner=id=>state.users.find(u=>u.id===id)?.name || 'Unassigned';
const sorted=()=>[...state.attendance].sort((a,b)=>a.date.localeCompare(b.date));
const count=a=>a?.sample ?? a?.present.length ?? 0;
const status=f=>f.status!=='Complete' && f.due<state.today ? 'Overdue' : f.status==='Overdue' ? 'Open' : f.status;
const pill=s=>`<span class="pill ${s.toLowerCase().replaceAll(' ','-')}">${esc(s)}</span>`;
const avatar=(person={})=>{
  const initials=(person.name || '?').trim().split(/\s+/).slice(0,2).map(n=>n[0]).join('');
  const colors=[person.bg,person.ink].map(c=>/^#[0-9a-f]{6}$/i.test(c || '') ? c : '');
  return `<span class="avatar" ${colors.every(Boolean)?`style="--avatar-bg:${colors[0]};--avatar-ink:${colors[1]}"`:''}>${esc(initials)}</span>`;
};
const btn=(label,action,symbol='',kind='button',id='')=>`<button type="button" class="${kind}" data-action="${action}" data-id="${esc(id)}">${symbol?icon(symbol,16):''}${esc(label)}</button>`;
const personLink=m=>m ? `<button type="button" class="person-link" data-action="member" data-id="${esc(m.id)}">${esc(m.name)}</button>` : 'Unknown member';
const brand=()=>`<div class="brand"><span class="brand-icon">${icon('church',22)}</span><div><strong>ChurchCare</strong><small>Church Management</small></div></div>`;
const pageTitle=(title,subtitle,action='',extra='')=>`<div class="page-title"><div>${extra}<h1>${esc(title)}</h1><p>${esc(subtitle)}</p></div>${action}</div>`;
const empty=message=>`<p class="empty">${esc(message)}</p>`;
const menu=(keys,label,current)=>`<div class="nav-group"><div class="nav-caption">${label}</div>${keys.map(key=>`<button class="nav-item ${key===current?'active':''}" ${key===current?'aria-current="page"':''} data-action="go" data-id="${key}">${icon(routes[key][1],18)}${routes[key][0]}</button>`).join('')}</div>`;
const route=()=>Object.hasOwn(routes,location.hash.slice(1)) ? location.hash.slice(1) : 'dashboard';
function navigate(key){if(route()===key) render();else location.hash=key;}
function layout(key,html){
  root.innerHTML=`<div class="layout"><button class="overlay" data-action="menu" aria-label="Close navigation"></button><aside class="sidebar">${brand()}<nav aria-label="Main navigation">${menu(['dashboard','members','attendance','followups','birthdays'],'WORKSPACE',key)}${menu(['settings'],'PREFERENCES',key)}</nav><div class="sidebar-footer"><button class="profile" data-action="profile">${avatar(state.user)}<span><strong>${esc(state.user.name)}</strong><small>Administrator</small></span>${icon('down',15)}</button></div></aside><div class="main"><header class="topbar"><div class="crumb"><button class="icon-button mobile-menu" aria-label="Open navigation" data-action="menu">${icon('menu',18)}</button><span>Workspace</span>${icon('chevron',14)}<strong>${routes[key][0]}</strong></div><div class="header-actions"><button class="icon-button" data-action="notifications" aria-label="Notifications">${icon('bell',18)}${openTasks().length||birthdays(7).length?'<i class="bell-dot"></i>':''}</button></div></header><main class="content">${html}</main></div></div>`;
}
function birthdays(days){
  const today=new Date(state.today+'T12:00:00Z');
  return state.members.filter(m=>m.birthday && m.status!=='Inactive').map(m=>{
    const event=year=>new Date(Date.UTC(year,Number(m.birthday.slice(5,7))-1,Number(m.birthday.slice(8)),12));
    const current=event(today.getUTCFullYear());
    const next=current<today ? event(today.getUTCFullYear()+1) : current;
    return {...m,next:next.toISOString().slice(0,10),days:Math.round((next-today)/86400000)};
  }).filter(m=>m.days<=days).sort((a,b)=>a.days-b.days || a.name.localeCompare(b.name));
}
function openTasks(){return state.followups.filter(f=>f.status!=='Complete').sort((a,b)=>a.due.localeCompare(b.due));}
function metric(label,value,note,symbol,color,target){
  return `<button class="metric card" data-action="go" data-id="${target}"><span class="metric-top"><span class="tile ${color}">${icon(symbol,17)}</span>${label}</span><strong class="metric-value">${value}</strong><span class="metric-note">${note}</span></button>`;
}
function attendanceChart(){
  const cutoff=new Date(state.today+'T12:00:00Z');
  cutoff.setUTCDate(cutoff.getUTCDate()-range*7);
  const data=sorted().filter(a=>a.date>cutoff.toISOString().slice(0,10) && a.date<=state.today).slice(-range);
  if(!data.length) return empty('Record a service to see attendance trends.');
  const upper=Math.max(20,Math.ceil(Math.max(...data.map(count))/20)*20);
  const left=32,right=520,top=11,bottom=137;
  const points=data.map((a,i)=>({x:data.length===1 ? (left+right)/2 : left+14+i*(right-left-28)/(data.length-1),y:bottom-count(a)/upper*(bottom-top),a}));
  const line=points.map(p=>`${p.x},${p.y}`).join(' ');
  return `<div class="chart"><svg viewBox="0 0 534 162" role="img" aria-label="Attendance over time"><defs><linearGradient id="fill" x2="0" y2="1"><stop stop-color="#c4dfcc" stop-opacity=".72"/><stop offset="100%" stop-color="#e9f4ec" stop-opacity=".35"/></linearGradient></defs>${[0,1,2,3,4].map(i=>{const y=bottom-i*(bottom-top)/4;return `<line x1="${left}" x2="${right}" y1="${y}" y2="${y}" stroke="#e7ede7" stroke-dasharray="4 4"/><text x="23" y="${y+4}" text-anchor="end">${upper*i/4}</text>`;}).join('')}${points.length>1?`<polygon points="${points[0].x},${bottom} ${line} ${points.at(-1).x},${bottom}" fill="url(#fill)"/><polyline points="${line}" fill="none" stroke="#367a58" stroke-width="2.5" stroke-linejoin="round"/>`:''}${points.map(({x,y,a},i)=>`<circle cx="${x}" cy="${y}" r="4" fill="white" stroke="#367a58" stroke-width="2"><title>${date(a.date)} · ${count(a)} attendees</title></circle>${data.length<=5 || i%2===0 || i===data.length-1?`<text x="${x}" y="155" text-anchor="middle">${date(a.date)}</text>`:''}`).join('')}</svg><div class="chart-legend"><i></i> Weekly attendance</div></div>`;
}
function birthdayRows(list){
  if(!list.length)return empty('No birthdays in this period.');
  return `<div class="birthday-list">${list.map(m=>`<div class="birthday-row">${avatar(m)}<div>${personLink(m)}<small>${m.days===0?'Today':m.days===1?'Tomorrow':`In ${m.days} days`}</small></div><span class="birthday-date">${date(m.next)}</span></div>`).join('')}</div>`;
}
function followupRows(list){
  if(!list.length)return empty('No follow-ups here.');
  return `<div class="table-wrap"><table><thead><tr><th>Member</th><th>Reason</th><th>Assigned to</th><th>Due date</th><th>Status</th><th aria-label="Actions"></th></tr></thead><tbody>${list.map(f=>{const m=member(f.member);return `<tr><td><div class="person-cell">${avatar(m)}${personLink(m)}</div></td><td>${esc(f.reason)}</td><td>${esc(owner(f.owner))}</td><td>${date(f.due)}</td><td>${pill(status(f))}</td><td><button class="plain-icon" data-action="task" data-id="${esc(f.id)}" aria-label="Edit follow-up">${icon('dots',18)}</button></td></tr>`;}).join('')}</tbody></table></div>`;
}
function dashboard(){
  const past=sorted().filter(a=>a.date<=state.today), last=past.at(-1), prev=past.at(-2), change=count(last)-count(prev);
  const tasks=openTasks(), overdue=tasks.filter(f=>status(f)==='Overdue').length, upcoming=birthdays(30);
  return pageTitle('Good morning, '+state.user.name.split(' ')[0]+'!',"Here’s what’s happening in your church community.",btn('Record Attendance','record','plus','button primary'),`<div class="date-line">${icon('calendar',15)}${date(state.today,{weekday:'long',month:'long',day:'numeric',year:'numeric'})}</div>`)+
  `<div class="stats">${metric('Total Members',state.members.length,`${state.members.filter(m=>m.status==='Active').length} active members`,'users','','members')}${metric('Last Attendance',last?count(last):'—',prev?`<span class="${change>=0?'positive':'warn'}">${icon('trend',14)} ${change>0?'+':''}${change}</span> vs. prior service`:last?date(last.date):'No service recorded','calendar','blue','attendance')}${metric('Open Follow-ups',tasks.length,overdue?`<span class="warn">${overdue} overdue</span>`:'Pastoral care tasks','heart','orange','followups')}${metric('Upcoming Birthdays',upcoming.length,'In the next 30 days','cake','purple','birthdays')}</div>
  <div class="overview"><section class="card"><div class="card-header"><div><h2>Attendance Overview</h2><p>Weekly Sunday service attendance</p></div><select id="range" class="compact-select" aria-label="Attendance date range"><option value="4" ${range===4?'selected':''}>Last 4 weeks</option><option value="8" ${range===8?'selected':''}>Last 8 weeks</option><option value="12" ${range===12?'selected':''}>Last 12 weeks</option></select></div>${attendanceChart()}</section><section class="card"><div class="card-header"><div><h2>Upcoming Birthdays</h2><p>Celebrate your church family</p></div><span class="tile purple">${icon('cake',17)}</span></div>${birthdayRows(upcoming.slice(0,3))}<div class="birthday-footer">${btn('View all birthdays','go','right','button ghost','birthdays')}</div></section></div>
  <section class="card table-card"><div class="card-header"><div><h2>Follow-ups</h2><p>Keep track of members who need your care</p></div>${btn('View all','go','right','button','followups')}</div>${followupRows(tasks.slice(0,4))}</section>`;
}
function memberRows(query='',filter=''){
  const list=[...state.members].filter(m=>(!filter||filter===m.status)&&[m.name,m.email,m.phone].some(v=>v?.toLowerCase().includes(query.toLowerCase()))).sort((a,b)=>a.name.localeCompare(b.name));
  if(!list.length)return empty('No members found.');
  return `<div class="table-wrap"><table><thead><tr><th>Name</th><th>Status</th><th>Birthday</th><th>Assigned to</th><th>Email</th></tr></thead><tbody>${list.map(m=>`<tr><td><div class="person-cell">${avatar(m)}${personLink(m)}</div></td><td>${pill(m.status)}</td><td>${date(m.birthday)}</td><td>${esc(owner(m.owner))}</td><td>${esc(m.email || '—')}</td></tr>`).join('')}</tbody></table></div>`;
}
const pages={
  dashboard,
  members:()=>pageTitle('Members','Browse and manage your church member directory.',btn('Add Member','edit-member','plus','button primary'))+`<section class="card"><div class="toolbar"><label class="search-field">${icon('search',16)}<input id="member-search" placeholder="Search members…" aria-label="Search members"></label><select id="member-filter" class="compact-select" aria-label="Member status"><option value="">All statuses</option>${['Active','New member','Inactive'].map(s=>`<option>${s}</option>`).join('')}</select></div><div id="member-results">${memberRows()}</div></section>`,
  attendance:()=>pageTitle('Attendance','Record and review weekly attendance.',btn('Record Attendance','record','plus','button primary'))+`<section class="card table-card"><div class="card-header"><h2>Service history</h2></div>${state.attendance.length?`<div class="table-wrap"><table><thead><tr><th>Date</th><th>Service</th><th>Present</th><th></th></tr></thead><tbody>${sorted().reverse().map(a=>`<tr><td>${date(a.date,{year:'numeric',month:'short',day:'numeric'})}</td><td>${esc(a.label)}</td><td>${count(a)}</td><td>${btn('Edit','record','','button',a.date)}</td></tr>`).join('')}</tbody></table></div>`:empty('No services have been recorded.')}</section>`,
  followups:()=>pageTitle('Follow-ups','Assign and track pastoral care across your team.',btn('New Follow-up','task','plus','button primary'))+`<section class="card"><div class="toolbar"><label class="check-row"><input id="my-tasks" type="checkbox" ${myTasks?'checked':''}> Assigned to me</label></div>${followupRows([...state.followups].filter(f=>!myTasks||f.owner===state.user.id).sort((a,b)=>Number(a.status==='Complete')-Number(b.status==='Complete') || a.due.localeCompare(b.due)))}</section>`,
  birthdays:()=>pageTitle('Birthdays','See upcoming birthdays for your church members.')+`<section class="card table-card"><div class="card-header"><h2>Next 12 months</h2></div>${birthdayRows(birthdays(365))}</section>`,
  settings:()=>pageTitle('Settings','Manage notifications for your account.')+`<div class="stack settings-grid"><section class="card panel stack"><div><h2>Push notifications</h2><p class="muted">Enable push on each device you want to use. On iPhone or iPad, add ChurchCare to your Home Screen from Safari, then open it there.</p></div><div><button class="button primary" data-action="push-enable">Enable on this device</button> <button class="button" data-action="push-disable">Disable on this device</button></div>${installPrompt?btn('Install ChurchCare','install') : ''}</section><section class="card panel"><h2>Reminder preferences</h2><form id="preferences" class="stack"><div>${[['birthdays','Birthday reminders'],['inactivity','Inactivity alerts'],['followups','Follow-up due dates']].map(([key,label])=>`<label class="check-row"><input type="checkbox" name="${key}" ${state.preferences[key]?'checked':''}> ${label}</label>`).join('')}</div><label class="field">Telegram fallback chat ID<input name="telegram" inputmode="numeric" value="${esc(state.preferences.telegram)}" ${state.telegramAvailable?'':'disabled'} placeholder="${state.telegramAvailable?'Private chat ID':'Telegram is not configured'}"></label><p class="muted">When push delivery fails or no device is subscribed, ChurchCare can send your reminder to a private Telegram chat.</p><div><button class="button primary">Save Preferences</button></div></form></section></div>`
};
function render(){if(state){const key=route();layout(key,pages[key]());document.title=routes[key][0]+' · ChurchCare';}}
async function api(path,method='GET',data){
  const response=await fetch('/api/'+path,{method,headers:data===undefined?{}:{'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)});
  const result=await response.json();
  if(!response.ok)throw Object.assign(Error(result.error),{status:response.status});
  return result;
}
function notify(text){
  const node=document.querySelector('#toast');node.textContent=text;
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>{node.textContent='';},4200);
}
function modal(title,html){
  dialog.innerHTML=`<header class="modal-head"><h2>${esc(title)}</h2><button class="plain-icon" data-action="close" aria-label="Close dialog">${icon('close')}</button></header><div class="modal-body">${html}</div>`;
  if(!dialog.open)dialog.showModal();
}
function form(html,label){
  return `<form id="editor" class="stack">${html}<p class="error" role="alert"></p><div class="modal-actions">${btn('Cancel','close')}<button class="button primary">${label}</button></div></form>`;
}
const field=(label,name,value='',type='text',required=false)=>`<label class="field">${label}<input type="${type}" name="${name}" value="${esc(value)}" ${required?'required':''} ${type==='text'?'maxlength="250"':''}></label>`;
function select(label,name,options,current){
  return `<label class="field">${label}<select name="${name}">${options.map(o=>{const [v,text]=Array.isArray(o)?o:[o,o];return `<option value="${esc(v)}" ${v===current?'selected':''}>${esc(text)}</option>`;}).join('')}</select></label>`;
}
const owners=(current)=>select('Assigned to','owner',[['','Unassigned'],...state.users.map(u=>[u.id,u.name])],current);
let edit;
function editMember(id){
  const m=member(id) || {};
  edit={kind:'member',id};
  modal(id?'Edit Member':'Add Member',form(`<div class="form-grid">${field('Full name','name',m.name,'text',true)}${field('Birthday','birthday',m.birthday,'date')}${field('Email','email',m.email,'email')}${field('Phone','phone',m.phone,'tel')}${select('Status','status',['Active','New member','Inactive'],m.status || 'Active')}${owners(m.owner)}</div>`,'Save Member'));
}
function activity(id){
  const m=member(id);
  if(!m)return;
  const events=[
    ...state.interactions.filter(i=>i.member===id).map(i=>({date:i.date,title:i.type+' · '+owner(i.author),note:i.note})),
    ...state.attendance.filter(a=>a.date>=m.created && a.date<=state.today && a.sample===undefined).map(a=>({date:a.date,title:a.label,note:a.present.includes(id)?'Present':'Absent'})),
    ...state.followups.filter(f=>f.member===id).map(f=>({date:f.due,title:'Follow-up · '+status(f),note:f.reason+' · '+owner(f.owner)})),
  ].sort((a,b)=>b.date.localeCompare(a.date));
  modal(m.name,`<div class="stack"><div class="person-cell">${avatar(m)}${pill(m.status)}</div><p class="muted">Birthday: ${date(m.birthday,{month:'long',day:'numeric',year:'numeric'})}<br>Assigned to: ${esc(owner(m.owner))}${m.email?'<br>'+esc(m.email):''}${m.phone?'<br>'+esc(m.phone):''}</p><div>${btn('Edit Profile','edit-member','','button',id)} ${btn('Log Interaction','interaction','plus','button primary',id)}</div><div><h3>Activity History</h3>${events.length?events.map(e=>`<div class="timeline-item"><strong>${esc(e.title)}</strong><p class="muted">${date(e.date,{month:'short',day:'numeric',year:'numeric'})} · ${esc(e.note)}</p></div>`).join(''):empty('No activity recorded for this member.')}</div></div>`);
}
function record(id){
  const a=state.attendance.find(a=>a.date===id);
  edit={kind:'attendance',id};
  const list=[...state.members].filter(m=>m.status!=='Inactive'||a?.present.includes(m.id)).sort((a,b)=>a.name.localeCompare(b.name));
  modal(a?'Edit Attendance':'Record Attendance',form(`<div class="form-grid">${field('Service date','date',a?.date || state.today,'date',true)}${field('Service name','label',a?.label || 'Sunday Service','text',true)}</div><div><h3>Mark members present</h3><div class="attendance-list">${list.length?list.map(m=>`<label class="check-row"><input type="checkbox" name="present" value="${esc(m.id)}" ${a?.present.includes(m.id)?'checked':''}> ${esc(m.name)}</label>`).join(''):empty('Add members to start taking attendance.')}</div></div>`,'Save Attendance'));
}
function task(id){
  if(!state.members.length){notify('Add a member before creating a follow-up.');return;}
  const f=state.followups.find(f=>f.id===id) || {};
  edit={kind:'task',id};
  modal(id?'Edit Follow-up':'New Follow-up',form(`<div class="form-grid">${select('Member','member',state.members.map(m=>[m.id,m.name]),f.member)}${owners(f.owner || (id?'':state.members[0]?.owner || state.user.id))}${field('Due date','due',f.due || state.today,'date',true)}${select('Status','status',['Open','In progress','Complete'],f.status==='Overdue'?'Open':f.status)}</div><label class="field">Reason<textarea name="reason" required maxlength="1000">${esc(f.reason)}</textarea></label>`,'Save Follow-up'));
}
function interaction(id){
  edit={kind:'interaction',id};
  modal('Log Interaction',form(`<div class="form-grid">${select('Interaction type','type',['Call','Message','Visit','Other'])}${field('Date','date',state.today,'date',true)}</div><label class="field">Pastoral note<textarea name="note" required maxlength="5000" placeholder="What happened, and what should happen next?"></textarea></label>`,'Save Interaction'));
}
async function saveEditor(formNode){
  const fields=new FormData(formNode);
  const values=Object.fromEntries(fields);
  const {kind,id}=edit;
  const data=structuredClone({version:state.version,members:state.members,attendance:state.attendance,followups:state.followups,interactions:state.interactions});
  if(kind==='member'){
    const previous=member(id);
    const entry={id:id||uid(),created:state.today,...previous,...values,name:values.name.trim()};
    if(previous) data.members=data.members.map(m=>m.id===id?entry:m);
    else data.members.push(entry);
  }
  if(kind==='attendance'){
    if(values.date>state.today) throw Error('Choose today or an earlier service date.');
    if(values.date!==id && data.attendance.some(a=>a.date===values.date)) throw Error('Attendance already exists on that date. Open the service to edit it.');
    data.attendance=data.attendance.filter(a=>a.date!==id);
    data.attendance.push({date:values.date,label:values.label,present:fields.getAll('present')});
  }
  if(kind==='task'){
    const entry={...values,id:id||uid()};
    data.followups=data.followups.filter(f=>f.id!==id);
    data.followups.push(entry);
  }
  if(kind==='interaction') data.interactions.push({...values,id:uid(),member:id,author:state.user.id});
  const result=await api('state','PUT',data);
  Object.assign(state,data,result);
  render();
  if(kind==='interaction')activity(id);
  else dialog.close();
  notify('Changes saved.');
}
function profile(){
  modal(state.user.name,`<div class="stack"><p class="muted">Administrator</p>${state.demo?`<form id="switch" class="stack">${select('Demo account','userId',state.users.map(u=>[u.id,u.name]),state.user.id)}<button class="button primary">Switch Account</button></form>`:btn('Sign Out','logout','logout')}${btn('Notification Settings','go','settings','button','settings')}</div>`);
}
function notifications(){
  const f=openTasks().filter(f=>!f.owner||f.owner===state.user.id);
  const b=birthdays(7).filter(m=>!m.owner||m.owner===state.user.id);
  modal('Notifications',`<div class="stack"><div><h3>Upcoming birthdays</h3>${birthdayRows(b)}</div><div><h3>Assigned follow-ups</h3>${f.length?f.slice(0,5).map(a=>`<div class="timeline-item">${btn(member(a.member)?.name || 'Follow-up','task','','button',a.id)} <span class="muted">${date(a.due)}</span></div>`).join(''):empty('No open follow-ups assigned to you.')}</div>${btn('Notification Settings','go','settings','button','settings')}</div>`);
}
async function push(enable){
  if(!('serviceWorker' in navigator) || !('PushManager' in window))throw Error('Push is unavailable in this browser. On iOS, open ChurchCare from your Home Screen.');
  if(enable&&!state.vapid)throw Error('Push needs to be configured on the server first.');
  const registration=await navigator.serviceWorker.getRegistration();
  if(!registration)throw Error('The app is still preparing. Try again in a moment.');
  let subscription=await registration.pushManager.getSubscription();
  if(enable){
    const key=Uint8Array.from(atob(state.vapid.replaceAll('-','+').replaceAll('_','/').padEnd(Math.ceil(state.vapid.length/4)*4,'=')),c=>c.charCodeAt(0));
    if(!subscription)subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key});
    await api('push','PUT',subscription.toJSON());
  }else if(subscription){
    await api('push','DELETE',{endpoint:subscription.endpoint});
    await subscription.unsubscribe();
  }
  notify(enable?'Push enabled on this device.':'Push disabled on this device.');
}
function login(){
  root.innerHTML=`<main class="login"><section class="card stack">${brand()}<h1>Sign in</h1><p class="muted">Sign in with your ChurchCare administrator account.</p><form id="login" class="stack">${field('Email','email','','email',true)}${field('Password','password','','password',true)}<p class="error" role="alert"></p><button class="button primary">Sign In</button></form></section></main>`;
  root.querySelector('[name=email]').autocomplete='username';
  root.querySelector('[name=password]').autocomplete='current-password';
}
async function initialize(){
  try{state=await api('state');render();}
  catch(error){if(error.status===401)login();else root.innerHTML=`<main class="content"><p class="error">${esc(error.message)}</p><button class="button" data-action="refresh">Try Again</button></main>`;}
}
document.addEventListener('click',async event=>{
  const button=event.target.closest('[data-action]');
  if(!button)return;
  const {action,id=''}=button.dataset;
  try{
    if(action==='go'){if(dialog.open)dialog.close();navigate(id);}
    if(action==='menu')root.querySelector('.layout').classList.toggle('nav-open');
    if(action==='close')dialog.close();
    if(action==='record')record(id);
    if(action==='member')activity(id);
    if(action==='edit-member')editMember(id);
    if(action==='task')task(id);
    if(action==='interaction')interaction(id);
    if(action==='profile')profile();
    if(action==='notifications')notifications();
    if(action==='logout'){
      const registration=await navigator.serviceWorker?.getRegistration().catch(()=>null);
      const sub=await registration?.pushManager?.getSubscription().catch(()=>null);
      if(sub)await api('push','DELETE',{endpoint:sub.endpoint});
      await api('logout','POST');dialog.close();state=null;login();
    }
    if(action==='push-enable'||action==='push-disable')await push(action==='push-enable');
    if(action==='refresh')await initialize();
    if(action==='install'&&installPrompt){await installPrompt.prompt();installPrompt=null;render();}
  }catch(error){notify(error.message);}
});
document.addEventListener('submit',async event=>{
  const formNode=event.target;
  if(!['editor','preferences','login','switch'].includes(formNode.id))return;
  event.preventDefault();
  if(busy)return;
  busy=true;
  const submit=formNode.querySelector('button:not([type]),button[type="submit"]');
  if(submit)submit.disabled=true;
  try{
    if(formNode.id==='editor')await saveEditor(formNode);
    if(formNode.id==='login'||formNode.id==='switch'){
      await api('login','POST',Object.fromEntries(new FormData(formNode)));
      if(dialog.open)dialog.close();
      await initialize();
    }
    if(formNode.id==='preferences'){
      const values=new FormData(formNode), preferences={telegram:values.get('telegram')?.trim() || '',birthdays:values.has('birthdays'),inactivity:values.has('inactivity'),followups:values.has('followups')};
      await api('preferences','PUT',preferences);
      state=await api('state');
      render();notify('Preferences saved.');
    }
  }catch(error){
    if(error.status===409) {
      state=await api('state');
      dialog.close();render();notify(error.message);
    }else{
      const message=formNode.querySelector('.error');
      if(message)message.textContent=error.message;
      else notify(error.message);
    }
  }finally{busy=false;if(submit)submit.disabled=false;}
});
function filterMembers(){
  const rows=document.querySelector('#member-results');
  if(rows)rows.innerHTML=memberRows(document.querySelector('#member-search').value,document.querySelector('#member-filter').value);
}
document.addEventListener('input',event=>{if(event.target.id==='member-search')filterMembers();});
document.addEventListener('change',event=>{
  if(event.target.id==='member-filter')filterMembers();
  if(event.target.id==='range'){range=Number(event.target.value);render();}
  if(event.target.id==='my-tasks'){myTasks=event.target.checked;render();}
  if(event.target.name==='member' && edit?.kind==='task' && !edit.id){
    event.target.form.elements.owner.value=member(event.target.value)?.owner || state.user.id;
  }
});
window.addEventListener('hashchange',()=>{render();window.scrollTo(0,0);});
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;if(route()==='settings')render();});
if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});
initialize();
