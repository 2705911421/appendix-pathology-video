import { drawMinimalPatient } from '../../shared/minimalistCharacters.js';
import { fade } from './paint.js';

const portraitScale = 2.35;
const waist = 254;

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
        y: motion.hipY - waist * scale,
        scale,
        breathPhase: motion.t * 4.2, seconds: motion.t,
        ...pose,
      }),
    };
  });
  return portrait;
}
