// Shared atmosphere ONLY: never colour-grade tissue or change the audio clock.
// moodAt(t,T): paper/grid + short screen-space shake; all anchors follow measured sentences.
// mini: paper is global already. Export ch.shake(t,T) using burstShake for your 04/06 peaks.
import { C } from './tokens.js';
import { clamp, lerp, ease, seg, rng } from './motion.js';
const rgb = h => [1,3,5].map(i => parseInt(h.slice(i,i+2),16));
const blend = (a,b,k) => a.map((v,i)=>lerp(v,b[i],k));
const css = a => `rgb(${a.map(Math.round).join(',')})`;
const P=rgb(C.paper), INK=rgb(C.ink), RED=rgb(C.red);
// Cooler = desaturate the warm stock toward the SAME ink-neutral, not a new blue hue.
const stock = ({cool=0,dark=0,red=0,bright=0}={}) => {
  const neutral=P.reduce((a,b)=>a+b,0)/3;
  return blend(blend(blend(blend(P,[neutral,neutral,neutral],cool),INK,dark),RED,red),[255,255,255],bright);
};
// mood_v2: paper changes are SUBTLE and contextual (cool-neutral while worried, plain stock while explaining,
// slightly lifted at the close). No red/flash tint on the paper any more — accents live on local objects
// (e.g. the lens rim in 04). The microscope's dark surround is NOT a paper mood: see lib/scope.js.
const PAPER=stock(), UNEASY=stock({cool:.45,dark:.02}), QUESTION=stock({cool:.5,dark:.045});
const ALERT=stock({cool:.55,dark:.06}), CLOSE=stock({bright:.12});
/** Ambient clock with a real plateau, continuous before AND after the hold. Do not use for VO/subtitles. */
export const holdAfter=(t,peak,dur=.4)=>t-clamp(t-peak,0,dur);
/** A bounded, deterministic 2–6-frame impulse. Zero outside the interval; units are SCREEN px. */
export function burstShake(t,peak,{fps=30,frames=3,amp=3,seed=901}={}) {
  frames=Math.max(2,Math.min(6,Math.round(frames))); amp=Math.min(4,Math.max(0,amp));
  const n=Math.floor((t-peak)*fps+1e-6);
  if(n<0||n>=frames)return {dx:0,dy:0};
  const r=rng(seed+Math.floor(t*fps+1e-6)*7919), env=1-.45*n/frames;
  return {dx:(r()*2-1)*amp*env,dy:(r()*2-1)*amp*env};
}
export function moodAt(t,T) {
  const at=(i,o=0)=>T.at(i,o), end=(i,o=0)=>T.end(i,o), f=(i,k)=>T.frac(i,k);
  const keys=[
    [at(0),UNEASY,.92],[at(3),UNEASY,.95],[end(3),PAPER,1],
    [at(6,-.15),PAPER,1],[at(6,.45),QUESTION,.92],[at(7),QUESTION,.92],[at(15),PAPER,1],
    [at(27,-.2),PAPER,1],[at(27,.3),ALERT,.95],[end(27),ALERT,.95],[at(28,.6),PAPER,1],
    [end(31,-.5),PAPER,1],[end(31,1.5),CLOSE,.9],[T.DUR_CONTENT+12,CLOSE,.9]
  ];
  let paper=keys[0][1],gridAlpha=keys[0][2];
  for(let i=1;i<keys.length;i++){
    const a=keys[i-1],b=keys[i];
    if(t<=b[0]){const k=ease.inOutCubic(seg(t,a[0],b[0]));paper=blend(a[1],b[1],k);gridAlpha=lerp(a[2],b[2],k);break;}
    paper=b[1];gridAlpha=b[2];
  }
  const move=at(2), pin=f(2,.66), diagnosis=at(3)+.16, verdict=at(9)+.58;
  const redSpike=t>=move&&t<move+.25?Math.exp(-(t-move)/.085):0;
  // Shared perforation accent follows EXACTLY mini's local shake anchor (sentence 13, fraction .76).
  const perforation=T.frac(13,.76), pd=t-perforation;
  const flashRed=pd>=0&&pd<.20?Math.sin(Math.PI*pd/.20):0;
  // 01: only ONE short camera jolt at the pain shift; the needle-like pain is now carried by the body tremor (01.js).
  const a=burstShake(t,move,{frames:3,amp:3.0}), b={dx:0,dy:0};
  const holds=[[move+.24,.3],[diagnosis,.3],[verdict,.45],[at(28),.6],[end(31,-.5),.5]];
  let ambientTime=t,held=false;
  for(const [p,d] of holds){ambientTime-=clamp(t-p,0,d);if(t>=p&&t<p+d)held=true;}
  let speedHint=t<at(1)?.12:t<at(2)?.02:t<at(3)?1.0:t<at(4)?.18:t<at(6)?.16:t<at(7)?.35:t<at(8)?.6:t<at(9)?1.4:t<at(10)?.08:1;
  if(t>=at(28))speedHint=t<at(29)?.015:t<at(30)?.12:t<at(31)?.06:t<end(31,-.5)?.1:0;
  if(held)speedHint=0;
  const tint={vermilion:Math.max(redSpike,flashRed),flashRed,heFlash:t>=at(9)&&t<at(9)+.12?1-(t-at(9))/.12:0};
  return {paper:css(paper),gridAlpha,tint,shake:{dx:a.dx+b.dx,dy:a.dy+b.dy},contrast:1,speedHint,ambientTime,held};
}
