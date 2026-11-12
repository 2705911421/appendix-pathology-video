import {paper,text,drawCTStatic,drawCTChanges,drawTissueStatic,drawTissueChanges,drawFocus,drawConnector,labelTo,tissueFocus,ramp,appendixRadii} from './ct_schematic.js';

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
    t('周围渗出明显',294,39,'#2A2A35');
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
      this._tf=tissueFocus(TI.x,TI.y,TI.w,TI.h);
    },
    draw(c,t,T){
      paper(c);
      const intro=ramp(t,0);
      const aNext=ramp(t,T.at(last));
      const aFat=stage===1?aNext:0;
      const aExud=stage===2?aNext:0;
      const aGas=stage===3?aNext:0;
      const aDefect=stage===3?ramp(t,0):0;

      c.save();c.globalAlpha=intro;c.drawImage(base,0,0);c.restore();

      c.save();c.globalAlpha=intro;
      drawCTChanges(c,g,{stage,aFat,aExud,aDefect,aGas,aAbscess:aGas,aEnh:stage===2?1:0});
      drawTissueChanges(c,tg,{stage,aExud,aDefect:stage===3?aGas:0});
      c.restore();

      c.save();c.globalAlpha=intro;sidebar(c,stage,1,aNext);c.restore();

      const ar=g.lens.r*(stage===1?.52:.63);
      const {outer}=appendixRadii(g,stage);
      drawFocus(c,g.appendix.x,g.appendix.y,outer*2.15,intro*.62,[5,5],1.2,LAV);
      const grow=stage===1?aFat:stage===2?aExud:aGas;
      const rr=ar*(0.98+0.42*grow);
      drawFocus(c,g.lens.x,g.lens.y,rr,intro*.95,[8,7],2,LAV);
      if(stage===3){
        const ux=g.lens.x+ar*.18,uy=g.lens.y-ar*.10,da=-.87;
        drawFocus(c,ux+Math.cos(da)*ar*.44,uy+Math.sin(da)*ar*.44,ar*.30,intro*.85*(1-aGas),[5,5],1.6,'#E2D3EC');
      }
      drawFocus(c,this._tf.x,this._tf.y,48,intro*.85,[8,7],2,'#A88DBD');
      drawConnector(c,g.lens.x+g.lens.r-4,g.lens.y,this._tf.x-54,this._tf.y,intro*.38);

      const lx=g.lens.x,ly=g.lens.y;
      if(stage===1){
        labelTo(c,'壁增厚',744,812,lx-ar*.95,ly-ar*.30,{color:LAV,alpha:intro*1});
        labelTo(c,'周围脂肪轻度模糊',744,858,lx-ar*1.55,ly-ar*1.02,{color:LAV,alpha:intro*aFat});
      }else if(stage===2){
        labelTo(c,'壁增厚强化',744,812,lx-ar*.95,ly-ar*.30,{color:LAV,alpha:intro});
        labelTo(c,'周围渗出明显',744,858,lx-ar*1.55,ly-ar*1.02,{color:LAV,alpha:intro*aExud});
      }else{
        const ux=lx+ar*.18,uy=ly-ar*.10;
        labelTo(c,'壁强化缺损',744,812,ux+Math.cos(-.87)*ar*.44,uy+Math.sin(-.87)*ar*.44,{color:LAV,alpha:intro});
        labelTo(c,'腔外气体、脓肿',744,858,lx-ar*.10,ly+ar*1.02,{color:LAV,alpha:intro*aGas});
      }

      const tf=this._tf;
      const tlabel=stage===1?'壁水肿':stage===2?'全层炎症':'壁病变';
      labelTo(c,tlabel,TI.x+24,TI.y+48,tf.x,tf.y,{color:'#8E74A8',alpha:intro*1,size:28});
    }
  };
}
