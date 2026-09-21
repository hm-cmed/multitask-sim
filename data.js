// 表示テキストは [日本語, English, 한국어, 中文] の順。
// 管理画面で追加・編集したシナリオは {ja, en, ko, zh} 形式で Firestore に保存され、ここの既定値より優先されます。
// p: 1=生命 2=安全 3=苦痛 4=その他 / dur: 対応に要する秒 / dl: 到着から期限までの秒
// at: 到着時刻（秒）/ del: 同僚に任せてよいか / chk: 安全確認キー / lv: 出現する最低レベル(0-3)

export const PROFESSIONS = {
  dr: ['医師', 'Physician', '의사', '医师'],
  ns: ['看護師', 'Nurse', '간호사', '护士'],
  ph: ['薬剤師', 'Pharmacist', '약사', '药剂师'],
  pt: ['理学療法士', 'Physical therapist', '물리치료사', '物理治疗师'],
  ot: ['作業療法士', 'Occupational therapist', '작업치료사', '作业治疗师'],
  rd: ['管理栄養士', 'Dietitian', '영양사', '营养师'],
  mt: ['臨床検査技師', 'Medical technologist', '임상병리사', '临床检验技师'],
};

export const LEVELS = [
  ['学生', 'Student', '학생', '学生'],
  ['1年目', '1st year', '1년차', '第1年'],
  ['2〜3年目', '2–3 years', '2~3년차', '第2–3年'],
  ['4年目以上', '4+ years', '4년차 이상', '4年以上'],
];

export const PRIORITY = {
  1: ['生命', 'Life', '생명', '生命'],
  2: ['安全', 'Safety', '안전', '安全'],
  3: ['苦痛', 'Distress', '고통', '痛苦'],
  4: ['その他', 'Other', '기타', '其他'],
};

// 選択肢の先頭が正解（表示時にシャッフル）
export const CHECKS = {
  id: {
    q: ['実施前の患者確認として最も適切なのは？', 'Best way to confirm patient identity before the procedure?', '시행 전 환자 확인으로 가장 적절한 것은?', '操作前确认患者身份最恰当的方法是？'],
    o: [
      ['本人にフルネームと生年月日を名乗ってもらい、リストバンドと照合する', 'Ask the patient to state full name and date of birth, and match with the wristband', '환자에게 이름과 생년월일을 직접 말하게 하고 팔찌와 대조한다', '请患者自述全名和出生日期，并与腕带核对'],
      ['部屋番号とベッドの位置で確認する', 'Confirm by room number and bed position', '병실 번호와 침대 위치로 확인한다', '通过房间号和床位确认'],
      ['名字で呼びかけ、返事があれば本人とみなす', 'Call the surname and assume identity if they answer', '성으로 부르고 대답하면 본인으로 간주한다', '叫姓氏，有回应即视为本人'],
    ],
  },
  med: {
    q: ['薬剤の準備・投与で最も適切なのは？', 'Most appropriate step when preparing or giving medication?', '약물 준비·투여에서 가장 적절한 것은?', '准备或给药时最恰当的做法是？'],
    o: [
      ['指示と薬剤を6Rで照合し、ハイリスク薬はダブルチェックする', 'Verify order and drug with the 6 Rights; double-check high-alert drugs', '지시와 약물을 6R로 대조하고 고위험 약물은 이중 확인한다', '按6R核对医嘱与药品，高警示药品双人核对'],
      ['前回と同じ薬なので確認を省く', 'Skip the check because it is the same drug as last time', '지난번과 같은 약이므로 확인을 생략한다', '与上次相同药品，省略核对'],
      ['忙しいので投与後にまとめて照合する', 'Too busy, so verify everything after administration', '바쁘니 투여 후 한꺼번에 대조한다', '太忙，给药后再统一核对'],
    ],
  },
  sbar: {
    q: ['医師への報告として最も適切なのは？', 'Which report to the physician is most appropriate?', '의사에게 보고하는 방법으로 가장 적절한 것은?', '向医生汇报最恰当的是？'],
    o: [
      ['状況→背景→評価→提案の順に伝え、診察を依頼する（SBAR）', 'Give situation, background, assessment and recommendation, and request a review (SBAR)', '상황→배경→평가→제안 순으로 전달하고 진찰을 요청한다(SBAR)', '按情况→背景→评估→建议汇报并请求查看（SBAR）'],
      ['「なんとなく様子が変です」とだけ伝える', 'Just say "something seems off"', '"뭔가 이상해요"라고만 전한다', '只说"好像有点不对劲"'],
      ['数値をひとつ伝えて電話を切る', 'Give one number and hang up', '수치 하나만 전하고 전화를 끊는다', '只报一个数值就挂断'],
    ],
  },
  fall: {
    q: ['転倒や急な変化に気づいたとき、最初に行うのは？', 'First action when you find a fall or a sudden change?', '낙상이나 급격한 변화를 발견했을 때 가장 먼저 할 일은?', '发现跌倒或病情突变时首先应做什么？'],
    o: [
      ['その場で意識・呼吸・外傷を評価し、応援を呼ぶ', 'Assess consciousness, breathing and injury on the spot, and call for help', '그 자리에서 의식·호흡·외상을 평가하고 도움을 요청한다', '就地评估意识、呼吸和外伤并呼叫支援'],
      ['すぐに抱き起こしてベッドへ戻す', 'Lift the patient back to bed immediately', '즉시 일으켜 침대로 옮긴다', '立即扶起送回床上'],
      ['先に記録を書いてから観察する', 'Write the record first, then observe', '먼저 기록한 뒤 관찰한다', '先写记录再观察'],
    ],
  },
  specimen: {
    q: ['検体の取り扱いで正しいのは？', 'Correct handling of specimens?', '검체 취급으로 올바른 것은?', '标本处理正确的是？'],
    o: [
      ['採取直後に患者の前でラベルを照合して貼る', 'Match and attach the label at the bedside right after collection', '채취 직후 환자 앞에서 라벨을 대조해 붙인다', '采集后立即在患者面前核对并贴标签'],
      ['複数の検体をまとめて後でラベルを貼る', 'Label several specimens together later', '여러 검체를 모아서 나중에 라벨을 붙인다', '多个标本集中后再贴标签'],
      ['容器に部屋番号だけを書いておく', 'Write only the room number on the tube', '용기에 병실 번호만 적어 둔다', '容器上只写房间号'],
    ],
  },
  panic: {
    q: ['パニック値を検出したときの対応は？', 'What to do when you detect a critical value?', '패닉값을 발견했을 때의 대응은?', '发现危急值时应如何处理？'],
    o: [
      ['検体と測定を確認し、直ちに担当医へ口頭で報告して記録する', 'Verify specimen and result, report verbally to the physician at once, and document', '검체와 측정을 확인하고 즉시 담당의에게 구두 보고 후 기록한다', '确认标本与结果，立即口头报告主管医生并记录'],
      ['次の定時報告でまとめて伝える', 'Report it with the next scheduled batch', '다음 정기 보고 때 한꺼번에 전한다', '在下次定时汇报时一并告知'],
      ['電子カルテに入力するだけにする', 'Only enter it in the electronic record', '전자차트에 입력만 한다', '只录入电子病历'],
    ],
  },
  vital: {
    q: ['訓練中に症状が出たときの対応は？', 'What to do when symptoms appear during therapy?', '훈련 중 증상이 나타났을 때의 대응은?', '训练中出现症状时应如何处理？'],
    o: [
      ['運動を中止してバイタルを測り、医師・看護師へ報告する', 'Stop exercise, check vital signs, and report to the physician or nurse', '운동을 중단하고 활력징후를 측정해 의사·간호사에게 보고한다', '停止运动，测量生命体征并报告医生或护士'],
      ['少し休ませてから訓練を続ける', 'Rest briefly and continue', '잠시 쉬게 한 뒤 훈련을 계속한다', '稍作休息后继续训练'],
      ['予定の訓練を終えてから報告する', 'Finish the planned session, then report', '예정된 훈련을 마친 뒤 보고한다', '完成计划训练后再报告'],
    ],
  },
  diet: {
    q: ['食事の変更・提供で確認すべきことは？', 'What must be checked when changing or serving a meal?', '식사 변경·제공 시 확인해야 할 것은?', '更改或供餐时必须确认什么？'],
    o: [
      ['アレルギー歴と食形態の指示を指示書と照合する', 'Match allergy history and texture order with the chart', '알레르기 이력과 식이 형태 지시를 지시서와 대조한다', '将过敏史和膳食形态医嘱与医嘱单核对'],
      ['家族の話だけで判断する', 'Decide based only on what the family says', '가족의 말만으로 판단한다', '仅凭家属说法判断'],
      ['前日と同じ内容にしておく', 'Keep it the same as yesterday', '전날과 같은 내용으로 둔다', '沿用前一天的内容'],
    ],
  },
  dose: {
    q: ['処方に疑義があるときの対応は？', 'What to do when a prescription looks wrong?', '처방에 의문이 있을 때의 대응은?', '对处方有疑问时应如何处理？'],
    o: [
      ['調剤を保留し、根拠を整理して処方医に照会・記録する', 'Hold dispensing, organize the evidence, query the prescriber, and document', '조제를 보류하고 근거를 정리해 처방의에게 조회·기록한다', '暂停调配，整理依据后向处方医生询问并记录'],
      ['自己判断で用量を変えて調剤する', 'Change the dose on your own and dispense', '자의적으로 용량을 바꿔 조제한다', '自行更改剂量并调配'],
      ['そのまま調剤し、患者に注意だけ伝える', 'Dispense as written and just warn the patient', '그대로 조제하고 환자에게 주의만 준다', '照原方调配，只提醒患者'],
    ],
  },
  order: {
    q: ['口頭指示を出すときに最も適切なのは？', 'Best practice when giving a verbal order?', '구두 지시를 내릴 때 가장 적절한 것은?', '下达口头医嘱时最恰当的是？'],
    o: [
      ['薬剤名・用量・経路を伝えて復唱してもらい、必ず記録する', 'State drug, dose and route, have it read back, and document it', '약물명·용량·경로를 전하고 복창하게 한 뒤 반드시 기록한다', '说明药名、剂量、途径，让对方复述，并记录'],
      ['急いでいるので略語で短く伝える', 'Use abbreviations to save time', '급하니 약어로 짧게 전한다', '赶时间，用缩写简短交代'],
      ['記録は不要なので伝えるだけにする', 'Just say it; no documentation needed', '기록은 필요 없으니 전달만 한다', '只口头交代，无需记录'],
    ],
  },
};

export const TIPS = [
  ['生命→安全→苦痛→その他の順で優先度を判断する', 'Prioritize life, then safety, then distress, then everything else', '생명→안전→고통→기타 순으로 우선순위를 정한다', '按生命→安全→痛苦→其他排序'],
  ['中断する前に「どこまでやったか」をメモすると、再開時のミスが減る', 'A quick note of where you stopped reduces errors when you resume', '중단 전에 어디까지 했는지 메모하면 재개 시 실수가 줄어든다', '中断前记下进度，可减少恢复时的错误'],
  ['専門的な判断が要らない課題は、手の空いた同僚に任せる', 'Delegate tasks that do not need your professional judgment', '전문적 판단이 필요 없는 과제는 여유 있는 동료에게 맡긴다', '不需要专业判断的任务交给空闲的同事'],
  ['報告はSBARで簡潔に伝える', 'Report concisely with SBAR', '보고는 SBAR로 간결하게 한다', '用SBAR简洁汇报'],
  ['忙しい時ほど、患者確認とダブルチェックを省かない', 'Never skip identity checks and double-checks, especially when busy', '바쁠수록 환자 확인과 이중 확인을 생략하지 않는다', '越忙越不能省略身份核对和双人核对'],
];

const T = (id, t, p, dur, dl, at, del, chk = null, lv = 0) => ({ id, t, p, dur, dl, at, del, chk, lv });

export const BUILTIN_SCENARIOS = [
  {
    id: 'ns-night', prof: 'ns', limit: 150,
    title: ['夜勤帯のナースコール', 'Night shift: call lights', '야간 근무의 호출벨', '夜班呼叫铃'],
    intro: ['深夜の病棟。受け持ちは6名、看護補助者が1名います。次々に入る呼び出しに優先順位をつけて対応してください。', 'Late night on the ward. You have 6 patients and one nursing assistant. Prioritize the calls that keep coming.', '심야 병동. 담당 환자 6명, 간호조무사 1명이 있습니다. 계속 들어오는 호출에 우선순위를 정해 대응하세요.', '深夜病房。你负责6名患者，有1名护理员。请为不断到来的呼叫排出优先顺序并处理。'],
    tasks: [
      T('n1', ['405号室 Bさん（転倒リスク高）がトイレに行きたい', 'Room 405, Mr B (high fall risk) wants the toilet', '405호 B씨(낙상 고위험)가 화장실에 가고 싶어 함', '405房B先生（跌倒高风险）想上厕所'], 2, 10, 40, 0, true),
      T('n2', ['401号室 点滴ポンプの閉塞アラーム', 'Room 401: IV pump occlusion alarm', '401호 수액 펌프 폐색 알람', '401房输液泵堵塞报警'], 2, 10, 45, 5, false),
      T('n3', ['403号室 Cさん「胸が苦しい」', 'Room 403, Ms C: "My chest feels tight"', '403호 C씨 "가슴이 답답해요"', '403房C女士："胸口发闷"'], 1, 18, 25, 16, false, 'sbar'),
      T('n4', ['電話：家族から面会時間の問い合わせ', 'Phone: family asking about visiting hours', '전화: 가족의 면회 시간 문의', '电话：家属询问探视时间'], 4, 6, 60, 24, true),
      T('n5', ['406号室 離床センサーが鳴っている', 'Room 406: bed-exit alarm', '406호 침상 이탈 센서 울림', '406房离床报警器响了'], 2, 8, 30, 38, true),
      T('n6', ['22時の定時抗菌薬の投与', '22:00 scheduled IV antibiotic', '22시 정시 항생제 투여', '22点定时抗生素给药'], 2, 14, 60, 48, false, 'med'),
      T('n7', ['402号室 Eさん 痛みが強く頓用薬を希望', 'Room 402, Mr E: severe pain, asks for PRN analgesic', '402호 E씨 통증이 심해 필요시 진통제 요청', '402房E先生疼痛加剧，要求临时止痛药'], 3, 12, 50, 62, false, 'med', 1),
      T('n8', ['隣の部屋で大きな物音', 'A loud thud from the next room', '옆 병실에서 큰 소리', '隔壁病房传来巨响'], 2, 12, 25, 78, false, 'fall', 2),
    ],
  },
  {
    id: 'ns-day', prof: 'ns', limit: 150,
    title: ['日勤の与薬と入院対応', 'Day shift: meds and admissions', '주간 근무: 투약과 입원', '白班：给药与入院'],
    intro: ['日勤の午前中。与薬の準備中に、電話・入院・急変が重なります。手の空いている看護師が1名います。', 'Morning day shift. Calls, an admission and a deteriorating patient overlap with your medication round. One nurse colleague is free.', '주간 근무 오전. 투약 준비 중에 전화·입원·급변이 겹칩니다. 여유 있는 간호사 1명이 있습니다.', '白班上午。准备给药时，电话、入院和病情变化接踵而至。有1名空闲的护士。'],
    tasks: [
      T('d1', ['食前インスリンの準備と投与', 'Prepare and give pre-meal insulin', '식전 인슐린 준비·투여', '准备并注射餐前胰岛素'], 2, 16, 60, 0, false, 'med'),
      T('d2', ['電話：医師から検査結果の確認依頼', 'Phone: physician asks you to check a lab result', '전화: 의사가 검사 결과 확인 요청', '电话：医生请你确认检查结果'], 4, 8, 50, 8, true),
      T('d3', ['新規入院の患者が病棟に到着', 'New admission arrives on the ward', '신규 입원 환자 병동 도착', '新入院患者到达病房'], 3, 15, 60, 16, true),
      T('d4', ['術後患者の血圧が80/50に低下', 'Post-op patient: BP dropped to 80/50', '수술 후 환자 혈압 80/50으로 저하', '术后患者血压降至80/50'], 1, 18, 25, 28, false, 'sbar'),
      T('d5', ['家族が退院の説明を求めている', 'Family asks about discharge', '가족이 퇴원 설명을 요청', '家属要求解释出院事项'], 4, 10, 70, 40, true),
      T('d6', ['採血検体を検査室へ提出', 'Send blood samples to the lab', '채혈 검체를 검사실로 제출', '将血标本送检'], 2, 8, 45, 52, true, 'specimen'),
      T('d7', ['せん妄の患者が点滴を抜こうとしている', 'Delirious patient trying to pull out the IV', '섬망 환자가 수액을 뽑으려 함', '谵妄患者试图拔输液管'], 2, 10, 20, 68, false, null, 1),
      T('d8', ['隣のベッドの患者が嘔吐', 'Patient in the next bed is vomiting', '옆 침대 환자 구토', '邻床患者呕吐'], 2, 10, 25, 82, false, null, 2),
    ],
  },
  {
    id: 'dr-ed', prof: 'dr', limit: 150,
    title: ['救急外来の並行診療', 'ED: parallel patient care', '응급실 병행 진료', '急诊并行诊疗'],
    intro: ['救急外来の研修医。複数の患者を同時に担当しています。手の空いている医師が1名います。', 'ED resident managing several patients at once. One colleague physician is available.', '응급실 전공의. 여러 환자를 동시에 맡고 있습니다. 여유 있는 의사 1명이 있습니다.', '急诊住院医师，同时负责多名患者。有1名空闲的医生。'],
    tasks: [
      T('e1', ['ベッド1：腹痛の20代女性、診察の続き', 'Bed 1: woman in her 20s with abdominal pain, continue the exam', '1번 침대: 복통 20대 여성, 진찰 계속', '1号床：20多岁女性腹痛，继续检查'], 3, 20, 90, 0, false),
      T('e2', ['ベッド3：58歳男性の胸痛、心電図の判読', 'Bed 3: 58-year-old man with chest pain, read the ECG', '3번 침대: 58세 남성 흉통, 심전도 판독', '3号床：58岁男性胸痛，判读心电图'], 1, 10, 20, 6, false),
      T('e3', ['看護師：ベッド5の発熱に解熱薬の指示を', 'Nurse: antipyretic order for fever in Bed 5', '간호사: 5번 침대 발열에 해열제 지시', '护士：5号床发热，请开退热药'], 3, 6, 50, 16, true, 'order'),
      T('e4', ['救急隊ホットライン：意識障害の受け入れ要請', 'EMS hotline: request to accept a patient with altered consciousness', '구급대 핫라인: 의식장애 환자 수용 요청', '急救热线：请求接收意识障碍患者'], 1, 8, 20, 30, false),
      T('e5', ['検査室：ベッド2のカリウム6.8', 'Lab: Bed 2 potassium 6.8', '검사실: 2번 침대 칼륨 6.8', '检验科：2号床血钾6.8'], 1, 12, 25, 46, false, 'order'),
      T('e6', ['家族から病状説明の依頼', 'Family requests an update', '가족이 병세 설명 요청', '家属要求说明病情'], 4, 10, 70, 56, true),
      T('e7', ['病棟から持参薬確認の電話', 'Ward calls about home medications', '병동에서 지참약 확인 전화', '病房来电确认自带药物'], 4, 6, 60, 70, true, null, 1),
      T('e8', ['ベッド4：転倒した高齢者の頭部CT確認', 'Bed 4: review head CT of an older patient who fell', '4번 침대: 낙상 고령자 두부 CT 확인', '4号床：跌倒老人头部CT确认'], 2, 10, 40, 84, false, null, 2),
    ],
  },
  {
    id: 'dr-night', prof: 'dr', limit: 150,
    title: ['病棟当直', 'Night on-call', '병동 당직', '病房夜班值班'],
    intro: ['夜間の病棟当直。3つの病棟から電話が入ります。相談できる上級医が1名います。', 'Night on-call covering three wards. One senior physician is available.', '야간 병동 당직. 세 병동에서 전화가 옵니다. 상의할 수 있는 선배 의사 1명이 있습니다.', '夜间病房值班，三个病房来电。有1名上级医生可以求助。'],
    tasks: [
      T('w1', ['A病棟：不眠の患者に睡眠薬の指示を', 'Ward A: sleeping pill order for insomnia', 'A병동: 불면 환자 수면제 지시', 'A病房：失眠患者请开安眠药'], 4, 6, 70, 0, false, 'order'),
      T('w2', ['B病棟：術後患者の尿量が低下', 'Ward B: low urine output after surgery', 'B병동: 수술 후 환자 소변량 감소', 'B病房：术后患者尿量减少'], 2, 14, 50, 8, false),
      T('w3', ['C病棟：SpO2が85%に低下と連絡', 'Ward C: SpO2 dropped to 85%', 'C병동: SpO2 85%로 저하 연락', 'C病房：SpO2降至85%'], 1, 18, 20, 20, false, 'order'),
      T('w4', ['救急外来から入院の相談', 'ED asks about an admission', '응급실에서 입원 상담', '急诊咨询收住院'], 3, 10, 60, 32, true),
      T('w5', ['A病棟：点滴ルートの再確保', 'Ward A: re-site an IV line', 'A병동: 수액 라인 재확보', 'A病房：重新建立静脉通路'], 4, 10, 70, 44, true),
      T('w6', ['B病棟：転倒した患者の診察', 'Ward B: examine a patient who fell', 'B병동: 낙상 환자 진찰', 'B病房：检查跌倒的患者'], 2, 12, 35, 58, false, 'fall'),
      T('w7', ['薬剤部から処方の疑義照会', 'Pharmacy query about a prescription', '약제부의 처방 조회', '药剂科对处方提出疑问'], 3, 6, 50, 72, false, null, 1),
      T('w8', ['C病棟：看取り期の患者の家族への説明', 'Ward C: talk with the family of a dying patient', 'C병동: 임종기 환자 가족 설명', 'C病房：向临终患者家属说明'], 3, 14, 60, 86, false, null, 2),
    ],
  },
  {
    id: 'ph-disp', prof: 'ph', limit: 150,
    title: ['調剤室の割り込み', 'Dispensary interruptions', '조제실의 방해 요인', '调剂室的打断'],
    intro: ['調剤室の午前中。調剤・鑑査の最中に電話や緊急依頼が入ります。もう1名の薬剤師がいます。', 'Morning in the dispensary. Calls and urgent requests arrive while you dispense and check. One other pharmacist is on duty.', '조제실 오전. 조제·감사 중에 전화와 긴급 요청이 들어옵니다. 다른 약사 1명이 있습니다.', '调剂室上午。调配和核对中不断有电话和紧急请求。另有1名药剂师。'],
    tasks: [
      T('p1', ['外来処方の調剤（10剤）', 'Dispense an outpatient prescription (10 items)', '외래 처방 조제(10종)', '调配门诊处方（10种）'], 3, 20, 80, 0, true, 'med'),
      T('p2', ['処方に疑義：腎機能低下の患者に通常量', 'Query: standard dose for a patient with renal impairment', '처방 의문: 신기능 저하 환자에 통상 용량', '处方疑问：肾功能不全患者用常规剂量'], 2, 10, 50, 10, false, 'dose'),
      T('p3', ['窓口で患者が薬の説明を待っている', 'Patient waiting at the counter for counseling', '창구에서 환자가 약 설명을 기다림', '患者在窗口等待用药说明'], 3, 10, 50, 20, true),
      T('p4', ['電話：医師から配合変化の問い合わせ', 'Phone: physician asks about IV compatibility', '전화: 의사의 배합 변화 문의', '电话：医生询问配伍变化'], 3, 8, 50, 30, true),
      T('p5', ['院内緊急コール：アナフィラキシー、アドレナリン持参', 'Code call: anaphylaxis, bring adrenaline', '원내 응급 호출: 아나필락시스, 아드레날린 지참', '院内紧急呼叫：过敏性休克，携带肾上腺素'], 1, 10, 20, 42, false),
      T('p6', ['抗がん剤の至急調製依頼', 'Urgent chemotherapy preparation', '항암제 긴급 조제 요청', '紧急配置抗癌药'], 2, 16, 60, 54, false, 'med'),
      T('p7', ['鑑査待ちの処方がたまっている', 'Prescriptions piling up for final check', '감사 대기 처방이 쌓여 있음', '待核对处方堆积'], 3, 12, 60, 68, true, null, 1),
      T('p8', ['麻薬の払い出し', 'Dispense a narcotic', '마약 불출', '发放麻醉药品'], 2, 10, 50, 82, false, 'med', 2),
    ],
  },
  {
    id: 'ph-ward', prof: 'ph', limit: 150,
    title: ['病棟薬剤業務', 'Ward pharmacy', '병동 약제 업무', '病房药学服务'],
    intro: ['病棟担当の薬剤師。持参薬確認や指導の予定に、医師・看護師からの問い合わせが重なります。応援を頼める薬剤師が1名います。', 'Ward pharmacist. Questions from physicians and nurses pile onto medication reconciliation and counseling. One colleague can help.', '병동 담당 약사. 지참약 확인과 복약지도 일정에 의사·간호사 문의가 겹칩니다. 도움을 요청할 수 있는 약사 1명이 있습니다.', '病房药剂师。在核对自带药和用药指导之外，医生和护士的咨询不断。有1名药剂师可以支援。'],
    tasks: [
      T('q1', ['新規入院患者の持参薬確認', 'Reconcile medications of a new admission', '신규 입원 환자 지참약 확인', '核对新入院患者的自带药'], 3, 16, 80, 0, true),
      T('q2', ['看護師：透析患者の投与量の確認', 'Nurse: check the dose for a dialysis patient', '간호사: 투석 환자 투여량 확인', '护士：确认透析患者剂量'], 2, 10, 40, 10, false, 'dose'),
      T('q3', ['医師：TDMに基づく投与設計の相談', 'Physician: TDM-based dosing plan', '의사: TDM 기반 투여 설계 상담', '医生：基于TDM的给药方案咨询'], 2, 14, 60, 22, false),
      T('q4', ['退院時服薬指導の予定時刻', 'Scheduled discharge counseling', '퇴원 복약지도 예정 시각', '出院用药指导的预定时间'], 3, 12, 50, 34, true),
      T('q5', ['患者が内服後にじんましんと息苦しさ', 'Patient has hives and breathlessness after a dose', '환자가 복용 후 두드러기와 호흡곤란', '患者服药后出现荨麻疹和呼吸困难'], 1, 12, 20, 48, false, 'sbar'),
      T('q6', ['看護師：点滴の配合変化の確認', 'Nurse: check IV compatibility', '간호사: 수액 배합 변화 확인', '护士：确认输液配伍'], 2, 8, 40, 60, false, null, 1),
      T('q7', ['カンファレンス資料の作成', 'Prepare conference materials', '컨퍼런스 자료 작성', '准备会议资料'], 4, 12, 80, 74, true, null, 2),
    ],
  },
  {
    id: 'pt-ward', prof: 'pt', limit: 150,
    title: ['病棟リハビリと急な変化', 'Ward rehab and sudden changes', '병동 재활과 급변', '病房康复与突发变化'],
    intro: ['病棟でのリハビリ。予定の訓練と記録の合間に、急な症状や依頼が入ります。同じ病棟にもう1名の療法士がいます。', 'Rehab on the ward. Sudden symptoms and requests arrive between sessions and documentation. Another therapist is on the ward.', '병동 재활. 예정된 훈련과 기록 사이에 갑작스러운 증상과 요청이 들어옵니다. 같은 병동에 치료사 1명이 더 있습니다.', '病房康复。在训练和记录之间，突发症状和请求接连出现。病房另有1名治疗师。'],
    tasks: [
      T('t1', ['予定の歩行訓練（大腿骨術後）', 'Scheduled gait training (after hip surgery)', '예정된 보행 훈련(대퇴골 수술 후)', '预定的步行训练（股骨术后）'], 3, 18, 70, 0, false),
      T('t2', ['訓練中の患者が胸部不快と息切れ', 'Patient in session: chest discomfort and breathlessness', '훈련 중 환자가 흉부 불쾌감과 숨참', '训练中患者胸部不适、气促'], 1, 14, 20, 14, false, 'vital'),
      T('t3', ['看護師：リハの時間変更の依頼', 'Nurse: request to reschedule a session', '간호사: 재활 시간 변경 요청', '护士：请求调整康复时间'], 4, 5, 60, 24, true),
      T('t4', ['次の患者が訓練室で一人で待っている（転倒リスク）', 'Next patient waiting alone in the gym (fall risk)', '다음 환자가 훈련실에서 혼자 대기(낙상 위험)', '下一位患者独自在训练室等待（跌倒风险）'], 2, 8, 30, 36, true),
      T('t5', ['医師：離床を進めてよいかの相談', 'Physician: asks whether to progress mobilization', '의사: 조기 보행 진행 여부 상담', '医生：咨询是否推进下床活动'], 3, 8, 50, 48, false),
      T('t6', ['起立時に血圧が下がり、めまいを訴える', 'Dizziness with a BP drop on standing', '기립 시 혈압 저하와 어지럼 호소', '起立时血压下降、头晕'], 1, 12, 20, 62, false, 'vital', 1),
      T('t7', ['リハビリ記録の締め切り', 'Documentation deadline', '재활 기록 마감', '康复记录截止'], 4, 10, 60, 76, false, null, 1),
      T('t8', ['家族への退院前の介助指導', 'Pre-discharge caregiver training for the family', '가족 대상 퇴원 전 돌봄 지도', '出院前对家属的照护指导'], 3, 12, 60, 88, true, null, 2),
    ],
  },
  {
    id: 'ot-acute', prof: 'ot', limit: 150,
    title: ['急性期の作業療法', 'Acute-care occupational therapy', '급성기 작업치료', '急性期作业治疗'],
    intro: ['急性期病棟の作業療法士。ADL訓練の最中に、安全に関わる出来事や多職種からの依頼が重なります。同僚の療法士が1名います。', 'Acute-care OT. Safety events and requests from the team overlap with ADL training. One colleague therapist is available.', '급성기 병동 작업치료사. ADL 훈련 중에 안전 관련 사건과 다직종 요청이 겹칩니다. 동료 치료사 1명이 있습니다.', '急性期病房作业治疗师。在ADL训练中，安全事件和多学科请求接踵而至。有1名同事治疗师。'],
    tasks: [
      T('o1', ['脳卒中患者の更衣訓練', 'Dressing training for a stroke patient', '뇌졸중 환자 옷 입기 훈련', '脑卒中患者穿衣训练'], 3, 18, 70, 0, false),
      T('o2', ['食事動作訓練中にむせて咳き込む', 'Choking and coughing during eating practice', '식사 동작 훈련 중 사레들려 기침', '进食训练中呛咳'], 1, 12, 20, 12, false, 'vital'),
      T('o3', ['看護師：自助具の調整依頼', 'Nurse: adjust an assistive device', '간호사: 자조구 조정 요청', '护士：请求调整自助具'], 4, 8, 60, 24, true),
      T('o4', ['高次脳機能障害の患者が一人で立ち上がろうとしている', 'Patient with cognitive impairment trying to stand alone', '고차뇌기능장애 환자가 혼자 일어서려 함', '高级脑功能障碍患者试图独自站起'], 2, 8, 20, 36, false, 'fall'),
      T('o5', ['家族：退院後の住宅改修の相談', 'Family: home modification advice', '가족: 퇴원 후 주택 개조 상담', '家属：出院后住宅改造咨询'], 3, 12, 60, 48, true),
      T('o6', ['多職種カンファレンスの資料準備', 'Prepare materials for the team conference', '다직종 컨퍼런스 자료 준비', '准备多学科会议资料'], 4, 10, 70, 60, true, null, 1),
      T('o7', ['医師：自宅退院の可否について至急意見を', 'Physician: urgent opinion on discharge home', '의사: 자택 퇴원 가부에 대한 긴급 의견', '医生：紧急询问能否出院回家'], 3, 10, 40, 76, false, null, 2),
    ],
  },
  {
    id: 'rd-ward', prof: 'rd', limit: 150,
    title: ['栄養管理の同時進行', 'Parallel nutrition care', '영양 관리의 동시 진행', '营养管理同时进行'],
    intro: ['病棟担当の管理栄養士。栄養評価や回診の予定に、食事の緊急変更や安全に関わる連絡が入ります。同僚の栄養士が1名います。', 'Ward dietitian. Urgent meal changes and safety calls interrupt assessments and rounds. One colleague dietitian is available.', '병동 담당 영양사. 영양 평가와 회진 일정 중에 식사 긴급 변경과 안전 관련 연락이 들어옵니다. 동료 영양사 1명이 있습니다.', '病房营养师。营养评估和查房之间，紧急更改膳食和安全相关联络不断。有1名同事营养师。'],
    tasks: [
      T('r1', ['新規入院患者の栄養スクリーニング（高リスク）', 'Nutrition screening of a high-risk new admission', '신규 입원 환자 영양 스크리닝(고위험)', '新入院高风险患者营养筛查'], 3, 14, 70, 0, true),
      T('r2', ['病棟：嚥下障害の患者の食形態を至急変更', 'Ward: urgent texture change for a patient with dysphagia', '병동: 연하장애 환자 식이 형태 긴급 변경', '病房：吞咽障碍患者紧急更改膳食形态'], 2, 10, 35, 10, false, 'diet'),
      T('r3', ['NST回診の開始時刻', 'Nutrition support team rounds starting', 'NST 회진 시작 시각', '营养支持小组查房开始'], 3, 16, 50, 22, false),
      T('r4', ['食物アレルギーの患者に誤配膳の疑い', 'Possible wrong tray served to a patient with food allergy', '식품 알레르기 환자에게 오배식 의심', '食物过敏患者疑似送错餐'], 1, 10, 20, 36, false, 'diet'),
      T('r5', ['外来患者の栄養相談（予約）', 'Scheduled outpatient nutrition counseling', '외래 환자 영양 상담(예약)', '门诊患者营养咨询（预约）'], 3, 12, 60, 48, true),
      T('r6', ['厨房：食材の急な欠品', 'Kitchen: an ingredient is suddenly unavailable', '주방: 식재료 긴급 품절', '厨房：食材突然缺货'], 4, 8, 60, 60, true),
      T('r7', ['看護師：経腸栄養で下痢が続くと相談', 'Nurse: ongoing diarrhea on tube feeding', '간호사: 경장영양 중 설사 지속 상담', '护士：肠内营养期间持续腹泻'], 3, 10, 50, 72, false, null, 1),
      T('r8', ['糖尿病教室の資料準備', 'Prepare diabetes class materials', '당뇨병 교실 자료 준비', '准备糖尿病课程资料'], 4, 10, 70, 84, true, null, 2),
    ],
  },
  {
    id: 'mt-lab', prof: 'mt', limit: 150,
    title: ['検査室の緊急割り込み', 'Lab: urgent interruptions', '검사실 긴급 인터럽트', '检验科紧急插入'],
    intro: ['検査室の日勤。定時検体の処理中に、至急検査やパニック値、採血室の混雑が重なります。同僚の技師が1名います。', 'Day shift in the lab. STAT tests, critical values and a crowded phlebotomy room overlap with routine samples. One colleague is available.', '검사실 주간 근무. 정시 검체 처리 중에 긴급 검사, 패닉값, 채혈실 혼잡이 겹칩니다. 동료 임상병리사 1명이 있습니다.', '检验科白班。常规标本处理中，急诊检验、危急值和采血室拥挤接踵而至。有1名同事技师。'],
    tasks: [
      T('m1', ['定時の生化学検体の測定（大量）', 'Run the routine chemistry batch', '정시 생화학 검체 측정(대량)', '检测常规生化标本（大批）'], 3, 18, 80, 0, true),
      T('m2', ['救急外来から至急の血液ガス', 'STAT blood gas from the ED', '응급실 긴급 혈액가스', '急诊送来紧急血气'], 2, 10, 30, 10, false, 'specimen'),
      T('m3', ['カリウム6.8のパニック値を検出', 'Critical value detected: potassium 6.8', '칼륨 6.8 패닉값 검출', '检测到血钾6.8危急值'], 1, 8, 20, 22, false, 'panic'),
      T('m4', ['採血室：外来の待ち人数が増えている', 'Phlebotomy: outpatient queue growing', '채혈실: 외래 대기 인원 증가', '采血室：门诊等候人数增加'], 3, 14, 60, 34, true, 'id'),
      T('m5', ['分析装置のエラーアラーム', 'Analyzer error alarm', '분석 장비 오류 알람', '分析仪错误报警'], 2, 10, 40, 46, true),
      T('m6', ['手術室から輸血の交差適合試験を至急', 'OR: urgent crossmatch for transfusion', '수술실: 수혈 교차적합시험 긴급', '手术室：紧急输血交叉配血'], 1, 14, 30, 58, false, 'specimen'),
      T('m7', ['医師から検査追加の電話', 'Physician calls to add a test', '의사의 검사 추가 전화', '医生来电追加检验'], 4, 6, 60, 72, true, null, 1),
      T('m8', ['精度管理データに外れ値', 'QC result out of range', '정도관리 데이터 이상값', '质控数据出现异常值'], 2, 10, 50, 84, false, null, 2),
    ],
  },
];
