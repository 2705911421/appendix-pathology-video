// 核验后的 MSCT 文献可整条替换。保留期刊、年份、卷期页码与可检索 PMID。
export const textbook = {
  author: '步宏、李一雷', title: '病理学（第9版）', publisher: '人民卫生出版社', year: 2018,
  url: 'https://medu.pmph.com/readdetail/todetail.action?id=24039',
};

export const imaging = {
  label: '成人初始影像指南', author: 'Bonomo RA et al.', journal: 'Clin Infect Dis', year: 2024,
  pages: '79(Suppl 3):S94–S103', pmid: '38963819',
  studies: 28, sensitivity: '97%', range: '83%–100%',
};

export const msct = {
  label: '多层螺旋 CT 分型研究', author: 'Lu K et al.', journal: 'Abdom Radiol', year: 2025,
  pages: '50(3):1117–1122', pmid: '39294319',
};

// 仅用于术前成人队列的敏感度示例。更换文献时同时核对入组条件、扫描协议与数据。
export const msctSensitivity = {
  label: '128 层增强 CT · 成人术前队列', author: 'Özkan E et al.',
  journal: 'Adv Radiol Imaging', year: 2026, pages: '3(1):15–24', cohort: 195,
  sensitivity: '98.7%', interval: '95.4%–99.6%',
  url: 'https://advradiology.org/articles/correlation-of-ct-findings-with-pathology-and-interobserver-agreement-in-patients-undergoing-appendectomy-for-suspected-acute-appendicitis-a-single-center-retrospective-study/AdvRadiolImaging.galenos.2026.58077',
};

export const treatment = {
  label: 'WSES 耶路撒冷指南（2025 版）', author: 'Podda M et al.', journal: 'JAMA Surg', year: 2026,
  pages: '161(3):283–295', pmid: '41604201',
};

export const histologySource = {
  label: '阑尾非肿瘤性病理综述', author: 'Pai SA, Mannan R', journal: 'Am J Clin Pathol', year: 2024,
  pages: '161(5):418–429', pmid: '38217538',
};
