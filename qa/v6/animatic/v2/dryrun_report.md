# v5 assembly dry run

Cue source: `全稿_v3/timeline.json real start/end`. Count: **77**.
First: 这根形似小香肠的盲管，就是阑尾。
Last: 持续右下腹痛、发热，请及时就诊。

Mismatches vs lines.json / 字数 column: 0.

## Typography

| Item | Value |
|---|---|
| Chinese | 52 px, weight 500 |
| English | 30 px, weight 400, floor 24 px |
| English max width | 1840 px |
| Chinese wrap budget | 18 visual characters |
| fadeTop / safeTop | 950 |
| fadeEnd | 961 |
| cnY | 1010 |
| enY | 1050 |
| fade extend | ease |
| fade stops | 0→0, 0.0846→0.16, 0.8154→0.05, 1→0 |
| halo | stroke 6, blur 10, shadow 0.9, stroke alpha 0.82 |
| xfade | false |

Picture safe-area top: **y=950**. Scene art may extend down through y < 950. This is the number to give mini.
The backing is a soft scrim (ease) from y=950. Peak opacity 0.16 is at fadeEnd y=961, just above the dense Chinese halo. It eases out instead of becoming a solid paper slab.
Chinese baseline cnY=1010. English baseline enY=1050. Ink and the halo stay at y ≥ 950.

## Timing of the dry-run window

Content duration 327.8333333333333 s (last cue ends 327.8314999999995 s; the gap is a paper hold). Endcard 12 s. Expected total 339.8333333333333 s.

| id | ch | start | end | zh lines | en cards |
|---|---|---:|---:|---:|---:|
| 01 | 开场 | 0 | 4.121 | 1 | 2 |
| 02 | 开场 | 4.571 | 7.951 | 1 | 2 |
| 03 | 开场 | 8.401 | 12.328 | 1 | 1 |
| 04 | 开场 | 12.778 | 16.451 | 1 | 2 |
| 05 | 开场 | 16.901 | 20.867 | 1 | 2 |
| 06 | 就诊 | 21.667 | 24.113 | 1 | 1 |
| 07 | 就诊 | 24.563 | 28.749 | 1 | 2 |
| 08 | 就诊 | 29.199 | 33.38 | 1 | 2 |
| 09 | 就诊 | 33.83 | 37.842 | 1 | 2 |
| 10 | 就诊 | 38.292 | 42.614 | 2 | 2 |
| 11 | 就诊 | 43.064 | 45.937 | 1 | 1 |
| 12 | 就诊 | 46.387 | 49.687 | 1 | 2 |
| 13 | 就诊 | 50.137 | 53.451 | 1 | 2 |
| 14 | 就诊 | 53.901 | 56.507 | 1 | 1 |
| 15 | 就诊 | 56.957 | 59.336 | 1 | 1 |
| 16 | 就诊 | 59.786 | 62.477 | 1 | 1 |
| 17 | 就诊 | 62.927 | 69.007 | 2 | 2 |
| 18 | 就诊 | 69.457 | 72.739 | 1 | 1 |
| 19 | 就诊 | 73.189 | 77.125 | 1 | 2 |
| 20 | 路径前提 | 77.925 | 82.764 | 1 | 2 |
| 21 | 路径前提 | 83.014 | 85.702 | 1 | 1 |
| 22 | 路径前提 | 85.952 | 89.837 | 1 | 2 |
| 23 | 红·单纯性 | 90.637 | 96.172 | 2 | 2 |
| 24 | 红·单纯性 | 96.622 | 100.772 | 1 | 2 |
| 25 | 红·单纯性 | 101.222 | 103.656 | 1 | 2 |
| 26 | 红·单纯性 | 104.106 | 107.331 | 1 | 1 |
| 27 | 红·单纯性 | 107.781 | 111.997 | 1 | 2 |
| 28 | 红·单纯性 | 112.447 | 116.165 | 1 | 2 |
| 29 | 红·单纯性 | 116.615 | 120.712 | 2 | 2 |
| 30 | 红·单纯性 | 121.162 | 125.557 | 1 | 1 |
| 31 | 红·单纯性 | 126.007 | 130.094 | 1 | 2 |
| 32 | 红·单纯性 | 130.544 | 134.936 | 1 | 2 |
| 33 | 红·单纯性 | 135.386 | 138.301 | 1 | 2 |
| 34 | 红·单纯性 | 138.751 | 141.816 | 1 | 2 |
| 35 | 红·单纯性 | 142.266 | 145.015 | 1 | 2 |
| 36 | 红·单纯性 | 145.465 | 149.543 | 1 | 2 |
| 37 | 黄·化脓性 | 150.343 | 154.948 | 1 | 2 |
| 38 | 黄·化脓性 | 155.398 | 159.668 | 1 | 1 |
| 39 | 黄·化脓性 | 160.118 | 163.405 | 1 | 2 |
| 40 | 黄·化脓性 | 163.855 | 167.824 | 1 | 2 |
| 41 | 黄·化脓性 | 168.274 | 172.714 | 1 | 2 |
| 42 | 黄·化脓性 | 173.164 | 177.458 | 1 | 2 |
| 43 | 黄·化脓性 | 177.908 | 182.285 | 1 | 1 |
| 44 | 黄·化脓性 | 182.735 | 187.77 | 2 | 2 |
| 45 | 黄·化脓性 | 188.22 | 192.648 | 2 | 2 |
| 46 | 黄·化脓性 | 193.098 | 198.42 | 2 | 2 |
| 47 | 黄·化脓性 | 198.87 | 202.764 | 1 | 2 |
| 48 | 黄·化脓性 | 203.214 | 206.314 | 1 | 2 |
| 49 | 黑·坏疽性 | 207.114 | 211.703 | 1 | 1 |
| 50 | 黑·坏疽性 | 212.153 | 216.624 | 1 | 2 |
| 51 | 黑·坏疽性 | 217.074 | 221.307 | 1 | 1 |
| 52 | 黑·坏疽性 | 221.757 | 224.995 | 1 | 1 |
| 53 | 黑·坏疽性 | 225.445 | 228.111 | 1 | 1 |
| 54 | 黑·坏疽性 | 228.561 | 233.361 | 1 | 2 |
| 55 | 黑·坏疽性 | 233.811 | 237.69 | 1 | 2 |
| 56 | 黑·坏疽性 | 238.14 | 240.569 | 1 | 1 |
| 57 | 黑·坏疽性 | 241.019 | 245.745 | 2 | 2 |
| 58 | 黑·坏疽性 | 246.195 | 250.515 | 1 | 2 |
| 59 | 黑·坏疽性 | 250.965 | 255.427 | 1 | 2 |
| 60 | 治疗落点 | 256.227 | 259.759 | 1 | 2 |
| 61 | 治疗落点 | 260.209 | 264.344 | 1 | 2 |
| 62 | 治疗落点 | 264.794 | 268.7 | 2 | 2 |
| 63 | 治疗落点 | 269.15 | 272.804 | 1 | 2 |
| 64 | 治疗落点 | 273.254 | 276.326 | 1 | 2 |
| 65 | 治疗落点 | 276.776 | 280.278 | 1 | 2 |
| 66 | 慢性与收束 | 281.078 | 284.192 | 1 | 2 |
| 67 | 慢性与收束 | 284.642 | 287.249 | 1 | 2 |
| 68 | 慢性与收束 | 287.499 | 289.486 | 1 | 2 |
| 69 | 慢性与收束 | 289.936 | 294.3 | 1 | 2 |
| 70 | 慢性与收束 | 294.75 | 298.11 | 1 | 2 |
| 71 | 慢性与收束 | 298.56 | 301.837 | 1 | 1 |
| 72 | 慢性与收束 | 302.287 | 306.798 | 1 | 2 |
| 73 | 慢性与收束 | 307.248 | 310.736 | 2 | 2 |
| 74 | 慢性与收束 | 310.986 | 315.322 | 1 | 2 |
| 75 | 慢性与收束 | 315.772 | 318.908 | 1 | 2 |
| 76 | 慢性与收束 | 319.358 | 323.432 | 2 | 2 |
| 77 | 慢性与收束 | 323.882 | 327.831 | 1 | 2 |

**01** 这根形似小香肠的盲管，就是阑尾。

- 中 0–4.121 这根形似小香肠的盲管，就是阑尾
- EN 0–3.315 This small sausage-shaped tube is the
- EN 3.315–4.121 appendix.

**02** 发起炎来，它可能染上红、黄、黑。

- 中 4.571–7.951 发起炎来，它可能染上红、黄、黑
- EN 4.571–7.207 When inflamed, it may turn red, yellow,
- EN 7.207–7.951 then black.

**03** 每一次颜色流转，都记录着组织的伤痕。

- 中 8.401–12.328 每一次颜色流转，都记录着组织的伤痕
- EN 8.401–12.328 These colors reveal how tissue is injured.

**04** 循着这抹色彩，我们走进炎症的现场。

- 中 12.778–16.451 循着这抹色彩，我们走进炎症的现场
- EN 12.778–15.366 Follow the colors to understand
- EN 15.366–16.451 inflammation.

**05** 病理学里的“变质”，不是食物变坏。

- 中 16.901–20.867 病理学里的“变质”，不是食物变坏
- EN 16.901–20.192 In pathology, alteration has a specific
- EN 20.192–20.867 meaning.

**06** 先听听身体发出的求救信号。

- 中 21.667–24.113 先听听身体发出的求救信号
- EN 21.667–24.113 Start with the body's warning signs.

**07** 疼痛可能从肚脐周围，移向右下腹。

- 中 24.563–28.749 疼痛可能从肚脐周围，移向右下腹
- EN 24.563–27.399 Pain may move from around the navel to the
- EN 27.399–28.749 lower right abdomen.

**08** 还可能恶心、发热，右下腹明显压痛。

- 中 29.199–33.38 还可能恶心、发热，右下腹明显压痛
- EN 29.199–31.474 Nausea, fever, and marked lower right
- EN 31.474–33.38 abdominal tenderness may occur.

**09** 疼痛若持续加重，别抱着侥幸硬扛。

- 中 33.83–37.842 疼痛若持续加重，别抱着侥幸硬扛
- EN 33.83–37.364 Do not ignore persistent or worsening
- EN 37.364–37.842 pain.

**10** 相似的求救声，也可能来自其他腹部疾病。

- 中 38.292–39.817 相似的求救声
- 中 39.817–42.614 也可能来自其他腹部疾病
- EN 38.292–41.228 Other abdominal conditions can cause
- EN 41.228–42.614 similar symptoms.

**11** 有些人的信号，却并不典型。

- 中 43.064–45.937 有些人的信号，却并不典型
- EN 43.064–45.937 Some people have atypical symptoms.

**12** 医生先循着症状和体格检查寻找线索，

- 中 46.387–49.687 医生先循着症状和体格检查寻找线索
- EN 46.387–48.926 Doctors begin with symptoms and physical
- EN 48.926–49.687 examination,

**13** 再参考化验，判断是否阑尾炎。

- 中 50.137–53.451 再参考化验，判断是否阑尾炎
- EN 50.137–52.668 then use laboratory results to help assess
- EN 52.668–53.451 appendicitis.

**14** CT是重要的辅助确诊工具，

- 中 53.901–56.507 CT是重要的辅助确诊工具
- EN 53.901–56.507 CT is an important diagnostic aid.

**15** 但并非人人都必须做CT。

- 中 56.957–59.336 但并非人人都必须做CT
- EN 56.957–59.336 But not everyone needs a CT scan.

**16** 汇总8项研究的荟萃分析显示，

- 中 59.786–62.477 汇总8项研究的荟萃分析显示
- EN 59.786–62.477 A meta-analysis pooling 8 studies found:

**17** 增强螺旋CT敏感度95%、特异度94%。[1]

- 中 62.927–66.98 增强螺旋CT敏感度95%
- 中 66.98–69.007 特异度94%
- EN 62.927–65.877 For contrast-enhanced helical CT,
- EN 65.877–69.007 sensitivity: 95%; specificity: 94%.

**18** 这束影像之光，能帮助发现病变，

- 中 69.457–72.739 这束影像之光，能帮助发现病变
- EN 69.457–72.739 It can help detect appendicitis.

**19** 却仍需结合临床，判断病情轻重。

- 中 73.189–77.125 却仍需结合临床，判断病情轻重
- EN 73.189–76.163 Severity still requires an overall
- EN 76.163–77.125 assessment.

**20** 单纯性→化脓性（蜂窝织炎性）→坏疽性

- 中 77.925–82.764 单纯性→化脓性（蜂窝织炎性）→坏疽性
- EN 77.925–81.712 Simple → suppurative (phlegmonous) →
- EN 81.712–82.764 gangrenous

**21** 是最常见的典型演变，

- 中 83.014–85.702 是最常见的典型演变
- EN 83.014–85.702 is the most common typical progression,

**22** 但并不是每个患者都必经的固定流程。

- 中 85.952–89.837 但并不是每个患者都必经的固定流程
- EN 85.952–89.123 but not every patient follows this fixed
- EN 89.123–89.837 sequence.

**23** 第一幕红：单纯性阑尾炎，充血、轻度肿胀。

- 中 90.637–94.942 第一幕红：单纯性阑尾炎，充血
- 中 94.942–96.172 轻度肿胀
- EN 90.637–93.321 Act I, red: simple appendicitis,
- EN 93.321–96.172 with congestion and mild swelling.

**24** 局部血管扩张，血流增多，染出这抹红。

- 中 96.622–100.772 局部血管扩张，血流增多，染出这抹红
- EN 96.622–99.696 Dilated vessels and increased blood flow
- EN 99.696–100.772 cause redness.

**25** 血管里的液体和蛋白质渗出，

- 中 101.222–103.656 血管里的液体和蛋白质渗出
- EN 101.222–103.214 Fluid and proteins leak out of blood
- EN 103.214–103.656 vessels,

**26** 积在组织间隙，形成水肿。

- 中 104.106–107.331 积在组织间隙，形成水肿
- EN 104.106–107.331 causing tissue edema and swelling.

**27** 巡逻的白细胞游出血管，挺进受损组织。

- 中 107.781–111.997 巡逻的白细胞游出血管，挺进受损组织
- EN 107.781–110.174 Patrolling white blood cells leave vessels
- EN 110.174–111.997 and advance into injured tissue.

**28** 这是身体为抵御损伤，调动的防御。

- 中 112.447–116.165 这是身体为抵御损伤，调动的防御
- EN 112.447–114.903 Inflammation is the body's protective
- EN 114.903–116.165 response to injury.

**29** 然而战况一旦失控，也可能伤及自身组织。

- 中 116.615–118.543 然而战况一旦失控
- 中 118.543–120.712 也可能伤及自身组织
- EN 116.615–119.462 An excessive response can also damage the
- EN 119.462–120.712 body's own tissue.

**30** 液体、蛋白质和白细胞外出，叫渗出。

- 中 121.162–125.557 液体、蛋白质和白细胞外出，叫渗出
- EN 121.162–125.557 These changes are called exudation.

**31** 单纯性时，中性粒细胞主要驻守在

- 中 126.007–130.094 单纯性时，中性粒细胞主要驻守在
- EN 126.007–129.133 In simple appendicitis, neutrophils are
- EN 129.133–130.094 mainly found

**32** 黏膜及黏膜下层，组织损伤相对较轻。

- 中 130.544–134.936 黏膜及黏膜下层，组织损伤相对较轻
- EN 130.544–133.132 in the mucosa and submucosa, with
- EN 133.132–134.936 relatively mild damage.

**33** 变质，就是细胞组织的变性、坏死。

- 中 135.386–138.301 变质，就是细胞组织的变性、坏死
- EN 135.386–137.743 Alteration means cell degeneration and
- EN 137.743–138.301 necrosis.

**34** 此时，黏膜上皮已局部受损脱落。[2]

- 中 138.751–141.816 此时，黏膜上皮已局部受损脱落
- EN 138.751–141.217 Mucosal epithelium is locally injured
- EN 141.217–141.816 and shed.

**35** CT可见管径增粗、壁增厚，

- 中 142.266–145.015 CT可见管径增粗、壁增厚
- EN 142.266–144.174 CT may show a wider appendix and a
- EN 144.174–145.015 thickened wall,

**36** 周围脂肪轻度模糊，呼应早期的炎症。

- 中 145.465–149.543 周围脂肪轻度模糊，呼应早期的炎症
- EN 145.465–147.759 with mild surrounding fat stranding,
- EN 147.759–149.543 matching early inflammation.

**37** 第二幕黄：炎症的战线累及整层阑尾壁。

- 中 150.343–154.948 第二幕黄：炎症的战线累及整层阑尾壁
- EN 150.343–153.048 Act II, yellow: inflammation involves
- EN 153.048–154.948 the full appendiceal wall.

**38** 这是化脓性，也叫蜂窝织炎性阑尾炎。

- 中 155.398–159.668 这是化脓性，也叫蜂窝织炎性阑尾炎
- EN 155.398–159.668 Suppurative (phlegmonous) appendicitis.

**39** 中性粒细胞纷纷涌入，部分变性坏死。

- 中 160.118–163.405 中性粒细胞纷纷涌入，部分变性坏死
- EN 160.118–162.846 Many neutrophils enter; some degenerate
- EN 162.846–163.405 and die.

**40** 脓液中，还混着组织碎屑与渗出的液体。

- 中 163.855–167.824 脓液中，还混着组织碎屑与渗出的液体
- EN 163.855–167.328 Pus also contains tissue debris and exuded
- EN 167.328–167.824 fluid.

**41** 渗出愈明显，局部肿胀往往愈突出。

- 中 168.274–172.714 渗出愈明显，局部肿胀往往愈突出
- EN 168.274–171.317 More pronounced exudation often means
- EN 171.317–172.714 greater swelling.

**42** 变性坏死的中性粒细胞，就是脓细胞。

- 中 173.164–177.458 变性坏死的中性粒细胞，就是脓细胞
- EN 173.164–176.324 These degenerated, necrotic neutrophils
- EN 176.324–177.458 are pus cells.

**43** 渗出的纤维蛋白原凝成纤维素网。

- 中 177.908–182.285 渗出的纤维蛋白原凝成纤维素网
- EN 177.908–182.285 Exuded fibrinogen forms a fibrin mesh.

**44** 网与脓细胞等交织，形成纤维脓性渗出物。

- 中 182.735–185.104 网与脓细胞等交织
- 中 185.104–187.77 形成纤维脓性渗出物
- EN 182.735–185.532 The mesh mixes with pus cells and debris
- EN 185.532–187.77 to form fibrinopurulent exudate.

**45** 黄色并非只来自纤维素，更来自大量脓细胞。

- 中 188.22–190.68 黄色并非只来自纤维素
- 中 190.68–192.648 更来自大量脓细胞
- EN 188.22–190.61 Yellow comes not only from fibrin,
- EN 190.61–192.648 but also from many pus cells.

**46** 浆膜面可见纤维素性脓性渗出（含脓细胞）。

- 中 193.098–198.139 浆膜面可见纤维素性脓性渗出（含脓细胞
- 中 198.139–198.42 ）
- EN 193.098–196.775 Fibrinopurulent exudate with pus cells
- EN 196.775–198.42 coats the serosa.

**47** CT常见壁增厚强化、周围渗出明显，

- 中 198.87–202.764 CT常见壁增厚强化、周围渗出明显
- EN 198.87–201.312 CT: thickened, enhancing wall; marked
- EN 201.312–202.764 surrounding exudation.

**48** 与管壁内外的炎症相互映照。

- 中 203.214–206.314 与管壁内外的炎症相互映照
- EN 203.214–205.732 matching inflammation in and around the
- EN 205.732–206.314 appendix.

**49** 终局黑：腔内压力升高，危机步步逼近。

- 中 207.114–211.703 终局黑：腔内压力升高，危机步步逼近
- EN 207.114–211.703 Final act, black: pressure inside rises.

**50** 血管受压或形成血栓，阑尾壁陷入缺血。

- 中 212.153–216.624 血管受压或形成血栓，阑尾壁陷入缺血
- EN 212.153–214.998 Vessel compression or clots cause ischemia
- EN 214.998–216.624 of the appendiceal wall.

**51** 血流受阻，组织坏死，还伴有出血。

- 中 217.074–221.307 血流受阻，组织坏死，还伴有出血
- EN 217.074–221.307 Tissue dies, often with bleeding.

**52** 坏死与血红蛋白分解产物，

- 中 221.757–224.995 坏死与血红蛋白分解产物
- EN 221.757–224.995 Necrosis and hemoglobin breakdown products

**53** 让局部暗红，甚至发黑。

- 中 225.445–228.111 让局部暗红，甚至发黑
- EN 225.445–228.111 can make the tissue dark red or black.

**54** 变质在这里走向重处：大片组织坏死。

- 中 228.561–233.361 变质在这里走向重处：大片组织坏死
- EN 228.561–230.961 Alteration becomes severe:
- EN 230.961–233.361 extensive tissue necrosis.

**55** 它与渗出，共同写下急性期的病变。

- 中 233.811–237.69 它与渗出，共同写下急性期的病变
- EN 233.811–236.54 Alteration and exudation together mark
- EN 236.54–237.69 the acute phase.

**56** 这便是坏疽性阑尾炎。

- 中 238.14–240.569 这便是坏疽性阑尾炎
- EN 238.14–240.569 This is gangrenous appendicitis.

**57** 脆弱的管壁可能穿孔，让感染扩散至腹腔。

- 中 241.019–243.521 脆弱的管壁可能穿孔
- 中 243.521–245.745 让感染扩散至腹腔
- EN 241.019–243.618 The wall may perforate, spreading
- EN 243.618–245.745 infection into the abdomen.

**58** CT若见壁强化缺损，要警惕坏死；

- 中 246.195–250.515 CT若见壁强化缺损，要警惕坏死
- EN 246.195–248.978 A wall enhancement defect on CT raises
- EN 248.978–250.515 concern for necrosis.

**59** 若见腔外气体、脓肿，更要警惕穿孔。[3]

- 中 250.965–255.427 若见腔外气体、脓肿，更要警惕穿孔
- EN 250.965–253.672 Extraluminal gas or an abscess raises
- EN 253.672–255.427 concern for perforation.

**60** 读懂分型，是为了把握治疗的紧迫性。

- 中 256.227–259.759 读懂分型，是为了把握治疗的紧迫性
- EN 256.227–259.171 Classification helps determine treatment
- EN 259.171–259.759 urgency.

**61** 最终分型，仍靠切除后的病理切片确认。

- 中 260.209–264.344 最终分型，仍靠切除后的病理切片确认
- EN 260.209–263.272 The final type is confirmed by pathology
- EN 263.272–264.344 after removal.

**62** CT也帮助发现坏疽、穿孔、脓肿等并发症。[3][4]

- 中 264.794–267.398 CT也帮助发现坏疽、穿孔
- 中 267.398–268.7 脓肿等并发症
- EN 264.794–266.849 CT also helps detect gangrene,
- EN 266.849–268.7 perforation, and abscesses.

**63** 蜂窝织炎性、坏疽性需手术切除。[5]

- 中 269.15–272.804 蜂窝织炎性、坏疽性需手术切除
- EN 269.15–271.331 Suppurative (phlegmonous) and gangrenous
- EN 271.331–272.804 types require appendectomy.

**64** 面对病变，治疗要结合患者的具体情况。

- 中 273.254–276.326 面对病变，治疗要结合患者的具体情况
- EN 273.254–275.153 Treatment depends on the patient's
- EN 275.153–276.326 individual condition.

**65** 是否马上手术，由医生评估决定。

- 中 276.776–280.278 是否马上手术，由医生评估决定
- EN 276.776–279.733 Doctors assess how urgently surgery is
- EN 279.733–280.278 needed.

**66** 反复发作，可转为慢性阑尾炎。

- 中 281.078–284.192 反复发作，可转为慢性阑尾炎
- EN 281.078–283.382 Repeated episodes may lead to chronic
- EN 283.382–284.192 appendicitis.

**67** 急性期以变质、渗出为主，

- 中 284.642–287.249 急性期以变质、渗出为主
- EN 284.642–286.085 The acute phase mainly involves
- EN 286.085–287.249 alteration and exudation;

**68** 转为慢性才出现增生。

- 中 287.499–289.486 转为慢性才出现增生
- EN 287.499–288.823 proliferation appears in the
- EN 288.823–289.486 chronic phase.

**69** 镜下可见阑尾壁纤维组织增生、纤维化，

- 中 289.936–294.3 镜下可见阑尾壁纤维组织增生、纤维化
- EN 289.936–292.147 Microscopy shows fibrous tissue growth
- EN 292.147–294.3 and fibrosis in the appendiceal wall,

**70** 伴淋巴细胞、浆细胞等慢性炎细胞浸润。[2]

- 中 294.75–298.11 伴淋巴细胞、浆细胞等慢性炎细胞浸润
- EN 294.75–296.677 with chronic inflammatory cells such as
- EN 296.677–298.11 lymphocytes and plasma cells.

**71** 转入慢性，并不意味着从此风平浪静。

- 中 298.56–301.837 转入慢性，并不意味着从此风平浪静
- EN 298.56–301.837 Chronic disease still carries risks.

**72** 疼痛即便时轻时重，也应接受正规评估。

- 中 302.287–306.798 疼痛即便时轻时重，也应接受正规评估
- EN 302.287–305.294 Even intermittent pain deserves proper
- EN 305.294–306.798 medical assessment.

**73** 一旦确诊，通常建议症状缓解期择期切除；

- 中 307.248–308.069 一旦确诊
- 中 308.069–310.736 通常建议症状缓解期择期切除
- EN 307.248–309.06 Once diagnosed, elective appendectomy is
- EN 309.06–310.736 usually advised when symptoms settle;

**74** 若正处急性发作期，则视情况急诊手术。

- 中 310.986–315.322 若正处急性发作期，则视情况急诊手术
- EN 310.986–313.704 during an acute episode, emergency surgery
- EN 313.704–315.322 depends on the situation.

**75** 红、黄、黑，是洞察微观病变的罗盘，

- 中 315.772–318.908 红、黄、黑，是洞察微观病变的罗盘
- EN 315.772–317.298 Red, yellow, and black are a compass
- EN 317.298–318.908 for understanding microscopic changes,

**76** 不是等待病情演进的时钟。别等病情加重，

- 中 319.358–321.994 不是等待病情演进的时钟
- 中 321.994–323.432 别等病情加重
- EN 319.358–321.002 not a clock to wait by.
- EN 321.002–323.432 Do not wait for disease to worsen.

**77** 持续右下腹痛、发热，请及时就诊。

- 中 323.882–327.831 持续右下腹痛、发热，请及时就诊
- EN 323.882–326.089 Seek medical care for persistent lower
- EN 326.089–327.831 right abdominal pain or fever.

## English measure

Cards measured: 136. Widest: 52 card 0 “Necrosis and hemoglobin breakdown products” 652.3px at 30px.
Shrinks below 30 px: 0. Overflows at the 24 px floor: 0.
Every English card fits at 30 px. None shrink below 30, and none overflow at 24 px.

## Sample frames

- 帧_01_句01中点.png at t=2.06 shows “这根形似小香肠的盲管，就是阑尾” / “This small sausage-shaped tube is the”.
- 帧_02_最长英文_s03.png at t=10.365 shows “These colors reveal how tissue is injured.”.
- 帧_03_片尾A_t3.png is endcard local t=3 (file time ≈ 330.833 s), 1920×1080.

Safe-area scan (non-paper pixels above y=950 fail; ink must exist at y≥950):

- 帧_01_句01中点.png 1920×1080 above=0 minInkY=965 inkPixels=18463 PASS
- 帧_02_最长英文_s03.png 1920×1080 above=0 minInkY=965 inkPixels=19693 PASS
- Overlay alpha: pixels above y=950 with alpha≠0: 0; opaque pixels in the band: 11353.

Ink and halo stay at y ≥ 950. Full-frame ink starts at or below the safe area, and the subtitle overlay has no alpha above it.

Comparison and phone preview:

- /workspace/病理科普视频/v5/qa/v6/animatic/v2/frames/对比_字幕字号.png (1920×2320)
  - 「原 68 / 42，安全区 810」
  - 「新 52 / 30，安全区 950」
- /workspace/病理科普视频/v5/qa/v6/animatic/v2/frames/预览_手机竖屏.png (390×219) — 1920×1080 frame scaled to 390 px wide.
- /workspace/病理科普视频/v5/qa/v6/animatic/v2/frames/预览_手机竖屏_条.png (390×26) — subtitle band from y=950, same scale.

## Outputs

Scene: /workspace/病理科普视频/v5/qa/v6/animatic/v2/scene_plate.mp4.
Master: /workspace/病理科普视频/v5/qa/v6/animatic/v2/粗剪_v2.mp4 30.10 MB, 339.833 s, 1920×1080 yuv420p h264, audio aac 48000 Hz 2 ch.
720p: /workspace/病理科普视频/v5/qa/v6/animatic/v2/粗剪_v2_720p.mp4 12.55 MB, 339.833 s.

## Loudness

loudnorm two-pass. Integrated -14 LUFS, true peak -2.24 dBTP. Target -14 LUFS, true peak ≤ -1 dBTP.
Voice file: /workspace/病理科普视频/配音/全稿_v3/旁白_v3.wav. Music file: none (v4 music is not reused).

## Blind review

Endcard files unchanged: true. 【待填】 still present: true.
Blind result: skipped.

## Blockers

None.

Intermediate PNG sequences live in `qa/tmp/` during the run and are deleted after a successful encode. The three sample frames are kept.
