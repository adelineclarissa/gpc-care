export const demo = {
  users: [{id:'grace',name:'Grace Wilson'}, {id:'daniel',name:'Daniel Brooks'}, {id:'sarah',name:'Sarah Mitchell'}],
  members: [
    ['olivia','Olivia Bennett','1988-11-21','Active','grace','#efe6fa','#745396'],
    ['james','James Walker','1991-11-24','Active','daniel','#e1eee7','#32775d'],
    ['sophia','Sophia Chen','1995-11-27','New member','sarah','#faecde','#a55c38'],
    ['michael','Michael Thompson','1985-06-12','Active','grace','#e3edfa','#4e6a9a'],
    ['emily','Emily Rodriguez','1990-04-03','New member','sarah','#fae7e8','#a84f61'],
    ['robert','Robert Hayes','1966-02-15','Active','daniel','#e1eee7','#32775d'],
    ['ava','Ava Johnson','1998-10-23','Active','grace','#efe6fa','#745396'],
    ['noah','Noah Williams','1996-09-14','Active','sarah','#e3edfa','#4e6a9a'],
  ].map(([id,name,birthday,status,owner,bg,ink])=>({id,name,birthday,status,owner,bg,ink,email:name.toLowerCase().replace(' ','.')+'@example.com',phone:'',created:'2026-09-01'})),
  attendance: [
    {date:'2026-10-25',label:'Sunday Service',present:[],sample:58},
    {date:'2026-11-01',label:'Sunday Service',present:[],sample:66},
    {date:'2026-11-08',label:'Sunday Service',present:[],sample:65},
    {date:'2026-11-15',label:'Sunday Service',present:['olivia','james','sophia','ava','noah'],sample:72}
  ],
  followups: [
    {id:'f1',member:'michael',reason:'Missed 3 Sundays',owner:'grace',due:'2026-11-18',status:'Open'},
    {id:'f2',member:'emily',reason:'New member welcome',owner:'sarah',due:'2026-11-21',status:'Open'},
    {id:'f3',member:'robert',reason:'Pastoral check-in',owner:'daniel',due:'2026-11-24',status:'In progress'},
  ],
  interactions: [], preferences: {}, subscriptions: {}, alerts: {},
};
const givenNames = ['Emma','Liam','Isabella','Ethan','Mia','Elijah','Charlotte','Lucas','Amelia','Mason'];
const familyNames = ['Reed','Morgan','Baker','Rivera','Parker','Ellis','Sullivan'];
for (const first of givenNames) {
  for (const last of familyNames) {
    const name = first + ' ' + last;
    demo.members.push({id:name.toLowerCase().replace(' ','-'),name,birthday:'',status:'Active',owner:'',email:'',phone:'',created:'2026-09-01'});
  }
}
for(const service of demo.attendance){
  const present = new Set([...service.present,'olivia','james','sophia','ava','noah']);
  for(const entry of demo.members.slice(8)){
    if(present.size>=service.sample) break;
    present.add(entry.id);
  }
  service.present=[...present];
  delete service.sample;
}
export const empty = {members:[],attendance:[],followups:[],interactions:[],preferences:{},subscriptions:{},alerts:{}};
