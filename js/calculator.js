/* ============================================
   파이프 계산기 - calculator.js
   8개 계산기: 오프셋, 엘보+탄젠트, 절단길이, 원주, 수축량, 단위변환, 각도/투영, 용접설정
   ============================================ */

const Calculator = {
  data: null,

  async init() {
    try {
      const res = await fetch('data/pipe-data.json');
      this.data = await res.json();
    } catch (e) {
      console.error('파이프 데이터 로드 실패:', e);
      return;
    }

    this._setupTabs();
    this._populateSizeSelects();
    this._buildFractionGrid();
  },

  // --- 탭 전환 ---
  _setupTabs() {
    document.getElementById('calcTabs').addEventListener('click', (e) => {
      const tab = e.target.closest('.calc-tab');
      if (!tab) return;

      document.querySelectorAll('.calc-tab').forEach(t => t.classList.remove('calc-tab--active'));
      document.querySelectorAll('.calc-panel').forEach(p => p.classList.remove('calc-panel--active'));

      tab.classList.add('calc-tab--active');
      document.getElementById('panel-' + tab.dataset.calc).classList.add('calc-panel--active');
    });
  },

  // --- 사이즈 드롭다운 채우기 ---
  _populateSizeSelects() {
    const sizes = this.data.pipeSizes;
    ['elbowSize', 'shrinkageSize', 'tangentSize', 'weldSize', 'purgeSize'].forEach(id => {
      const sel = document.getElementById(id);
      sizes.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.od_inch;
        opt.textContent = `${s.nominal} (OD ${s.od_mm}mm)`;
        sel.appendChild(opt);
      });
      sel.value = '2'; // 기본 2"
    });
  },

  // --- 분수 inch 그리드 ---
  _buildFractionGrid() {
    const fractions = [
      { label: '1/16"', value: 0.0625 },
      { label: '1/8"', value: 0.125 },
      { label: '3/16"', value: 0.1875 },
      { label: '1/4"', value: 0.25 },
      { label: '5/16"', value: 0.3125 },
      { label: '3/8"', value: 0.375 },
      { label: '7/16"', value: 0.4375 },
      { label: '1/2"', value: 0.5 },
      { label: '9/16"', value: 0.5625 },
      { label: '5/8"', value: 0.625 },
      { label: '11/16"', value: 0.6875 },
      { label: '3/4"', value: 0.75 },
      { label: '13/16"', value: 0.8125 },
      { label: '7/8"', value: 0.875 },
      { label: '15/16"', value: 0.9375 },
      { label: '1"', value: 1.0 }
    ];

    const grid = document.getElementById('fractionGrid');
    fractions.forEach(f => {
      const btn = document.createElement('button');
      btn.className = 'calc-fraction-btn';
      btn.textContent = f.label;
      btn.addEventListener('click', () => {
        document.getElementById('convertInch').value = f.value;
        this.convertFromInch();
      });
      grid.appendChild(btn);
    });
  },

  // --- 결과 표시 헬퍼 ---
  _showResult(id, html) {
    document.getElementById(id).innerHTML = html;
  },

  _round(val, digits = 3) {
    return Math.round(val * Math.pow(10, digits)) / Math.pow(10, digits);
  },

  _toMm(val, unit) {
    return unit === 'mm' ? val : val * 25.4;
  },

  _formatBoth(valInch, valMm) {
    return `${this._round(valInch)}" (${this._round(valMm, 2)}mm)`;
  },

  // ===== 1. 파이프 오프셋 =====
  calcOffset() {
    const angle = parseFloat(document.getElementById('offsetAngle').value);
    const set = parseFloat(document.getElementById('offsetSet').value);
    const unit = document.getElementById('offsetUnit').value;

    if (!set || set <= 0) {
      this._showResult('result-offset', '<p class="calc-result__error">Set 값을 입력하세요</p>');
      return;
    }

    const rad = angle * Math.PI / 180;
    const travel = set / Math.sin(rad);
    const run = set / Math.tan(rad);

    const setMm = this._toMm(set, unit);
    const travelMm = this._toMm(travel, unit);
    const runMm = this._toMm(run, unit);

    this._showResult('result-offset', `
      <div class="calc-result__grid">
        <div class="calc-result__item">
          <span class="calc-result__label">Travel</span>
          <span class="calc-result__value">${this._round(travel)} ${unit}</span>
          <span class="calc-result__sub">${unit === 'inch' ? this._round(travelMm, 2) + 'mm' : this._round(travel / 25.4) + '"'}</span>
        </div>
        <div class="calc-result__item">
          <span class="calc-result__label">Run</span>
          <span class="calc-result__value">${this._round(run)} ${unit}</span>
          <span class="calc-result__sub">${unit === 'inch' ? this._round(runMm, 2) + 'mm' : this._round(run / 25.4) + '"'}</span>
        </div>
        <div class="calc-result__item">
          <span class="calc-result__label">Set</span>
          <span class="calc-result__value">${this._round(set)} ${unit}</span>
          <span class="calc-result__sub">${unit === 'inch' ? this._round(setMm, 2) + 'mm' : this._round(set / 25.4) + '"'}</span>
        </div>
      </div>
      <p class="calc-result__note">상수: ${angle}° → Travel = Set × ${this._round(1 / Math.sin(rad), 4)}</p>
    `);
  },

  // ===== 2. 엘보 테이크아웃 =====
  calcElbow() {
    const size = document.getElementById('elbowSize').value;
    const type = document.getElementById('elbowType').value;

    const elbowData = this.data.elbowTakeout.types[type];
    const takeout = elbowData.values[size];
    const takeoutMm = takeout * 25.4;
    const sizeInfo = this.data.pipeSizes.find(s => s.od_inch === parseFloat(size));

    this._showResult('result-elbow', `
      <div class="calc-result__grid">
        <div class="calc-result__item calc-result__item--primary">
          <span class="calc-result__label">테이크아웃</span>
          <span class="calc-result__value">${takeout}" (${this._round(takeoutMm, 2)}mm)</span>
        </div>
      </div>
      <p class="calc-result__note">${sizeInfo.nominal} ${elbowData.name} — 공식: ${elbowData.formula}</p>
    `);
  },

  // ===== 2-2. 탄젠트 엘보 =====
  calcTangentElbow() {
    const od = parseFloat(document.getElementById('tangentSize').value);
    const totalAngle = parseFloat(document.getElementById('tangentAngle').value);
    const pieces = parseInt(document.getElementById('tangentPieces').value);
    const sizeInfo = this.data.pipeSizes.find(s => s.od_inch === od);

    const nWelds = pieces - 1;
    const cutAngleDeg = totalAngle / (2 * nWelds);
    const cutAngleRad = cutAngleDeg * Math.PI / 180;

    // 파이프 표면 마킹: 짧은쪽~긴쪽 차이
    const miterMark = od * Math.tan(cutAngleRad);
    const miterMarkMm = miterMark * 25.4;

    // 최소 직관부 (양쪽 끝)
    const minTangent = Math.max(1.5, od);

    // 고어(가운데 피스) 최소 길이
    const nGore = Math.max(0, pieces - 2);
    const goreMin = nGore > 0 ? Math.max(1.5, od) : 0;

    // 필요 파이프 총 길이 (대략)
    const endPiece = minTangent + miterMark / 2;
    const totalPipe = 2 * endPiece + nGore * (goreMin + miterMark);

    // 기성품 비교
    const lr90 = 1.5 * od;
    const sr90 = od;

    let html = `
      <div class="calc-result__grid">
        <div class="calc-result__item calc-result__item--primary">
          <span class="calc-result__label">절단 각도</span>
          <span class="calc-result__value">${this._round(cutAngleDeg, 1)}°</span>
          <span class="calc-result__sub">수직선에서 ${this._round(cutAngleDeg, 1)}° 기울여 절단</span>
        </div>
        <div class="calc-result__item">
          <span class="calc-result__label">마킹 치수</span>
          <span class="calc-result__value">${this._round(miterMark, 3)}"</span>
          <span class="calc-result__sub">${this._round(miterMarkMm, 1)}mm</span>
        </div>
      </div>
      <div class="calc-result__breakdown">
        <p><strong>절단 마킹</strong>: 파이프 한쪽에서 반대쪽까지 ${this._round(miterMark, 3)}" (${this._round(miterMarkMm, 1)}mm) 차이로 사선 표시</p>
        <p><strong>최소 직관부</strong>: 양쪽 끝 각 ${this._round(minTangent, 1)}" 이상 확보</p>`;
    if (nGore > 0) {
      html += `<p><strong>가운데 피스</strong>: ${nGore}개, 각 ${this._round(goreMin, 1)}" 이상</p>`;
    }
    html += `
        <p><strong>필요 파이프</strong>: 약 ${this._round(totalPipe, 1)}" (${this._round(totalPipe * 25.4, 0)}mm) 최소</p>
      </div>
      <div class="calc-result__breakdown" style="margin-top:0.75rem; border-top:1px solid var(--border); padding-top:0.75rem;">
        <p><strong>기성품 비교</strong></p>
        <p>90° LR 테이크아웃: ${lr90}" | 90° SR: ${sr90}" | 45° LR: ${this._round(0.625 * od, 3)}"</p>
      </div>
      <p class="calc-result__note">${sizeInfo.nominal} ${pieces}-piece ${totalAngle}° 탄젠트 — 용접 ${nWelds}개소</p>`;

    this._showResult('result-tangent', html);
  },

  // ===== 3. 절단 길이 =====
  calcCutLength() {
    const total = parseFloat(document.getElementById('cutTotal').value);
    const fitting = parseFloat(document.getElementById('cutFitting').value) || 0;
    const welds = parseInt(document.getElementById('cutWelds').value) || 0;
    const shrinkPerJoint = parseFloat(document.getElementById('cutShrinkage').value) || 0;
    const unit = document.getElementById('cutUnit').value;

    if (!total || total <= 0) {
      this._showResult('result-cutlength', '<p class="calc-result__error">전체 길이를 입력하세요</p>');
      return;
    }

    // 수축량은 항상 mm로 입력됨 → 단위 맞추기
    let shrinkTotal = shrinkPerJoint * welds;
    let shrinkInUnit = unit === 'mm' ? shrinkTotal : shrinkTotal / 25.4;

    const cutLength = total - fitting - shrinkInUnit;

    this._showResult('result-cutlength', `
      <div class="calc-result__grid">
        <div class="calc-result__item calc-result__item--primary">
          <span class="calc-result__label">절단 길이</span>
          <span class="calc-result__value">${this._round(cutLength)} ${unit}</span>
          <span class="calc-result__sub">${unit === 'inch' ? this._round(cutLength * 25.4, 2) + 'mm' : this._round(cutLength / 25.4) + '"'}</span>
        </div>
      </div>
      <div class="calc-result__breakdown">
        <p>전체: ${total} ${unit}</p>
        <p>- 피팅: ${fitting} ${unit}</p>
        <p>- 수축: ${this._round(shrinkInUnit)} ${unit} (${shrinkPerJoint}mm × ${welds}개소)</p>
        <p><strong>= ${this._round(cutLength)} ${unit}</strong></p>
      </div>
    `);
  },

  // ===== 4. 파이프 원주 =====
  calcCircumference() {
    const od = parseFloat(document.getElementById('circOD').value);
    const unit = document.getElementById('circUnit').value;

    if (!od || od <= 0) {
      this._showResult('result-circumference', '<p class="calc-result__error">외경(OD)을 입력하세요</p>');
      return;
    }

    const circ = Math.PI * od;
    const half = circ / 2;

    this._showResult('result-circumference', `
      <div class="calc-result__grid">
        <div class="calc-result__item">
          <span class="calc-result__label">원주</span>
          <span class="calc-result__value">${this._round(circ)} ${unit}</span>
          <span class="calc-result__sub">${unit === 'inch' ? this._round(circ * 25.4, 2) + 'mm' : this._round(circ / 25.4) + '"'}</span>
        </div>
        <div class="calc-result__item">
          <span class="calc-result__label">반원주</span>
          <span class="calc-result__value">${this._round(half)} ${unit}</span>
          <span class="calc-result__sub">${unit === 'inch' ? this._round(half * 25.4, 2) + 'mm' : this._round(half / 25.4) + '"'}</span>
        </div>
      </div>
    `);
  },

  // ===== 5. 용접 수축량 =====
  calcShrinkage() {
    const size = document.getElementById('shrinkageSize').value;
    const welds = parseInt(document.getElementById('shrinkageWelds').value) || 1;

    const perJoint = this.data.weldShrinkage.values[size];
    const total = perJoint * welds;
    const totalInch = total / 25.4;
    const sizeInfo = this.data.pipeSizes.find(s => s.od_inch === parseFloat(size));

    this._showResult('result-shrinkage', `
      <div class="calc-result__grid">
        <div class="calc-result__item calc-result__item--primary">
          <span class="calc-result__label">총 수축량</span>
          <span class="calc-result__value">${this._round(total, 2)}mm (${this._round(totalInch)}")</span>
        </div>
        <div class="calc-result__item">
          <span class="calc-result__label">1개소당</span>
          <span class="calc-result__value">${perJoint}mm</span>
        </div>
      </div>
      <p class="calc-result__note">${sizeInfo.nominal} × ${welds}개소 — 고순도 SST TIG 기준</p>
    `);
  },

  // ===== 6. 단위 변환 =====
  convertFromInch() {
    const inch = parseFloat(document.getElementById('convertInch').value);
    if (isNaN(inch)) {
      document.getElementById('convertMm').value = '';
      this._showResult('result-convert', '');
      return;
    }
    const mm = inch * 25.4;
    document.getElementById('convertMm').value = this._round(mm, 3);
    this._showConvertResult(inch, mm);
  },

  convertFromMm() {
    const mm = parseFloat(document.getElementById('convertMm').value);
    if (isNaN(mm)) {
      document.getElementById('convertInch').value = '';
      this._showResult('result-convert', '');
      return;
    }
    const inch = mm / 25.4;
    document.getElementById('convertInch').value = this._round(inch, 4);
    this._showConvertResult(inch, mm);
  },

  // ===== 7. 각도 편차 + 투영 보정 (파이프 길이 기반) =====
  calcTolerance() {
    const length = parseFloat(document.getElementById('tolLength').value);
    const angle = parseFloat(document.getElementById('tolAngle').value);
    const deviation = parseFloat(document.getElementById('tolDeviation').value) || 0;
    const unit = document.getElementById('tolUnit').value;

    if (!length || length <= 0) {
      this._showResult('result-tolerance', '<p class="calc-result__error">도면 치수(길이)를 입력하세요</p>');
      return;
    }

    const rad = angle * Math.PI / 180;
    const cosA = Math.abs(Math.cos(rad));
    const sinA = Math.abs(Math.sin(rad));
    const toInch = (v) => unit === 'inch' ? v : v / 25.4;
    const judge = (v) => {
      const vi = toInch(v);
      if (vi <= 0.01) return '<span style="color:#16a34a">0.01" 이내 (타이트 OK)</span>';
      if (vi <= 0.03) return '<span style="color:#2563eb">0.03" 이내 (일반 OK)</span>';
      return '<span style="color:#dc2626">0.03" 초과 (공차 벗어남)</span>';
    };
    const r = (v) => this._round(v, 4);
    const r2 = (v) => this._round(v, 2);

    // ── 투영 보정 (항상 표시: 길이 + 각도만 있으면 됨) ──
    const actualFromH = cosA > 0.001 ? length / cosA : null;
    const actualFromV = sinA > 0.001 ? length / sinA : null;

    let projectionHtml = `
      <div class="calc-result__breakdown" style="margin-top:0.5rem;">
        <p><strong>도면치수 → 실제 파이프 길이</strong></p>`;
    if (actualFromH !== null) {
      const diffH = Math.abs(actualFromH - length);
      projectionHtml += `<p>도면 ${r(length)}${unit}이 수평 투영이면 → 실제 파이프 <strong>${r(actualFromH)}${unit}</strong> (차이 ${r(diffH)}${unit}) ${judge(diffH)}</p>`;
    }
    if (actualFromV !== null && angle !== 90) {
      const diffV = Math.abs(actualFromV - length);
      projectionHtml += `<p>도면 ${r(length)}${unit}이 수직 투영이면 → 실제 파이프 <strong>${r(actualFromV)}${unit}</strong> (차이 ${r(diffV)}${unit}) ${judge(diffV)}</p>`;
    }
    projectionHtml += `<p style="color:var(--text-muted); font-size:0.85rem;">* 차이가 공차 이내면 직선으로 잘라도 OK</p></div>`;

    // ── 편차가 없으면 투영 보정만 표시 ──
    if (deviation <= 0) {
      this._showResult('result-tolerance', `
        <div class="calc-result__grid">
          <div class="calc-result__item calc-result__item--primary">
            <span class="calc-result__label">기준 높이</span>
            <span class="calc-result__value">${r(length * sinA)} ${unit}</span>
          </div>
          <div class="calc-result__item">
            <span class="calc-result__label">기준 수평</span>
            <span class="calc-result__value">${r(length * cosA)} ${unit}</span>
          </div>
        </div>
        ${projectionHtml}
        <p class="calc-result__note">각도 편차를 입력하면 오차 영향도 함께 계산됩니다</p>
      `);
      return;
    }

    // ── 편차 분석 (편차 입력 시) ──
    const radMinus = (angle - deviation) * Math.PI / 180;
    const radPlus = (angle + deviation) * Math.PI / 180;
    const baseH = length * sinA;
    const baseR = length * cosA;
    const minusH = length * Math.sin(radMinus);
    const minusR = length * Math.cos(radMinus);
    const plusH = length * Math.sin(radPlus);
    const plusR = length * Math.cos(radPlus);

    const heightDiff = Math.max(Math.abs(plusH - baseH), Math.abs(minusH - baseH));
    const horizDiff = Math.max(Math.abs(plusR - baseR), Math.abs(minusR - baseR));

    // 역계산: 허용 최대 각도 편차
    const lengthInch = toInch(length);
    const maxDevH03 = cosA > 0.001 ? (0.03 / (lengthInch * cosA)) * 180 / Math.PI : 999;
    const maxDevH01 = cosA > 0.001 ? (0.01 / (lengthInch * cosA)) * 180 / Math.PI : 999;
    const maxDevR03 = sinA > 0.001 ? (0.03 / (lengthInch * sinA)) * 180 / Math.PI : 999;
    const maxDevR01 = sinA > 0.001 ? (0.01 / (lengthInch * sinA)) * 180 / Math.PI : 999;

    this._showResult('result-tolerance', `
      <div class="calc-result__grid">
        <div class="calc-result__item calc-result__item--primary">
          <span class="calc-result__label">높이 변화량</span>
          <span class="calc-result__value">${r(heightDiff)} ${unit}</span>
          <span class="calc-result__sub">${judge(heightDiff)}</span>
        </div>
        <div class="calc-result__item">
          <span class="calc-result__label">수평 변화량</span>
          <span class="calc-result__value">${r(horizDiff)} ${unit}</span>
          <span class="calc-result__sub">${judge(horizDiff)}</span>
        </div>
      </div>
      <div class="calc-result__breakdown">
        <p><strong>${r2(angle - deviation)}°</strong> : 높이 ${r(minusH)}, 수평 ${r(minusR)} ${unit}</p>
        <p><strong>${r2(angle)}° (기준)</strong> : 높이 ${r(baseH)}, 수평 ${r(baseR)} ${unit}</p>
        <p><strong>${r2(angle + deviation)}°</strong> : 높이 ${r(plusH)}, 수평 ${r(plusR)} ${unit}</p>
      </div>
      <div class="calc-result__breakdown" style="margin-top:0.75rem; border-top:1px solid var(--border); padding-top:0.75rem;">
        <p><strong>허용 각도 편차 (${length}${unit})</strong></p>
        <p>높이 기준: ±${r2(maxDevH03)}° (0.03"), ±${r2(maxDevH01)}° (0.01")</p>
        <p>수평 기준: ±${r2(maxDevR03)}° (0.03"), ±${r2(maxDevR01)}° (0.01")</p>
      </div>
      ${projectionHtml}
      <p class="calc-result__note">파이프 ${length}${unit} × ${angle}° — 길이가 길수록 허용 각도 편차가 줄어듦</p>
    `);
  },

  // ===== 8. 용접 파라미터 (펄스 TIG) =====
  // 알고리즘 근거: Pro-Fusion Orbital Welding, AWS B2.1, MDPI 2025 연구
  // 핵심 공식: 벽 두께 → 전류(1A/mil) + 이동속도(4-10 IPM) + PPS(75% 오버랩) 연립
  calcWeldParam() {
    const od = parseFloat(document.getElementById('weldSize').value);
    const wallRaw = parseFloat(document.getElementById('weldWall').value) || 0;
    const wallUnit = document.getElementById('weldWallUnit').value;
    const peak = parseFloat(document.getElementById('weldPeak').value);
    const bgPercent = parseFloat(document.getElementById('weldBG').value);
    const pps = parseFloat(document.getElementById('weldPPS').value) || 1;
    const duty = parseFloat(document.getElementById('weldDuty').value) || 50;
    const voltage = parseFloat(document.getElementById('weldVolt').value) || 8;
    const rpmInput = document.getElementById('weldRPM').value.trim();
    const rpm = rpmInput ? parseFloat(rpmInput) : 0;

    if (!peak || isNaN(bgPercent)) {
      this._showResult('result-weldparam', '<p class="calc-result__error">피크 전류와 BG %를 입력하세요</p>');
      return;
    }

    const sizeInfo = this.data.pipeSizes.find(s => s.od_inch === od);
    const odMm = od * 25.4;
    const circumMm = Math.PI * odMm;
    const r = (v) => this._round(v, 2);

    // 벽 두께 → mm/inch 통일
    const wallMm = wallUnit === 'inch' ? wallRaw * 25.4 : wallRaw;
    const wallInch = wallUnit === 'inch' ? wallRaw : wallRaw / 25.4;
    const wallMils = wallInch * 1000;
    const wallDisplay = wallMm > 0 ? `${r(wallMm)}mm (${this._round(wallInch, 3)}")` : '';

    // BG% → 실제 암페어
    const bgAmps = peak * (bgPercent / 100);
    const peakBgRatio = bgPercent > 0 ? (100 / bgPercent) : 999;

    // 평균 전류
    const iAvg = peak * (duty / 100) + bgAmps * (1 - duty / 100);

    // ── 업계 표준 추천 엔진 (Pro-Fusion 공식 기준, 보정 없음) ──
    // 출처: Pro-Fusion "Parameters for Orbital Tube Welding" (1999)
    // 원칙: 벽 두께가 모든 파라미터를 결정. OD는 RPM 변환에만 사용.
    let rec = null;
    if (wallMm > 0) {
      rec = {};

      // 1. 목표 평균 전류: STS 1A per mil (Pro-Fusion 표준)
      // "use 1 ampere average current for every 0.001 inch of wall thickness"
      rec.targetIAvg = wallMils * 1.0;

      // 2. 최적 속도 (IPM): Pro-Fusion 4-10 IPM 범위
      // "4 to 10 inches per minute, faster for thinner-wall material"
      // 선형 보간: 0.030" → 8 IPM (얇음), 0.154" → 4 IPM (두꺼움)
      rec.optIPM = Math.max(4, Math.min(10, 8 - (wallMils - 30) * (4 / 124)));
      rec.minIPM = Math.max(3, rec.optIPM * 0.8);
      rec.maxIPM = Math.min(10, rec.optIPM * 1.2);

      // 3. 속도 → mm/min, RPM
      // "RPM = ipm / (3.1415 x dia.)" — Pro-Fusion 공식
      rec.optSpeed = rec.optIPM * 25.4;
      rec.optRPM = rec.optIPM / (Math.PI * od);
      rec.minRPM = rec.minIPM / (Math.PI * od);
      rec.maxRPM = rec.maxIPM / (Math.PI * od);

      // 4. 목표 열입력 (전류+속도에서 자연 도출)
      rec.targetHI = (voltage * rec.targetIAvg * 60) / (rec.optSpeed * 1000);

      // 5. 추천 펄스 설정 (Pro-Fusion 표준)
      // "Background Current will be 1/3rd of peak current" → BG 33%
      // "Pulse width 20 to 50 percent, 35% recommended starting"
      rec.bgPct = 33;
      rec.duty = 35; // Pro-Fusion: 35% 시작점 (벽 두께 무관)
      const avgFactor = rec.duty / 100 + (rec.bgPct / 100) * (1 - rec.duty / 100);
      rec.peak = Math.round(rec.targetIAvg / avgFactor);
      if (rec.peak > 250) rec.peak = 250;
      if (rec.peak < 30) rec.peak = 30;
      rec.bgAmps = rec.peak * rec.bgPct / 100;
      rec.iAvg = rec.peak * (rec.duty / 100) + rec.bgAmps * (1 - rec.duty / 100);

      // 6. 추천 PPS (Pro-Fusion: 75% 오버랩)
      // "PPS rate for thin-wall tube is often equal to weld speed in IPM"
      const spotDia = 2.5 * wallInch;
      const stepPerPulse = spotDia * 0.25; // 75% overlap
      rec.pps = stepPerPulse > 0 ? Math.max(1, Math.round((rec.optIPM / 60) / stepPerPulse)) : 3;

      // 7. 아크 갭 (Pro-Fusion 공식)
      // "0.010" + half the penetration required (usually wall thickness)"
      rec.arcGap = 0.010 + wallInch / 2;
      rec.arcGapMm = rec.arcGap * 25.4;

      // 8. 열입력 검증
      rec.heatKJ = (voltage * rec.iAvg * 60) / rec.optSpeed / 1000;

      // 9. 리플 간격 검증
      rec.ripple = rec.pps > 0 ? (rec.optSpeed / 60) / rec.pps : 0;
    }

    // 열입력 판정 (Pro-Fusion 추천 HI를 중심으로 판정)
    const judgeHI = (hi) => {
      const hiCenter = rec ? rec.targetHI : (wallMm > 0 ? 0.15 * wallMm : 0.35);
      if (hiCenter <= 0) return ['데이터 부족', '#888'];
      const ratio = hi / hiCenter;
      if (ratio < 0.5) return ['극저 (용입 부족)', '#dc2626'];
      if (ratio < 0.75) return ['낮음 (용입 확인)', '#2563eb'];
      if (ratio <= 1.25) return ['최적', '#16a34a'];
      if (ratio <= 1.75) return ['안전 (높음)', '#16a34a'];
      if (ratio <= 2.5) return ['주의 (변형 가능)', '#ea580c'];
      return ['위험 (열변형)', '#dc2626'];
    };

    // ── 결과 출력 ──
    let html = `
      <div class="calc-result__grid">
        <div class="calc-result__item calc-result__item--primary">
          <span class="calc-result__label">평균 전류</span>
          <span class="calc-result__value">${r(iAvg)} A</span>
          <span class="calc-result__sub">Peak ${peak}A × ${duty}% + BG ${r(bgAmps)}A(${bgPercent}%) × ${100-duty}%</span>
        </div>
        <div class="calc-result__item">
          <span class="calc-result__label">BG 실제 전류</span>
          <span class="calc-result__value">${r(bgAmps)} A</span>
          <span class="calc-result__sub">Peak:BG = ${r(peakBgRatio)}:1</span>
        </div>
      </div>`;

    // ── 현재 설정 분석 (RPM 입력 시) ──
    if (rpm > 0) {
      const speed = rpm * circumMm;
      const speedIPM = speed / 25.4;
      const heatJ = (voltage * iAvg * 60) / speed;
      const heatKJ = heatJ / 1000;
      const weldTimeSec = 60 / rpm;
      const ripple = pps > 0 ? (speed / 60) / pps : 0;
      const [hiLabel, hiColor] = judgeHI(heatKJ);

      html += `
      <div class="calc-result__breakdown" style="margin-top:0.75rem;">
        <p><strong>현재 설정 분석</strong></p>
        <p>이동 속도: <strong>${r(speed)} mm/min</strong> (${r(speedIPM)} IPM)</p>
        <p>열입력: <strong style="color:${hiColor}">${this._round(heatKJ, 3)} kJ/mm — ${hiLabel}</strong></p>
        <p>리플 간격: ${r(ripple)} mm/펄스</p>
        <p>1회전: ${r(weldTimeSec)}초 | 원주: ${r(circumMm)}mm</p>`;
      if (wallMm > 0) {
        html += `<p>벽 두께 대비: ${r(heatJ / wallMm)} J/mm² (${wallDisplay})</p>`;
      }
      html += `</div>`;
    }

    // ── 업계 표준 추천 (벽 두께 기반 — 핵심 섹션) ──
    if (rec) {
      const [recHILabel, recHIColor] = judgeHI(rec.heatKJ);

      html += `
      <div class="calc-result__breakdown" style="margin-top:0.75rem; border-top:1px solid var(--border); padding-top:0.75rem; background:var(--color-bg-alt, #f0f9ff); padding:0.75rem; border-radius:8px;">
        <p style="font-weight:bold; font-size:1.05rem;">업계 표준 추천 (${wallDisplay})</p>
        <p style="color:var(--text-muted); font-size:0.85rem;">STS 1A/mil × OD보정${r(rec.odFactor, 2)} + ${r(rec.optIPM)} IPM + Peak:BG 3:1</p>
        <table style="width:100%; font-size:0.9rem; margin-top:0.5rem; border-collapse:collapse;">
          <tr style="border-bottom:1px solid var(--border);">
            <th style="text-align:left; padding:0.25rem 0;"></th>
            <th style="text-align:right;">내 설정</th>
            <th style="text-align:right;">추천</th>
            <th style="text-align:right;">판정</th>
          </tr>
          <tr>
            <td style="padding:0.25rem 0;">Peak</td>
            <td style="text-align:right;">${peak}A</td>
            <td style="text-align:right;">${rec.peak}A</td>
            <td style="text-align:right;">${Math.abs(peak - rec.peak) <= 15 ? '<span style="color:#16a34a">OK</span>' : peak > rec.peak ? '<span style="color:#ea580c">높음</span>' : '<span style="color:#2563eb">낮음</span>'}</td>
          </tr>
          <tr>
            <td>BG</td>
            <td style="text-align:right;">${bgPercent}%</td>
            <td style="text-align:right;">${rec.bgPct}%</td>
            <td style="text-align:right;">${Math.abs(bgPercent - rec.bgPct) <= 10 ? '<span style="color:#16a34a">OK</span>' : bgPercent > rec.bgPct + 10 ? '<span style="color:#ea580c">높음</span>' : '<span style="color:#16a34a">OK</span>'}</td>
          </tr>
          <tr>
            <td>Duty</td>
            <td style="text-align:right;">${duty}%</td>
            <td style="text-align:right;">${rec.duty}%</td>
            <td style="text-align:right;">${Math.abs(duty - rec.duty) <= 15 ? '<span style="color:#16a34a">OK</span>' : '<span style="color:#ea580c">조정</span>'}</td>
          </tr>
          <tr style="font-weight:bold;">
            <td>평균 전류</td>
            <td style="text-align:right;">${r(iAvg)}A</td>
            <td style="text-align:right;">${r(rec.iAvg)}A</td>
            <td style="text-align:right;">${Math.abs(iAvg - rec.targetIAvg) <= rec.targetIAvg * 0.15 ? '<span style="color:#16a34a">OK</span>' : iAvg > rec.targetIAvg * 1.15 ? '<span style="color:#ea580c">과다</span>' : '<span style="color:#2563eb">부족</span>'}</td>
          </tr>
          <tr>
            <td>PPS</td>
            <td style="text-align:right;">${pps} Hz</td>
            <td style="text-align:right;">${rec.pps} Hz</td>
            <td style="text-align:right;">${Math.abs(pps - rec.pps) <= 2 ? '<span style="color:#16a34a">OK</span>' : '<span style="color:#ea580c">조정</span>'}</td>
          </tr>
          <tr style="font-weight:bold; border-top:1px solid var(--border);">
            <td style="padding-top:0.35rem;">RPM</td>
            <td style="text-align:right; padding-top:0.35rem;">${rpm > 0 ? r(rpm) : '—'}</td>
            <td style="text-align:right; padding-top:0.35rem;">${r(rec.optRPM)}</td>
            <td style="text-align:right; padding-top:0.35rem;">${rpm > 0 ? (Math.abs(rpm - rec.optRPM) / rec.optRPM <= 0.15 ? '<span style="color:#16a34a">OK</span>' : rpm > rec.optRPM ? '<span style="color:#ea580c">빠름</span>' : '<span style="color:#2563eb">느림</span>') : '—'}</td>
          </tr>
          <tr>
            <td>속도</td>
            <td style="text-align:right;">${rpm > 0 ? r(rpm * circumMm) + ' mm/min' : '—'}</td>
            <td style="text-align:right;">${r(rec.optSpeed)} mm/min</td>
            <td style="text-align:right;">${r(rec.optIPM)} IPM</td>
          </tr>
          <tr>
            <td>열입력</td>
            <td style="text-align:right;">${rpm > 0 ? this._round((voltage * iAvg * 60) / (rpm * circumMm) / 1000, 3) + ' kJ' : '—'}</td>
            <td style="text-align:right; color:${recHIColor};">${this._round(rec.heatKJ, 3)} kJ</td>
            <td style="text-align:right;">${recHILabel}</td>
          </tr>
        </table>`;

      // ── 종합 판정 ──
      const iAvgOk = Math.abs(iAvg - rec.targetIAvg) <= rec.targetIAvg * 0.15;
      const rpmOk = rpm > 0 ? Math.abs(rpm - rec.optRPM) / rec.optRPM <= 0.2 : false;
      const allGood = iAvgOk && (rpm <= 0 || rpmOk);

      if (allGood && rpm > 0) {
        html += `<p style="color:#16a34a; margin-top:0.5rem; font-weight:bold;">✓ 현재 설정이 업계 표준과 일치합니다</p>`;
      } else {
        html += `<p style="margin-top:0.5rem; font-weight:bold;">조정 가이드:</p>`;
        if (!iAvgOk) {
          if (iAvg > rec.targetIAvg * 1.15) {
            html += `<p>• 평균 전류 ${r(iAvg)}A → <strong>${r(rec.targetIAvg)}A</strong> (Peak↓ 또는 Duty↓)</p>`;
          } else {
            html += `<p>• 평균 전류 ${r(iAvg)}A → <strong>${r(rec.targetIAvg)}A</strong> (Peak↑ 또는 Duty↑)</p>`;
          }
        }
        if (rpm > 0 && !rpmOk) {
          html += `<p>• RPM ${r(rpm)} → <strong>${r(rec.optRPM)}</strong> (${r(rec.optIPM)} IPM)</p>`;
        }
        if (rpm <= 0) {
          html += `<p>• 추천 RPM: <strong>${r(rec.optRPM)}</strong> (${r(rec.minRPM)}~${r(rec.maxRPM)} 범위)</p>`;
        }
        if (peakBgRatio < 2 || peakBgRatio > 5) {
          html += `<p>• Peak:BG 비율 ${r(peakBgRatio)}:1 → <strong>3:1</strong> 권장 (2:1~5:1)</p>`;
        }
      }
      html += `</div>`;

      // ── RPM 범위 테이블 (벽 두께 기반) ──
      const hiAtRpm = (rpmVal) => (voltage * iAvg * 60) / (rpmVal * circumMm) / 1000;
      const ripAtRpm = (rpmVal) => pps > 0 ? (rpmVal * circumMm / 60) / pps : 0;
      html += `
      <div class="calc-result__breakdown" style="margin-top:0.75rem; border-top:1px solid var(--border); padding-top:0.75rem;">
        <p><strong>RPM 범위</strong> (${sizeInfo.nominal}, ${wallDisplay})</p>
        <table style="width:100%; font-size:0.9rem; margin-top:0.5rem; border-collapse:collapse;">
          <tr style="border-bottom:1px solid var(--border);">
            <th style="text-align:left; padding:0.25rem 0;"></th>
            <th style="text-align:right;">RPM</th>
            <th style="text-align:right;">IPM</th>
            <th style="text-align:right;">열입력</th>
            <th style="text-align:right;">리플</th>
          </tr>
          <tr style="color:#2563eb;">
            <td style="padding:0.25rem 0;">느림 (보수적)</td>
            <td style="text-align:right;">${r(rec.minRPM)}</td>
            <td style="text-align:right;">${r(rec.minIPM)}</td>
            <td style="text-align:right;">${this._round(hiAtRpm(rec.minRPM), 3)} kJ</td>
            <td style="text-align:right;">${r(ripAtRpm(rec.minRPM))}mm</td>
          </tr>
          <tr style="color:#16a34a; font-weight:bold;">
            <td style="padding:0.25rem 0;">최적</td>
            <td style="text-align:right;">${r(rec.optRPM)}</td>
            <td style="text-align:right;">${r(rec.optIPM)}</td>
            <td style="text-align:right;">${this._round(hiAtRpm(rec.optRPM), 3)} kJ</td>
            <td style="text-align:right;">${r(ripAtRpm(rec.optRPM))}mm</td>
          </tr>
          <tr style="color:#ea580c;">
            <td style="padding:0.25rem 0;">빠름 (생산성)</td>
            <td style="text-align:right;">${r(rec.maxRPM)}</td>
            <td style="text-align:right;">${r(rec.maxIPM)}</td>
            <td style="text-align:right;">${this._round(hiAtRpm(rec.maxRPM), 3)} kJ</td>
            <td style="text-align:right;">${r(ripAtRpm(rec.maxRPM))}mm</td>
          </tr>
        </table>
      </div>`;
    } else {
      // 벽 두께 없음 → 기본 분석만
      if (rpm <= 0) {
        html += `
        <div class="calc-result__breakdown" style="margin-top:0.75rem; background:var(--color-bg-alt, #f0f9ff); padding:0.75rem; border-radius:8px;">
          <p style="color:#ea580c; font-weight:bold;">벽 두께를 입력하면 업계 표준 기반 추천을 받을 수 있습니다</p>
          <p style="color:var(--text-muted); font-size:0.85rem;">STS: 벽 두께(mil)당 1A 평균 전류 + 4-10 IPM 이동속도 연립 계산</p>
        </div>`;
      }
    }

    // ── STS 팁 ──
    html += `
      <div class="calc-result__breakdown" style="margin-top:0.75rem; border-top:1px solid var(--border); padding-top:0.75rem;">
        <p><strong>STS 열변형 줄이기</strong></p>
        <p>1. Duty 30~40% (냉각 시간 확보)</p>
        <p>2. Peak:BG = 3:1~5:1 (BG 최소화)</p>
        <p>3. 벽 두께에 맞는 속도 유지 (4-10 IPM)</p>
        <p>4. 고주파 PPS 100+ (열 분산, 비드 균일)</p>
        <p>5. 인터패스 온도 150°C 이하</p>
      </div>`;

    html += `<p class="calc-result__note">${sizeInfo.nominal} (OD ${odMm}mm, 원주 ${r(circumMm)}mm) 펄스 TIG — 업계표준 기반</p>`;
    this._showResult('result-weldparam', html);
  },

  // ===== 9. 백퍼지 계산 (자동 유량 추천) =====
  // 근거: NCPWB Purge Tips, AWS 포럼 실무 데이터, 층류 유속 원칙
  // 핵심: 파이프 ID 단면적 × 목표 유속 = 적정 유량 (층류 유지)
  calcPurge() {
    const od = parseFloat(document.getElementById('purgeSize').value);
    const wallRaw = parseFloat(document.getElementById('purgeWall').value) || 0;
    const wallUnit = document.getElementById('purgeWallUnit').value;
    const lengthRaw = parseFloat(document.getElementById('purgeLength').value) || 0;
    const lengthUnit = document.getElementById('purgeLengthUnit').value;
    const o2Target = 10; // LOD BA 기준 고정

    if (!wallRaw || wallRaw <= 0) {
      this._showResult('result-purge', '<p class="calc-result__error">벽 두께를 입력하세요</p>');
      return;
    }
    if (!lengthRaw || lengthRaw <= 0) {
      this._showResult('result-purge', '<p class="calc-result__error">파이프 길이를 입력하세요</p>');
      return;
    }

    const sizeInfo = this.data.pipeSizes.find(s => s.od_inch === od);
    const odMm = od * 25.4;
    const wallMm = wallUnit === 'inch' ? wallRaw * 25.4 : wallRaw;
    const idMm = odMm - 2 * wallMm;
    const lengthMm = lengthUnit === 'inch' ? lengthRaw * 25.4 : lengthRaw;
    const r = (v, d) => this._round(v, d || 2);

    if (idMm <= 0) {
      this._showResult('result-purge', '<p class="calc-result__error">벽 두께가 OD보다 큽니다. 확인하세요.</p>');
      return;
    }

    // 내부 단면적 (mm²)
    const areaMm2 = Math.PI * Math.pow(idMm / 2, 2);

    // 내부 체적 (리터)
    const volumeMm3 = areaMm2 * lengthMm;
    const volumeL = volumeMm3 / 1e6;

    // ── 유량 자동 계산 (층류 유속 기준) ──
    // 초기 퍼지: 0.2 m/s (빠르게 치환, 층류 상한 내)
    // 용접 중: 0.05 m/s (안정 유지, 석백 방지)
    const vPurge = 0.2;  // m/s
    const vWeld = 0.05;  // m/s

    // 유량(L/min) = 단면적(m²) × 유속(m/s) × 60초 × 1000(L/m³)
    const areaM2 = areaMm2 / 1e6;
    let flowPurgeLpm = areaM2 * vPurge * 60 * 1000;
    let flowWeldLpm = areaM2 * vWeld * 60 * 1000;

    // 실용 범위 제한
    flowPurgeLpm = Math.max(1, Math.min(30, flowPurgeLpm));
    flowWeldLpm = Math.max(0.5, Math.min(10, flowWeldLpm));

    const flowPurgeSCFH = flowPurgeLpm / 0.4719;
    const flowWeldSCFH = flowWeldLpm / 0.4719;

    // ── 퍼지 시간 계산 ──
    const c0 = 209000; // 대기 산소 ppm
    const lnRatio = Math.log(c0 / o2Target); // ≈ 9.95
    const effFactor = 1.5; // 치환 방식 (LOD BA 표준)
    const practicalN = lnRatio * effFactor; // ≈ 14.9회 교환

    const gasNeededL = volumeL * practicalN;
    const purgeTimeMin = gasNeededL / flowPurgeLpm;

    // ── Dwyer 플로미터 눈금 매칭 ──
    // Dwyer 스케일: SCFH 10~50 / L/min 2~24
    const dwyerSCFH = Math.round(flowPurgeSCFH / 5) * 5; // 5 단위 반올림
    const dwyerLpm = Math.round(flowPurgeLpm);
    const dwyerWeldSCFH = Math.max(10, Math.round(flowWeldSCFH / 5) * 5);
    const dwyerWeldLpm = Math.max(2, Math.round(flowWeldLpm));

    // ── 산소 농도 변화 체크포인트 ──
    const o2At = (n) => Math.round(c0 * Math.exp(-n / effFactor));

    let html = `
      <div class="calc-result__grid">
        <div class="calc-result__item calc-result__item--primary">
          <span class="calc-result__label">퍼지 시간</span>
          <span class="calc-result__value">${r(purgeTimeMin, 1)} 분</span>
          <span class="calc-result__sub">산소 분석기 10ppm 확인 후 용접</span>
        </div>
        <div class="calc-result__item">
          <span class="calc-result__label">필요 가스량</span>
          <span class="calc-result__value">${r(gasNeededL, 1)} L</span>
          <span class="calc-result__sub">${r(gasNeededL / 28.317, 2)} ft³</span>
        </div>
      </div>

      <div class="calc-result__breakdown" style="background:var(--color-bg-alt, #f0f9ff); padding:0.75rem; border-radius:8px;">
        <p style="font-weight:bold; font-size:1.05rem;">Dwyer 플로미터 설정</p>
        <table style="width:100%; font-size:0.95rem; margin-top:0.5rem; border-collapse:collapse;">
          <tr style="border-bottom:1px solid var(--border);">
            <th style="text-align:left; padding:0.3rem 0;"></th>
            <th style="text-align:right;">SCFH</th>
            <th style="text-align:right;">L/min</th>
            <th style="text-align:right;">유속</th>
          </tr>
          <tr style="font-weight:bold; font-size:1.05rem;">
            <td style="padding:0.3rem 0;">초기 퍼지</td>
            <td style="text-align:right;">${dwyerSCFH}</td>
            <td style="text-align:right;">${dwyerLpm}</td>
            <td style="text-align:right; color:#16a34a;">${r(vPurge, 2)} m/s</td>
          </tr>
          <tr style="font-weight:bold; font-size:1.05rem;">
            <td style="padding:0.3rem 0;">용접 중</td>
            <td style="text-align:right;">${dwyerWeldSCFH}</td>
            <td style="text-align:right;">${dwyerWeldLpm}</td>
            <td style="text-align:right; color:#2563eb;">${r(vWeld, 2)} m/s</td>
          </tr>
        </table>
        <p style="color:var(--text-muted); font-size:0.85rem; margin-top:0.5rem;">용접 시작 전 유량을 줄여야 석백(suck-back) 방지</p>
      </div>

      <div class="calc-result__breakdown" style="margin-top:0.75rem;">
        <p><strong>파이프 내부</strong></p>
        <p>OD ${r(odMm)}mm → ID ${r(idMm)}mm (벽 ${r(wallMm)}mm)</p>
        <p>길이: ${r(lengthMm)}mm (${r(lengthMm / 25.4)}")</p>
        <p>내부 체적: <strong>${r(volumeL, 3)} L</strong> | 단면적: ${r(areaMm2, 1)} mm²</p>
      </div>

      <div class="calc-result__breakdown" style="margin-top:0.75rem; border-top:1px solid var(--border); padding-top:0.75rem;">
        <p><strong>산소 농도 변화 (예상)</strong></p>
        <table style="width:100%; font-size:0.9rem; border-collapse:collapse;">
          <tr style="border-bottom:1px solid var(--border);">
            <th style="text-align:left; padding:0.25rem 0;">경과</th>
            <th style="text-align:right;">교환</th>
            <th style="text-align:right;">예상 O₂</th>
          </tr>`;

    [0.25, 0.5, 0.75, 1.0].forEach(frac => {
      const t = purgeTimeMin * frac;
      const n = practicalN * frac;
      const o2 = o2At(n);
      const color = o2 <= o2Target ? '#16a34a' : o2 <= 100 ? '#2563eb' : o2 <= 1000 ? '#ea580c' : 'inherit';
      const display = o2 > 1000 ? r(o2 / 10000 * 100, 2) + '%' : o2 + ' ppm';
      html += `
          <tr>
            <td style="padding:0.25rem 0;">${r(t, 1)}분</td>
            <td style="text-align:right;">${r(n, 1)}회</td>
            <td style="text-align:right; color:${color}; font-weight:${o2 <= o2Target ? 'bold' : 'normal'};">${display}${o2 <= o2Target ? ' ✓' : ''}</td>
          </tr>`;
    });

    html += `
        </table>
      </div>

      <div class="calc-result__breakdown" style="margin-top:0.75rem; border-top:1px solid var(--border); padding-top:0.75rem;">
        <p style="font-weight:bold;">퍼지 순서</p>
        <p>1. 양쪽 끝 캡/피팅으로 밀봉, 한쪽 입구 + 한쪽 벤트</p>
        <p>2. 플로미터 <strong>${dwyerSCFH} SCFH</strong>로 설정, 퍼지 시작</p>
        <p>3. <strong>${r(purgeTimeMin, 1)}분</strong> 후 산소 분석기로 확인</p>
        <p>4. <strong>10ppm 이하</strong> 확인되면 유량을 <strong>${dwyerWeldSCFH} SCFH</strong>로 줄이기</p>
        <p>5. 용접 시작 — 끝날 때까지 퍼지 유지</p>
      </div>

      <p class="calc-result__note">${sizeInfo.nominal} (ID ${r(idMm)}mm) × ${r(lengthMm)}mm — 10ppm 치환 퍼지</p>`;
    this._showResult('result-purge', html);
  },

  _showConvertResult(inch, mm) {
    // 가장 가까운 분수 inch 찾기
    const fractions = [
      [1, 64], [1, 32], [1, 16], [3, 32], [1, 8], [5, 32], [3, 16], [7, 32],
      [1, 4], [9, 32], [5, 16], [11, 32], [3, 8], [13, 32], [7, 16], [15, 32],
      [1, 2], [17, 32], [9, 16], [19, 32], [5, 8], [21, 32], [11, 16], [23, 32],
      [3, 4], [25, 32], [13, 16], [27, 32], [7, 8], [29, 32], [15, 16], [31, 32], [1, 1]
    ];

    const remainder = inch % 1;
    let closest = '';
    let minDiff = 1;

    fractions.forEach(([n, d]) => {
      const val = n / d;
      const diff = Math.abs(remainder - val);
      if (diff < minDiff) {
        minDiff = diff;
        closest = d === 1 ? `${n}` : `${n}/${d}`;
      }
    });

    const wholeInch = Math.floor(inch);
    const fracStr = wholeInch > 0 && closest !== '0'
      ? `${wholeInch} ${closest}"`
      : wholeInch > 0 ? `${wholeInch}"` : `${closest}"`;

    this._showResult('result-convert', `
      <div class="calc-result__grid">
        <div class="calc-result__item">
          <span class="calc-result__label">분수 inch (근사)</span>
          <span class="calc-result__value">${fracStr}</span>
        </div>
      </div>
    `);
  }
};

document.addEventListener('DOMContentLoaded', () => Calculator.init());
