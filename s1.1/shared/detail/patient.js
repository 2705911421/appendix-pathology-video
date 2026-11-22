import { RED, cellDot, ease, fillPath, ink, inkLines, lerp, organic, pencil, pigment, scopeSvg, svgId, washLayer } from '../canvasCore.js';

const portrait = {
  pants: 'M932 775 C994 782 1037 788 1080 790 C1140 796 1207 775 1242 771 C1253 810 1262 858 1278 908 L1050 915 L1033 888 L1021 914 L897 912 C905 861 919 813 932 775Z',
  shirt: 'M1063 411 C1022 409 985 418 948 442 C935 476 934 531 920 592 C913 634 932 667 933 707 C934 737 916 780 928 800 C963 823 1025 798 1065 812 C1132 835 1199 806 1258 801 C1253 776 1239 736 1251 692 C1263 622 1292 556 1302 502 C1283 453 1235 428 1182 419 C1163 445 1135 464 1105 460 C1083 456 1069 435 1063 411Z',
  farArm: 'M1293 552 C1312 559 1332 580 1348 609 C1359 628 1368 646 1382 666 C1401 679 1415 678 1433 686 C1447 690 1464 692 1469 698 C1470 704 1458 704 1449 703 C1464 706 1475 710 1471 716 C1468 719 1457 716 1446 715 C1459 719 1463 725 1458 727 C1453 729 1446 725 1433 724 C1424 724 1415 729 1402 723 C1390 718 1375 705 1365 701 C1347 688 1324 671 1307 649 C1295 634 1285 617 1276 605Z',
  farSleeve: 'M1181 419 C1221 420 1273 433 1304 461 C1343 496 1347 546 1355 584 C1343 602 1312 615 1286 619 C1270 603 1252 570 1248 548 C1244 528 1245 509 1235 491Z',
  neck: 'M1069 360 C1080 393 1073 411 1059 420 C1070 442 1088 458 1112 461 C1139 461 1169 437 1183 420 C1157 415 1149 396 1150 366 L1156 333Z',
  face: 'M1014 249 C1016 222 1051 192 1083 188 C1128 181 1166 200 1181 233 C1192 261 1180 287 1165 313 C1155 339 1140 368 1114 388 C1096 404 1079 410 1058 399 C1037 389 1019 370 1016 351 Q1014 343 1012 339 C1004 339 993 338 995 329 C999 319 1007 309 1008 295 C1004 277 1007 260 1014 249Z',
  ear: 'M1145 301 C1150 284 1173 281 1178 297 C1180 312 1158 336 1146 330Z',
  hair: 'M1008 300 C999 292 993 277 994 263 Q983 264 978 275 C977 256 980 244 987 233 L975 237 Q988 210 1001 195 C994 197 987 202 982 207 C990 183 1010 165 1044 152 Q1032 150 1019 155 C1053 134 1086 130 1118 147 Q1106 132 1091 128 C1139 132 1162 146 1178 167 Q1183 157 1181 147 C1214 175 1225 205 1217 234 Q1225 228 1228 218 C1227 249 1206 285 1176 299 C1164 286 1150 296 1144 310 C1144 286 1149 268 1144 255 C1122 252 1101 235 1092 220 C1075 240 1049 249 1018 252 Q1014 276 1008 300Z',
  nearArm: 'M865 607 C871 634 879 663 898 682 C920 704 957 711 980 716 C990 719 1002 725 1012 726 C1027 729 1047 726 1050 722 C1051 718 1046 716 1036 717 C1048 714 1061 710 1059 705 C1057 700 1041 704 1029 706 C1044 701 1062 696 1058 691 C1055 686 1038 691 1023 696 C1034 690 1048 682 1043 678 C1038 673 1022 679 1008 688 C997 694 988 693 979 689 C962 681 936 671 929 657 C921 643 925 623 919 610Z',
  nearSleeve: 'M976 427 C937 426 904 451 884 481 C865 509 854 553 844 597 C850 617 886 632 920 629 C930 617 932 601 938 578 C952 550 965 522 976 496 C986 471 995 450 976 427Z',
};

export const patientHeadArt = Object.freeze({
  face: portrait.face,
  ear: portrait.ear,
  hair: portrait.hair,
});

const bowl = 'M1458 646 C1465 668 1480 697 1506 704 C1534 712 1583 710 1608 699 C1631 688 1645 670 1654 645Z';
const drift = 'M1105 598 C1102 618 1099 644 1080 660 C1059 676 1026 672 1018 696 C1009 717 976 733 954 714 C929 700 955 666 980 656 C1017 641 1041 649 1062 620 C1076 598 1082 578 1105 598Z';

const restingArms = {
  nearArm: 'M867 607 C863 634 850 665 849 697 C848 733 855 767 856 785 C849 799 851 815 856 818 Q862 818 864 812 C867 826 873 824 874 816 C878 822 883 816 882 809 Q892 810 887 802 C886 792 877 781 877 774 C876 747 876 718 880 692 C884 673 903 647 918 626Z',
  farArm: 'M1289 615 C1294 642 1297 673 1297 697 C1296 727 1289 759 1288 781 C1285 790 1279 800 1278 808 Q1279 815 1284 811 Q1288 808 1291 800 C1288 812 1290 823 1295 824 C1300 824 1300 814 1302 807 C1302 820 1306 825 1310 822 Q1314 819 1313 807 C1315 815 1321 817 1323 810 C1325 801 1320 789 1321 780 C1324 756 1331 723 1335 700 C1340 673 1345 623 1350 591Z',
};

function patientDrawing(recovered, withMeal, loweredLeft) {
  const shape = {
    ...portrait,
    nearArm: recovered ? restingArms.nearArm : portrait.nearArm,
    farArm: loweredLeft ? restingArms.farArm : portrait.farArm,
  };
  const underpainting = [
    [shape.pants, '#9E8D72'], [shape.farArm, '#F1D9C1'], [shape.shirt, '#F7ECD6'],
    [shape.farSleeve, '#F3E7CF'], [shape.neck, '#E7C7A8'], [shape.face, '#F4DDC1'],
    [shape.ear, '#F1D2B4'], [shape.hair, '#6D5F55'], [shape.nearSleeve, '#F2E5CC'],
    [shape.nearArm, '#F1D4B8'],
  ].map(([shape, color]) => fillPath(shape, color)).join('');
  const paint = washLayer(8151, () => {
    const crease = { bleed: 0.1, direction: 'in', texture: 0.91, border: 0.63 };
    pigment(shape.pants, '#655747', 95, crease);
    pigment('M924 808 Q975 819 1046 816 Q1108 819 1167 813 C1137 840 1060 826 1038 875 L1034 900 Q1008 896 979 906 C975 861 929 853 924 808Z', '#4D433A', 76, crease);
    pigment(shape.shirt, '#CEA361', 49, { bleed: 0.115, direction: 'in', border: 0.4, angle: 67 });
    pigment('M1190 445 C1228 454 1253 495 1253 527 C1251 580 1223 638 1217 697 C1211 723 1243 771 1253 796 Q1224 798 1178 806 C1186 758 1202 734 1185 692 C1155 622 1190 548 1176 508 C1166 477 1151 468 1190 445Z', '#A37B48', 62, crease);
    pigment('M955 551 C957 611 973 654 963 672 C956 687 939 673 934 656 C927 622 930 580 955 551Z', '#926A45', 92, crease);
    pigment('M931 767 C974 748 1021 780 1071 794 C1139 805 1180 787 1237 774 C1231 803 1209 805 1171 811 C1128 819 1093 820 1065 810 C1011 791 977 811 938 797Z', '#B78448', 100, crease);
    pigment(shape.farSleeve, '#D7AE70', 60, crease);
    pigment('M1321 502 C1331 523 1345 557 1352 585 Q1325 607 1291 614 Q1301 580 1291 552 C1281 523 1308 546 1321 502Z', '#A88351', 105, crease);
    pigment(shape.neck, '#B76F52', 123, { ...crease, bleed: 0.09 });
    pigment(shape.face, '#CD8A66', 50, { ...crease, border: 0.42 });
    pigment('M1154 274 C1159 314 1148 345 1115 375 C1089 401 1072 403 1055 388 C1081 380 1098 359 1104 339 C1111 307 1130 275 1154 274Z', '#BC7C59', 61, { ...crease, bleed: 0.20, border: 0.27 });
    pigment(organic(1071, 334, 33, 14, 92, 0.18, -0.24), '#C56B62', 85, { bleed: 0.32, border: 0.25 });
    pigment(shape.ear, '#C88766', 92, crease);
    pigment(shape.hair, '#282326', 141, { ...crease, bleed: 0.08, direction: 'out', split: 0.38 });
    pigment('M984 239 C1005 178 1079 142 1147 164 C1114 157 1061 174 1046 195 C1019 222 997 226 984 239Z', '#B28D70', 123, { ...crease, bleed: 0.17, border: 0.35 });
    pigment(shape.nearSleeve, '#D3AB6C', 77, crease);
    pigment('M856 577 C875 596 898 602 929 599 L917 626 C893 632 856 615 850 601Z', '#9E784F', 115, crease);
    pigment(shape.nearArm, '#C6835D', 77, crease);
    if (!recovered) pigment('M873 618 Q888 647 906 660 C926 677 964 683 986 700 C951 703 929 696 907 686 C888 676 875 650 873 618Z', '#AC664F', 104, crease);
    pigment(shape.farArm, '#C88F68', 75, crease);
    if (withMeal) {
      pigment(bowl, '#9B8066', 94, { bleed: 0.13, direction: 'in', border: 0.62 });
      pigment('M1482 660 Q1546 675 1629 653 Q1614 685 1586 693 Q1523 711 1482 660Z', '#AD7855', 74, crease);
    }
    pencil('M984 238 C992 182 1083 147 1151 162 Q1197 182 1212 229 Q1171 184 1100 191 Q1040 189 984 238Z',
      'charcoal', '#796454', { distance: 5.8, angle: 24, weight: 0.58 });
    pencil('M1156 339 Q1151 397 1180 419 Q1144 452 1116 453 Q1119 412 1138 380Z',
      'HB', '#A5775E', { distance: 5.2, angle: 46 });
    pencil('M864 569 Q882 594 924 596 L917 623 Q881 625 851 603Z',
      '2B', '#B08B62', { distance: 5.5, angle: 54, weight: 0.48 });
  }, 'multiply');
  const contours = [
    'M970 433 C924 430 902 460 884 485 Q860 531 845 597 Q870 631 919 629',
    'M898 485 Q883 521 887 539', 'M859 574 Q889 593 926 594',
    'M869 619 C881 666 888 687 938 703 Q958 709 982 716',
    'M924 621 C920 645 925 660 947 674 Q966 684 983 691',
    'M981 691 Q997 697 1008 688 Q1033 672 1042 678 Q1050 682 1024 695',
    'M1006 709 Q1044 688 1056 690 Q1066 697 1029 707',
    'M1016 716 Q1051 702 1057 704 Q1066 710 1035 717',
    'M1023 723 Q1048 713 1050 720 Q1053 729 1016 727 Q995 728 983 717',
    'M951 673 Q939 724 934 747 C931 766 913 790 929 800 C972 819 1012 798 1066 811',
    'M1068 811 C1144 832 1206 807 1258 801 C1244 764 1243 737 1250 690 Q1265 618 1271 584',
    'M1061 416 C1024 413 1004 421 974 432',
    'M1063 423 Q1086 479 1124 468 Q1159 458 1190 425',
    'M1055 427 Q1078 484 1125 477 Q1158 471 1178 450',
    'M1181 420 C1269 422 1324 455 1341 531 Q1350 559 1355 585 Q1331 610 1288 619 Q1277 606 1271 588',
    'M1275 588 Q1320 579 1346 560', 'M1249 491 Q1252 532 1266 548',
    'M1287 620 C1300 649 1341 690 1365 701 C1387 714 1391 724 1405 725 Q1416 726 1433 724 Q1455 732 1459 725',
    'M1356 586 Q1361 642 1383 666 C1405 680 1417 681 1439 687 Q1469 692 1469 699 Q1468 704 1448 702',
    'M1426 699 Q1472 704 1471 713 Q1468 720 1445 715 Q1434 713 1427 715',
    'M1056 398 Q1069 405 1061 419', 'M1152 344 C1146 374 1148 402 1182 419',
    'M1008 296 Q1006 314 998 327 Q988 340 1013 340 C1017 366 1035 390 1059 399 Q1083 415 1111 390 Q1141 366 1156 330',
    'M1145 310 C1148 286 1173 282 1178 296 Q1183 310 1156 331',
    'M1008 292 Q995 268 998 245 Q984 249 979 260',
    'M981 239 Q1014 171 1068 163 M1179 168 Q1215 185 1216 226 Q1210 267 1179 289',
    'M1008 255 Q1067 242 1093 220 Q1113 244 1146 255',
    'M929 800 C915 827 914 851 905 873', 'M1248 805 Q1250 841 1262 877',
    'M1069 822 Q1045 842 1035 885',
  ];
  if (loweredLeft) {
    contours.splice(17, 3, restingArms.farArm);
  }
  if (recovered) {
    contours.splice(3, 6, restingArms.nearArm);
  }
  const pressureContours = contours.flatMap(line => line.split(' M').map(d => d.startsWith('M') ? d : 'M' + d));
  const folds = [
    'M978 457 C984 480 977 513 967 537', 'M928 549 Q912 558 906 579',
    'M877 603 Q891 611 911 611', 'M1313 494 Q1326 517 1327 545',
    'M1291 602 Q1328 596 1339 585', 'M972 551 Q956 580 961 609',
    'M1165 522 Q1194 563 1173 608', 'M1184 640 Q1171 679 1186 719',
    'M1158 769 Q1205 773 1235 756', 'M954 780 Q997 766 1038 792',
    'M957 735 C980 735 994 741 1007 750', 'M1084 792 Q1105 801 1147 798',
    'M940 838 Q974 855 1011 854', 'M1179 830 Q1205 839 1229 857',
    'M882 646 Q888 651 889 657', 'M990 702 Q995 705 997 712',
    'M1412 692 Q1416 694 1420 694', 'M1156 302 Q1171 292 1171 305 Q1166 311 1161 312',
    'M1006 332 Q1013 328 1019 330', 'M1034 365 Q1044 368 1054 366',
  ];
  const browsAndEyes = recovered ? [
    'M1011 283 Q1022 278 1034 281', 'M1049 282 Q1067 273 1081 278',
    'M1011 301 Q1022 293 1034 301', 'M1051 302 Q1065 292 1081 302',
    'M1024 339 Q1033 338 1035 334',
    'M1026 349 C1037 357 1051 357 1065 346 Q1057 362 1042 361 Q1033 359 1026 349',
  ] : [
    'M1010 286 Q1023 279 1036 282', 'M1048 284 C1058 285 1070 279 1085 280',
    'M1013 300 Q1022 306 1034 302', 'M1052 302 Q1065 312 1081 306',
    'M1024 340 Q1032 339 1035 335',
    'M1026 354 Q1043 344 1062 353',
  ];
  const hairMarks = [
    'M989 218 Q1006 185 1045 174 Q1084 160 1110 177',
    'M1002 229 Q1020 196 1067 185 Q1098 180 1125 189',
    'M1013 235 C1039 216 1055 210 1096 203 Q1116 201 1135 208',
    'M1097 215 C1114 228 1137 234 1166 231',
    'M1137 165 Q1175 173 1191 206', 'M1160 243 Q1183 250 1201 230',
    'M1188 266 Q1204 252 1210 231', 'M1010 253 Q1003 266 1008 277',
  ];
  const cleanedPaint = `<defs>
    <radialGradient id="a-soft-umber">
      <stop offset=".53" stop-color="#18130E"/>
      <stop offset=".78" stop-color="#18130E" stop-opacity=".62"/>
      <stop offset="1" stop-color="#18130E" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="a-jaw-area"><path d="${shape.face}"/></clipPath>
    <clipPath id="a-shirt-area"><path d="${shape.shirt}"/></clipPath>
    <mask id="a-clean-wash" mask-type="luminance" maskUnits="userSpaceOnUse" x="0" y="0" width="1920" height="1080">
      <rect width="1920" height="1080" fill="white"/>
      <ellipse cx="1126" cy="378" rx="72" ry="56" fill="url(#a-soft-umber)" clip-path="url(#a-jaw-area)"/>
      <ellipse cx="1203" cy="607" rx="111" ry="233" fill="url(#a-soft-umber)" clip-path="url(#a-shirt-area)"/>
    </mask>
  </defs>${paint.replace('<image ', '<image mask="url(#a-clean-wash)" ')}`;
  const bodyFolds = folds.filter((_, i) => !(i === 16 && loweredLeft) && !(recovered && (i === 14 || i === 15)));
  if (loweredLeft) bodyFolds.push('M1297 781 Q1303 777 1310 780', 'M1301 799 Q1304 798 1307 800');
  return underpainting + (withMeal ? fillPath(bowl, '#EFE4CF') : '') + cleanedPaint
    + inkLines(pressureContours, { size: 3.9, color: '#403731', opacity: 0.9 })
    + inkLines(bodyFolds, { size: 2.85, color: '#775D4D', opacity: 0.72 })
    + inkLines(browsAndEyes, { size: 4, color: '#42312B', taperStart: 5, taperEnd: 6 })
    + cellDot(1026, recovered ? 300 : 303, 2.1, 2.65, '#4B382F', 10)
    + cellDot(1067, recovered ? 300 : 307, 2.65, 3.15, '#3C312C', 4)
    + inkLines(hairMarks, { size: 3.6, color: '#A1846C', opacity: 0.66 })
    + inkLines(['M995 231 Q1007 197 1028 191', 'M1026 240 Q1052 233 1078 213', 'M1176 279 Q1194 268 1202 246'],
      { size: 2.7, color: '#302623', opacity: 0.7 });
}

function paintPain() {
  return washLayer(1800, () => {
    pigment(drift, RED, 150, { bleed: 0.245, angle: 115, border: 0.72, texture: 0.95, split: 0.13 });
    pigment(organic(1091, 610, 30, 27, 361, 0.22), '#D7826A', 113, { bleed: 0.2, border: 0.65 });
    pigment(organic(991, 690, 32, 30, 3106, 0.22, -0.56), '#BB2E26', 151, { bleed: 0.2, border: 0.74, split: 0.11 });
    pigment(organic(990, 689, 13, 16, 332, 0.27, -0.4), '#A5352E', 176, { bleed: 0.09, border: 0.79, direction: 'in' });
    pigment(organic(942, 700, 6, 5, 36, 0.35), '#C54C3B', 135, { bleed: 0.3, border: 0.5 });
    pigment(organic(969, 643, 7, 4, 35, 0.38), '#C54C3B', 93, { bleed: 0.28, border: 0.4 });
  });
}

const figures = new Map();
let painWash;

/** x and y are the center of the crown in the 1920×1080 composition. */
export function drawPatient({
  id, x = 1100, y = 128, scale = 1, pose = 'pain', hasBowl, withMeal = false, painProgress = 1,
} = {}) {
  id = svgId('patient', id);
  if (pose !== 'pain' && pose !== 'recovered') throw new RangeError('Unknown patient pose');
  if (![x, y, scale].every(Number.isFinite) || scale <= 0) throw new RangeError('Invalid patient position or scale');
  const meal = Boolean(hasBowl ?? withMeal);
  const recovered = pose === 'recovered';
  const loweredLeft = recovered || !meal;
  const key = pose + Number(meal);
  if (!figures.has(key)) figures.set(key, patientDrawing(recovered, meal, loweredLeft));
  const progressX = value => lerp(1082, 908, ease(value));
  const figure = figures.get(key);
  const pain = pose === 'pain' ? `<defs>
    <linearGradient id="a-reveal"><stop stop-color="black"/><stop offset=".14" stop-color="white"/></linearGradient>
    <mask id="a-pain" maskUnits="userSpaceOnUse" x="900" y="555" width="240" height="205">
      <rect id="a-progress" x="${progressX(painProgress)}" y="555" width="300" height="205" fill="url(#a-reveal)"/>
    </mask>
  </defs><g mask="url(#a-pain)" style="mix-blend-mode:multiply">${painWash ??= paintPain()}</g>
  ${ink('M1083 610 Q1091 616 1098 609', { size: 3.3, color: '#834C41' })}` : '';
  const hangingArms = [
    ...(loweredLeft ? [restingArms.farArm] : []),
    ...(recovered ? [restingArms.nearArm] : []),
  ].map(d => `<path d="${d}" fill="white" stroke="white" stroke-width="7"/>`).join('');
  const drawing = `<defs>
    <linearGradient id="a-fade" gradientUnits="userSpaceOnUse" x1="1070" y1="752" x2="1086" y2="884">
      <stop stop-color="white"/><stop offset=".24" stop-color="white" stop-opacity=".88"/>
      <stop offset=".56" stop-color="white" stop-opacity=".43"/>
      <stop offset=".82" stop-color="white" stop-opacity=".09"/>
      <stop offset="1" stop-color="white" stop-opacity="0"/>
    </linearGradient>
    <mask id="a-edge" mask-type="alpha" maskUnits="userSpaceOnUse" x="0" y="0" width="1920" height="930">
      <rect width="1920" height="930" fill="url(#a-fade)"/>${hangingArms}
    </mask>
  </defs><g mask="url(#a-edge)">${figure}</g>${pain}`;
  const artwork = scopeSvg(drawing, id);
  return {
    paint: x === 1100 && y === 128 && scale === 1 ? artwork
      : `<g transform="translate(${x} ${y}) scale(${scale}) translate(-1100 -128)">${artwork}</g>`,
    update(root, progress) {
      if (pose === 'pain') root.querySelector(`#${id}-a-progress`).setAttribute('x', progressX(progress));
    },
  };
}
