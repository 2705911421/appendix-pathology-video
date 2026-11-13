import {loadCT,realCT,mark} from '../lib_ext/ct_real_adv01_images.js';
import {paper,text,labelTo,ramp} from '../lib_ext/ct_r3_schematic.js';
import {doctor,choice,evidenceBase} from '../lib_ext/ct_r3_clinical.js';

const PUR='#6B4C9A', INK='#2A2A35';
const CT={x:610,y:92,w:1260,h:838};
const CT_SMALL={x:1040,y:170,w:470,h:540};

export default {
  async prepare(){
    this.clinic=document.createElement('canvas');this.clinic.width=1920;this.clinic.height=1080;
    doctor(this.clinic.getContext('2d'),1010,408,1.55);

    this.ct=document.createElement('canvas');this.ct.width=1920;this.ct.height=1080;
    this.image=await loadCT(0);this.g=realCT(this.ct.getContext('2d'),this.image,0,CT,'197373');

    this.evidence=document.createElement('canvas');this.evidence.width=1920;this.evidence.height=1080;
    const e=this.evidence.getContext('2d');
    evidenceBase(e);
    realCT(e,this.image,0,CT_SMALL,'197373');
  },
  draw(c,t,T){
    paper(c);
    const n=[14,15,16,17,18,19].filter(k=>t>=T.at(k)).at(-1)||14;
    const fade=(id,f=0)=>ramp(t,T.frac(id,f),Math.max(.01,T.frac(id,Math.min(1,f+.15))-T.frac(id,f)));
    const a15=fade(15);
    const a16=fade(16);
    const a18=fade(18);
    const a19=fade(19);
    const intro=fade(14);

    if(n<=15){
      c.save();c.globalAlpha=intro;c.drawImage(this.clinic,0,0);c.restore();
      c.save();c.globalAlpha=intro;
      text(c,'CT是辅助工具',70,245,44,PUR,700);
      if(n>=15)text(c,'并非人人必须',70,325,42,INK,500,a15);
      labelTo(c,'医生评估',640,792,868,704,{color:PUR,alpha:intro,size:40,weight:700});
      c.restore();
      choice(c,a15*intro);
      return;
    }

    if(n<=17){
      if(t<T.frac(16,.15)){
        c.save();c.globalAlpha=1-a16;c.drawImage(this.clinic,0,0);c.restore();
      }
      c.save();c.globalAlpha=a16;c.drawImage(this.ct,0,0);c.restore();
      c.save();c.globalAlpha=a16;
      text(c,'增强螺旋CT',70,205,43,PUR,700);
      text(c,'2023',70,300,40,INK,500);
      text(c,'8项研究',70,380,40,INK,500,fade(16,.08));
      text(c,'1602人',70,460,40,INK,500,fade(16,.42));
      text(c,'敏感度95%',70,555,40,INK,500,fade(17));
      text(c,'特异度94%',70,630,40,INK,500,fade(17,.40));
      text(c,'[1]',70,710,30,PUR,500,fade(17,.55));
      c.restore();
      return;
    }

    if(n===18){
      c.drawImage(this.ct,0,0);
      c.save();c.globalAlpha=a18;
      text(c,'发现病变',70,245,44,PUR,700);
      c.restore();
      mark(c,this.g,[168,240],20,'发现病变',a18);
      return;
    }

    // 19: CT window gives way to the clinical/imaging/pathology evidence relation
    if(t<T.frac(19,.15)){c.save();c.globalAlpha=1-a19;c.drawImage(this.ct,0,0);c.restore();}
    c.save();c.globalAlpha=a19;c.drawImage(this.evidence,0,0);c.restore();
    c.save();c.globalAlpha=a19;
    text(c,'仍需结合临床',70,240,43,PUR,700);
    text(c,'判断病情轻重',70,320,40,INK,500);
    c.restore();
  }
};
