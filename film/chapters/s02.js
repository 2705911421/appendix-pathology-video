import {prepare,base,person,abdomen,pain,thermometer,hospital,leader,text,progress} from '../lib_ext/clin_draw.js';
export default {prepare,draw(c,t,T){
 let n=6;for(let i=6;i<=10;i++)if(t>=T.at(i))n=i;
 base(c,n===10?'相似症状需鉴别':'身体信号',n>=9&&n<10?['持续加重，及时就医']:n===7?['肚脐周围','右下腹']:n===8?['恶心、发热','右下腹明显压痛']:[]);
 if(n<8){person(c,{x:860,y:130,scale:1,face:'pain',arm:'pain'});abdomen(c,1370,440,1.3,n===7?progress(t,T,7,.1,.78):0);leader(c,n===7&&progress(t,T,7,.1,.78)>.8?'右下腹':'肚脐周围',1530,260,1370-84*(n===7?progress(t,T,7,.1,.78):0),440+127*(n===7?progress(t,T,7,.1,.78):0));}
 if(n===8){person(c,{x:960,y:130,scale:.98,face:'pain'});person(c,{x:1170,y:130,scale:.98,doctor:true,arm:'exam'});abdomen(c,1580,435,.85,1);leader(c,'右下腹明显压痛',1390,180,1525,518);thermometer(c,1760,620);text(c,'发热',1700,750,30,'#A38AB5');text(c,'恶心',720,265,30,'#A38AB5');}
 if(n===9){person(c,{x:1040+80*progress(t,T,9,.1,.7),y:130,scale:1,face:'pain',arm:'pain'});hospital(c,1510,375,1.6);person(c,{x:1610,y:435,scale:.47,doctor:true});}
 if(n===10){person(c,{x:865,y:130,scale:1,face:'pain'});abdomen(c,1390,435,1.3,1,true);leader(c,'相似症状',1580,230,1440,465);}
}};
export const EXIT_S02=10;
