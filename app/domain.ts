export type Attachment={id:string;name:string;type:string};
export type Submission={note:string;link:string;files:Attachment[];at:string;review?:string};
export type Task={id:string;title:string;criteria:string;category:string;points:number;due:string;repeat:string;proof:string;status:string;created:string;submitted?:string;approved?:string;history:Submission[];feedback:string};
export type Reward={id:string;title:string;description:string;emoji:string;cost:number;stock:number;weight:number;active:boolean};
export type RecordItem={id:string;title:string;kind:string;at:string;delta:number;fulfilled:boolean;rewardId?:string};
export type State={ownerName:string;partnerName:string;points:number;earned:number;drawCost:number;blankWeight:number;tasks:Task[];rewards:Reward[];records:RecordItem[]};
export const initialState=(name='主人'):State=>({ownerName:name,partnerName:'小伙伴',points:0,earned:0,drawCost:20,blankWeight:1,tasks:[],rewards:[],records:[]});
export const STATUS:Record<string,string>={pending:'待接受',active:'进行中',submitted:'待验收',revision:'需修改',approved:'已完成',cancelled:'已取消',declined:'未接受'};
export const CATEGORY:Record<string,string>={'生活':'🌷','学习':'📖','运动':'🌿','工作':'💻','其他':'✨'};
export function achievements(s:State){const complete=s.tasks.filter(t=>t.status==='approved').length;const dates=[...new Set(s.tasks.filter(t=>t.approved).map(t=>t.submitted!.slice(0,10)))].sort();let longest=0,run=0,prev=0;for(const d of dates){const n=Date.parse(d)/86400000;run=n===prev+1?run+1:1;prev=n;longest=Math.max(longest,run)}return [
{id:'first',icon:'🌱',title:'小小的开始',description:'第 1 个任务通过验收',value:complete,target:1},
{id:'five',icon:'🎀',title:'说到做到',description:'累计完成 5 个任务',value:complete,target:5},
{id:'twenty',icon:'🏆',title:'任务小能手',description:'累计完成 20 个任务',value:complete,target:20},
{id:'streak',icon:'🔥',title:'三日小坚持',description:'连续 3 天提交的任务通过验收（UTC）',value:longest,target:3},
{id:'earn',icon:'💎',title:'闪闪发光',description:'累计获得 500 积分',value:s.earned,target:500},
{id:'draw',icon:'🍀',title:'好运初体验',description:'第一次参与幸运抽奖',value:s.records.filter(r=>r.kind==='draw').length,target:1},
{id:'redeem',icon:'🎁',title:'快乐已兑换',description:'第一次兑换心仪奖励',value:s.records.filter(r=>r.kind==='redeem').length,target:1}
]}
export function requireCondition(ok:unknown,message:string):asserts ok{if(!ok)throw new Error(message)}
const txt=(v:any,max=1000)=>String(v??'').trim().slice(0,max);
function integer(v:any,min:number,max:number){const n=Number(v);requireCondition(Number.isSafeInteger(n)&&n>=min&&n<=max,`请输入 ${min} 到 ${max} 之间的整数`);return n}
export function mutate(state:State,role:'owner'|'partner',action:string,p:any,now=new Date().toISOString(),random=Math.random){
const s=structuredClone(state);let message='已保存';let prize:string|undefined;const owner=()=>requireCondition(role==='owner','只有发布者可以执行此操作');const partner=()=>requireCondition(role==='partner','只有接任务的人可以执行此操作');
const record=(title:string,kind:string,delta:number,rewardId?:string)=>s.records.unshift({id:crypto.randomUUID(),title,kind,delta,at:now,fulfilled:kind==='approve'||!rewardId,rewardId});
if(action==='createTask'){owner();const title=txt(p.title,80),criteria=txt(p.criteria,2000);requireCondition(title&&criteria,'请填写任务名称和验收标准');requireCondition(s.tasks.length<1000,'任务数量已达到当前空间上限');const proof=['text','file','none'].includes(p.proof)?p.proof:'text';let due=txt(p.due,40);requireCondition(!due||Number.isFinite(Date.parse(due)),'截止时间无效');if(due)due=new Date(due).toISOString();s.tasks.unshift({id:crypto.randomUUID(),title,criteria,category:CATEGORY[p.category]?p.category:'生活',points:integer(p.points,1,10000),due,repeat:['daily','weekly'].includes(p.repeat)?p.repeat:'none',proof,status:'pending',created:now,history:[],feedback:''});message='任务发布啦，等待小伙伴接受';}
else if(['accept','decline','submit','approve','revision','cancel'].includes(action)){const t=s.tasks.find(t=>t.id===p.id);requireCondition(t,'任务不存在');
if(action==='accept'){partner();requireCondition(t.status==='pending','任务状态已改变，请刷新');t.status='active';message='收到！开始完成任务吧';}
if(action==='decline'){partner();requireCondition(t.status==='pending','只能拒绝未接受的任务');t.status='declined';t.feedback=txt(p.note,500)||'暂时无法接受这个任务';message='已告知发布者';}
if(action==='cancel'){owner();requireCondition(['pending','active','revision'].includes(t.status),'当前状态不能取消任务');t.status='cancelled';message='任务已取消';}
if(action==='submit'){partner();requireCondition(['active','revision'].includes(t.status),'请先接受任务');const note=txt(p.note,3000),link=txt(p.link,1000),files=(Array.isArray(p.files)?p.files:[]) as Attachment[];requireCondition(files.length<=3,'最多上传 3 个文件');if(link)requireCondition(/^https?:\/\//i.test(link),'链接须以 https:// 或 http:// 开头');requireCondition(t.proof!=='text'||note||link||files.length,'请填写完成说明或提交凭证');requireCondition(t.proof!=='file'||files.length,'此任务需要上传图片或 PDF 凭证');t.history.push({note,link,files,at:now});t.submitted=now;t.status='submitted';t.feedback='';message='凭证已提交，等主人验收啦';}
if(action==='revision'){owner();requireCondition(t.status==='submitted','此任务当前不在待验收状态');const note=txt(p.note,1000);requireCondition(note,'请写明需要补充或修改的内容');t.feedback=note;t.history[t.history.length-1].review=note;t.status='revision';message='已退回，并保留了修改意见';}
if(action==='approve'){owner();requireCondition(t.status==='submitted','此任务当前不在待验收状态');t.status='approved';t.approved=now;t.history[t.history.length-1].review='验收通过';s.points+=t.points;s.earned+=t.points;record(t.title,'approve',t.points);message=`验收通过！奖励 ${t.points} 积分`;if(t.repeat!=='none'&&s.tasks.length<1000){const days=t.repeat==='daily'?1:7;const next=new Date(Math.max(Date.parse(t.due||now),Date.parse(now))+days*86400000).toISOString();s.tasks.unshift({...t,id:crypto.randomUUID(),status:'pending',created:now,due:next,history:[],submitted:undefined,approved:undefined,feedback:''});}}
}
else if(action==='saveReward'){owner();const title=txt(p.title,60);requireCondition(title,'请填写奖励名称');const r={id:p.id||crypto.randomUUID(),title,description:txt(p.description,500),emoji:txt(p.emoji,8)||'🎁',cost:integer(p.cost,1,100000),stock:integer(p.stock,0,10000),weight:integer(p.weight,0,1000),active:true};if(p.id){const old=s.rewards.findIndex(r=>r.id===p.id);requireCondition(old>=0,'奖励不存在');s.rewards[old]=r;}else{requireCondition(s.rewards.length<100,'最多创建 100 种奖励');s.rewards.push(r);}message='奖励已上架';}
else if(action==='archiveReward'){owner();const r=s.rewards.find(r=>r.id===p.id);requireCondition(r,'奖励不存在');r.active=false;message='奖励已下架，历史记录保留';}
else if(action==='redeem'){partner();const r=s.rewards.find(r=>r.id===p.id&&r.active);requireCondition(r&&r.stock>0,'奖励已兑完或已下架');requireCondition(s.points>=r.cost,'积分还差一点，再完成一个任务吧');s.points-=r.cost;r.stock--;record(r.title,'redeem',-r.cost,r.id);message='奖励兑换成功，等待主人兑现';prize=r.title;}
else if(action==='draw'){partner();const pool=s.rewards.filter(r=>r.active&&r.stock>0&&r.weight>0);requireCondition(pool.length,'奖池还没有可抽取的奖励');requireCondition(s.points>=s.drawCost,'积分不足，先完成任务赚取积分吧');const total=pool.reduce((a,b)=>a+b.weight,s.blankWeight);let pick=random()*total;let selected:Reward|undefined;for(const r of pool){pick-=r.weight;if(pick<0){selected=r;break}}s.points-=s.drawCost;if(selected)selected.stock--;prize=selected?.title||'再接再厉';record(prize,'draw',-s.drawCost,selected?.id);message=selected?'恭喜！你的好运已送达':'这次没中奖，下次好运会来敲门';}
else if(action==='fulfill'){owner();const r=s.records.find(r=>r.id===p.id);requireCondition(r&&r.rewardId&&!r.fulfilled,'这份奖励已兑现或不存在');r.fulfilled=true;message='已标记奖励兑现';}
else if(action==='settings'){owner();s.ownerName=txt(p.ownerName,24)||'主人';s.partnerName=txt(p.partnerName,24)||'小伙伴';s.drawCost=integer(p.drawCost,1,10000);s.blankWeight=integer(p.blankWeight,0,1000);message='空间设置已保存';}
else throw new Error('不支持的操作');
const before=new Set(achievements(state).filter(a=>a.value>=a.target).map(a=>a.id));const unlocked=achievements(s).filter(a=>a.value>=a.target&&!before.has(a.id)).map(a=>a.title);return {state:s,result:{message,prize,unlocked}};
}
