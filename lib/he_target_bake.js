import {C} from './tokens.js';
export function bakeTargetGangrene(bake){
    for (let i = 0; i < 4; i++) {
      const wash = bake(`c04.necro.${i}`, (b, P) => {
        P.fill(b, P.blob(0, 0, 290 + i * 13, 36, .38, 460 + i), i % 2 ? '#E3B7C4' : '#D7A3B3', 78 + i * 8, .42, [.65, .55]);
        P.fill(b, P.blob(45, -25, 195, 32, .45, 470 + i), '#E7C9D2', 52, .5);
      }, { seed: 460 + i, hd: true, soft: true, grain: .12, edge: .3, bleed: .5 });
      // Soften pigment boundaries once in the cached watercolour bitmap.
      const soft = document.createElement('canvas'); soft.width = wash.width; soft.height = wash.height;
      const sc = soft.getContext('2d'); sc.filter = 'blur(15px)'; sc.drawImage(wash, 0, 0);
      const wc = wash.getContext('2d'); wc.clearRect(0, 0, wash.width, wash.height);
      wc.drawImage(soft, 0, 0);
    }
    bake('c04.thromb', (b, P) => { P.fill(b, P.blob(0, 0, 300, 22, .2, 43), '#3A1F2A', 200, .15); }, { seed: 43, hd: true, soft: true, grain: .12, edge: .3, bleed: .5 });
    bake('c04.heme', (b, P) => {
      P.fill(b, P.blob(0, 0, 260, 28, .5, 481), '#8E3A3E', 188, .5, [.55, .48]);
      P.fill(b, P.blob(-48, 30, 170, 22, .55, 482), '#A8404E', 168, .46, [.5, .45]);
      P.fill(b, P.blob(42, -26, 140, 20, .52, 483), '#9A3E48', 150, .42);
      P.fill(b, P.blob(8, 4, 80, 14, .48, 484), '#7A3038', 120, .38);
    }, { seed: 481, hd: true, soft: true, grain: .12, edge: .3, bleed: .5 });
    bake('c04.leak', (b, P) => { P.fill(b, P.blob(0, 0, 330, 26, .5, 44), C.pus, 170, .3, [.6, .5]); }, { seed: 44, hd: true, soft: true, grain: .12, edge: .3, bleed: .5 });
    bake('c04.mark', (b, P) => { P.fill(b, P.blob(0, 0, 360, 26, .3, 45), C.red, 110, .3); }, { seed: 45, hd: true, soft: true, grain: .12, edge: .3, bleed: .5 });
    // scaleBrushes multiplies. Three extra necro bakes plus heme leave 05/06 at 2.4^4.
    // Put the weight back; this canvas is never drawn.
    bake('c04.brushScale', (b) => { const u = 1 / 2.4; b.scaleBrushes(u); b.scaleBrushes(u); b.scaleBrushes(u); b.scaleBrushes(u); }, { scale: 1, seed: 46 });

}
