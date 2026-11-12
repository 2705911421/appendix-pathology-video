import {prepare,base,person,abdomen,pain,thermometer,clinicSign,leader,text,progress} from '../lib_ext/clin_draw.js';
export default {prepare,draw(c,t,T){
 let n=6;for(let i=6;i<=10;i++)if(t>=T.at(i))n=i;
 base(c,n===10?'相似症状需鉴别':'身体信号',n>=9&&n<10?['持续加重，及时就医']:n===7?['肚脐周围','右下腹']:n===8?['恶心、发热','右下腹明显压痛']:[]);
 if(n<8){
  const is6=n===6,lift=is6?progress(t,T,6,.12,.85):0,flush=is6?progress(t,T,6,.15,.8):1;
  if(is6){c.save();c.translate(860,750);c.rotate(.024*lift);c.translate(-860,-750);}
  person(c,{x:860,y:130,scale:1,face:'pain',arm:is6?'reach':'pain',lift});
  if(is6)c.restore();
  const m=n===7?progress(t,T,7,.1,.78):0;
  abdomen(c,1370,440,1.3,m,false,is6?flush:1,is6?flush:(n===7?.55*m:0),n===7?-65*m:0,n===7?98*m:20);
  leader(c,n===7&&m>.8?'右下腹':'肚脐周围',1530,260,1370-84*m,440+127*m);
 }
 if(n===8){
  const step=progress(t,T,8,.05,.42),exam=progress(t,T,8,.42,.62),rec=progress(t,T,8,.55,.82),flush=progress(t,T,8,.45,.82);
  c.save();c.translate(960,750);c.rotate(-.012*rec);c.translate(-960,-750);
  person(c,{x:960,y:130,scale:.98,face:'pain'});
  c.restore();
  person(c,{x:1245-75*step,y:130,scale:.98,doctor:true,arm:exam>.5?'exam':'rest'});
  abdomen(c,1580,435,.95,1,false,1,flush,-65,98);
  const lead=progress(t,T,8,.52,.78);c.save();c.globalAlpha=lead;
  leader(c,'右下腹明显压痛',1390,180,1518,528);c.restore();
  thermometer(c,1760,620,progress(t,T,8,.10,.86));
  c.save();c.globalAlpha=progress(t,T,8,.06,.30);text(c,'恶心',720,265,30,'#A38AB5');c.restore();
  c.save();c.globalAlpha=progress(t,T,8,.46,.72);text(c,'发热',1700,750,30,'#A38AB5');c.restore();
 }
 if(n===9){
  const p=progress(t,T,9,.08,.74);
  person(c,{x:1000+500*p,y:300,scale:.78,face:'pain',arm:'pain'});
  clinicSign(c,1600,150,1);
  person(c,{x:1690,y:300,scale:.78,doctor:true});
 }
 if(n===10){
  // Withdraw the symptom illustration after the possible sources flash.
  c.save();c.globalAlpha=1-.95*progress(t,T,10,.68,.90);
  person(c,{x:865,y:130,scale:1,face:'pain'});
  const q=(t-T.at(10))/(T.end(10)-T.at(10)),cs=[.22,.44,.66],pts=[[1390-58.5,435+84.5],[1390+49.4,435+29.9],[1390,435-84.5]];
  let wash=0,wi=0;const A=cs.map((cv,i)=>{const a=Math.min(1,Math.max(0,1-Math.abs(q-cv)/.17));if(a>wash){wash=a;wi=i;}return a;});
  const loc=[[-45,65],[38,23],[0,-65]][wi];
  abdomen(c,1390,435,1.3,1,'atypical',1,wash,loc[0],loc[1]);
  for(let i=0;i<3;i++)if(A[i]>0)pain(c,pts[i][0],pts[i][1],A[i]*.95);
  leader(c,'相似症状',1580,230,1440,465);
  c.restore();
 }
}};
export const EXIT_S02=10;
