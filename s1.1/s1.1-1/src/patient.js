import { drawMinimalPatient, drawSeatedMeal, PORTRAIT_LAYER } from '../../shared/minimalistCharacters.js';
import { fade } from './paint.js';

const portraitScale = 1.81;

export function drawPinnedMeal(ctx, motion) {
  return drawSeatedMeal(ctx, { x: 960, y: 735 - PORTRAIT_LAYER.waist * portraitScale,
    scale: portraitScale, opacity: motion.patientPose.hasBowl ?? 0, seconds: motion.t });
}

export function drawOpeningPatient(ctx, motion, view) {
  let portrait;
  fade(ctx, motion.patientOpacity, () => {
    const scale = portraitScale * motion.portraitScale / view.scale;
    const pose = motion.patientPose;
    portrait = {
      cx: motion.portraitX,
      ...pose,
      ...drawMinimalPatient(ctx, {
        x: view.worldX(motion.portraitX),
        y: motion.hipY - PORTRAIT_LAYER.waist * scale,
        scale,
        breathPhase: motion.t * 4.2, seconds: motion.t,
        ...pose,
        paintMeal: false,
      }),
    };
  });
  return portrait;
}
