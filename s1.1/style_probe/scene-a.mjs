import { ease, inkLines, organic, pigment, arrow } from '../shared/canvasCore.js';
import { createEveningNotesWithProps } from '../shared/leftFloatNotes.js';
import { drawPatient } from '../shared/charactersAndHistology.js';

const table = 'M1366 707 C1470 699 1597 701 1729 707 C1767 717 1782 733 1750 741 C1618 754 1515 728 1385 738 Q1353 733 1366 707Z';
const noteRed = '#94362F';

export function sceneA() {
  const notes = createEveningNotesWithProps(() => {
    pigment(table, '#B78957', 77, { bleed: 0.15, border: 0.36 });
    pigment(organic(1524, 716, 134, 12, 238), '#947655', 65, { bleed: 0.125 });
  });
  const figure = drawPatient({ id: 'gate-patient', withMeal: true });
  return {
    paint: `${notes.paint}
    ${inkLines(['M1340 717 Q1522 714 1755 717', 'M1385 735 Q1587 743 1737 730',
      'M1514 742 Q1589 739 1648 742'], { color: '#856950', size: 2.7, opacity: 0.6 })}
    ${figure.paint}
    ${inkLines(['M1459 649 C1464 668 1480 696 1506 704 C1533 712 1581 709 1609 699 Q1641 681 1654 649',
      'M1468 658 Q1547 689 1644 659', 'M1503 702 Q1557 714 1606 701',
      'M1458 648 C1447 634 1501 619 1552 619 C1607 618 1661 628 1654 645 C1644 660 1600 669 1550 667 C1508 667 1474 659 1458 648',
      'M1477 643 Q1517 631 1553 632 Q1598 631 1635 642',
      'M1508 641 Q1516 634 1528 640 Q1536 629 1548 636 Q1559 628 1574 637 Q1587 630 1596 641',
      'M1510 646 Q1546 653 1598 643'], { size: 3.5, color: '#604D3D', opacity: 0.85 })}
    <g id="a-steam">${inkLines(['M1504 607 C1519 584 1501 566 1515 544 C1521 533 1535 523 1533 510',
      'M1549 596 C1540 575 1565 558 1568 538 Q1570 522 1559 507',
      'M1584 604 C1600 583 1592 573 1600 559'], { size: 4.2, color: '#9F8876', opacity: 0.57 })}</g>`,
    lettering: `
      ${notes.lettering}
      <g id="a-point-note">
        <text class="note" x="748" y="750" font-size="34" text-anchor="end" fill="${noteRed}">麦氏点</text>
        ${arrow('M762 741 C841 743 933 751 984 700', { color: noteRed, size: 3.05, head: 17 })}
      </g>`,
    caption: [
      { text: '可到了傍晚，这股疼突然“搬了家”，死死钉在了右下腹。', highlights: ['右下腹'] },
      ['By evening, the pain suddenly moved,', 'then locked onto your right lower abdomen.'],
    ],
    update(art, lettering, t) {
      figure.update(art, t / 2.4);
      art.querySelector('#a-steam').setAttribute('transform', `translate(${Math.sin(t * 1.8) * 2} ${-2 * Math.sin(t)})`);
      lettering.querySelector('#a-point-note').setAttribute('opacity', ease((t - 1.6) / 0.72));
    },
  };
}
