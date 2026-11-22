// hasBowl controls the patient's left arm and meal prop; withMeal remains a legacy alias.
export { drawPatient } from './detail/patient.js';
// Canvas portrait for the opening, with two hand-authored abdominal-pain poses.
export { drawPatientRig } from './detail/patientRig.js';
export { drawDoctor } from './detail/doctor.js';
export {
  EOSIN, ERYTHROCYTE, HEMATOXYLIN, VASCULAR_NUCLEUS, stainedNeutrophil,
  vascularNeutrophil, createDiapedesisCell,
} from './detail/cells.js';
export {
  EXTRAVASATION, createInflammationField, epithelium as drawColumnarEpithelium,
  vessel as drawVascularEndothelium, fibrin as drawFibrinAndPus,
  columnarCell, endothelialCell, redBloodCells,
} from './detail/inflammation.js';
export {
  HE_LENS, createHistologyLens, crypts as drawAppendicealCrypts, connectiveAndMuscle as drawConnectiveTissueAndMuscle,
} from './detail/histologyLens.js';
export { CT, drawAxialCT } from './detail/ct.js';
