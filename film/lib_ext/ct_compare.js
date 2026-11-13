import {paper,text,drawCTStatic,drawCTChanges,drawTissueStatic,drawTissueChanges,drawFocus,drawTissueMark,drawConnector,labelTo,ramp,appendixRadii} from './ct_schematic.js';

const CT={x:560,y:66,w:742,h:836};
const TI={x:1326,y:66,w:524,h:836};
const LAV='#C9B7DA', PUR='#6B4C9A';

function sidebar(c,stage,alpha,second){
  const t=(s,y,size,color,weight=500,a=1)=>text(c,s,70,y,size,color,weight,alpha*a);
  if(stage===1){
    t('CT与组织变化对应',200,42,PUR,700);
    t('管径增粗',300,36,'#2A2A35');
    t('壁增厚',372,36,'#2A2A35');
    t('周围脂肪轻度模糊',448,36,'#2A2A35',500,second);
  }else if(stage===2){
    t('壁增厚强化',210,44,PUR,700);
    t('周围渗出明显',294,39,'#2A2A35',500,second);
  }else{
    t('壁强化缺损：',190,42,PUR,700);
    t('警惕坏死',260,38,'#2A2A35');
    t('腔外气体、脓肿：',380,38,PUR,700,second);
    t('警惕穿孔 [3]',450,38,'#2A2A35',500,second);
  }
}

export function compareScene(first,last,stage){
  let base=null,g=null,tg=null;
  return {
    prepare(){
      base=document.createElement('canvas');base.width=1920;base.height=1080;
      const b=base.getContext('2d');
      g=drawCTStatic(b,CT.x,CT.y,CT.w,CT.h,{stage,lens:true});
      tg=drawTissueStatic(b,TI.x,TI.y,TI.w,TI.h,{stage});
    },
    draw(c,t,T){
      paper(c);
      const intro=ramp(t,0);
      const aNext=ramp(t,T.at(last));
      // Stage 2: wall first, surrounding exudate in the second half of sentence 47, correspondence frame on sentence 48.
      const aExud=stage===2?ramp(t,T.frac(first,.42)):0;
      const aFat=stage===1?aNext:0;
      const aGas=stage===3?aNext:0;
      const aLink=stage===2?aNext:0;

      c.save();c.globalAlpha=intro;c.drawImage(base,0,0);c.restore();

      c.save();c.globalAlpha=intro;
      drawCTChanges(c,g,{stage,aFat,aExud,aDefect:stage===3?intro:0,aGas,aAbscess:aGas,aEnh:stage===2?1:0});
      drawTissueChanges(c,tg,{stage,aExud,aDefect:stage===3?aGas:0});
      c.restore();

      c.save();c.globalAlpha=intro;sidebar(c,stage,1,stage===2?aExud:aNext);c.restore();

      const ar=g.lens.r*(stage===1?.52:.63);
      const {outer}=appendixRadii(g,stage);
      drawFocus(c,g.appendix.x,g.appendix.y,outer*2.15,intro*.62,[5,5],1.2,LAV);
      const grow=stage===1?aFat:stage===2?aLink:aGas;
      const rr=ar*(0.92+0.58*grow);
      drawFocus(c,g.lens.x,g.lens.y,rr,intro*.95,[8,7],2,LAV);
      if(stage===2)drawFocus(c,g.lens.x,g.lens.y,ar*.70,intro*aLink*.9,[5,4],1.5,LAV);
      if(stage===3){
        const ux=g.lens.x+ar*.18,uy=g.lens.y-ar*.10,da=-.87;
        drawFocus(c,ux+Math.cos(da)*ar*.44,uy+Math.sin(da)*ar*.44,ar*.30,intro*.85*(1-aGas),[5,5],1.6,'#E2D3EC');
      }

      const kind=stage===3?'necrosis':stage===2?'wall':'edema';
      const mark=drawTissueMark(c,TI.x,TI.y,TI.w,TI.h,kind,intro*.95);
      const fatMark=stage===1?drawTissueMark(c,TI.x,TI.y,TI.w,TI.h,'fat',intro*aFat):null;
      const serosa=stage===2?drawTissueMark(c,TI.x,TI.y,TI.w,TI.h,'serosa',intro*Math.max(aExud,aLink)):null;

      const lx=g.lens.x,ly=g.lens.y;
      const wallPt={x:lx+Math.cos(-.35)*ar*.78,y:ly+Math.sin(-.35)*ar*.78};
      const fatPt={x:lx+Math.cos(-1.05)*ar*1.22,y:ly+Math.sin(-1.05)*ar*1.22};
      const pin=(pt,a)=>drawFocus(c,pt.x,pt.y,32,a,[6,5],1.6,'#A88DBD');
      if(mark){pin(mark,intro*.9);drawConnector(c,wallPt.x,wallPt.y,mark.x,mark.y,intro*.62);}
      if(fatMark){pin(fatMark,intro*aFat*.9);drawConnector(c,fatPt.x,fatPt.y,fatMark.x,fatMark.y,intro*aFat*.7);}
      if(serosa){pin(serosa,intro*Math.max(aExud,aLink)*.9);drawConnector(c,fatPt.x,fatPt.y,serosa.x,serosa.y,intro*Math.max(aExud,aLink)*.65);}

      if(stage===1){
        labelTo(c,'壁增厚',744,812,lx-ar*.95,ly-ar*.30,{color:LAV,alpha:intro});
        labelTo(c,'周围脂肪轻度模糊',744,858,lx-ar*1.55,ly-ar*1.02,{color:LAV,alpha:intro*aFat});
      }else if(stage===2){
        labelTo(c,'壁增厚强化',744,812,lx-ar*.95,ly-ar*.30,{color:LAV,alpha:intro});
        labelTo(c,'周围渗出明显',744,858,lx-ar*1.55,ly-ar*1.02,{color:LAV,alpha:intro*aExud});
      }else{
        const ux=lx+ar*.18,uy=ly-ar*.10;
        labelTo(c,'壁强化缺损',744,812,ux+Math.cos(-.87)*ar*.44,uy+Math.sin(-.87)*ar*.44,{color:LAV,alpha:intro});
        labelTo(c,'腔外气体、脓肿',744,858,lx-ar*.10,ly+ar*1.02,{color:LAV,alpha:intro*aGas});
      }

      const tlabel=stage===1?'壁水肿':stage===2?'全层炎症':'壁病变';
      if(mark)labelTo(c,tlabel,TI.x+24,TI.y+48,mark.x,mark.y,{color:'#8E74A8',alpha:intro,size:28});
    }
  };
}
