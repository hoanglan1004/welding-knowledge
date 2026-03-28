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
    this._updateAutoWall();
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
    ['elbowSize', 'shrinkageSize', 'tangentSize', 'weldSize', 'purgeSize', 'autoSize'].forEach(id => {
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
  // 플랜지 모드: 히트싱크 보상 ×1.18, Duty 70%, BG 50% (표면 필렛)
  _weldType: 'butt', // 'butt' | 'flange'

  _setWeldType(type) {
    this._weldType = type;
    const buttBtn = document.getElementById('weldTypeButt');
    const flangeBtn = document.getElementById('weldTypeFlange');
    buttBtn.classList.toggle('calc-tab--active', type === 'butt');
    flangeBtn.classList.toggle('calc-tab--active', type === 'flange');
  },

  // ===== 10. 파이프 용접 레시피 (자동) =====
  // 파이프 번호 + 벽두께만 선택 → 1A/mil 기준 완전 자동 세팅
  _autoWeldType: 'butt',

  _setAutoType(type) {
    this._autoWeldType = type;
    document.getElementById('autoTypeButt').classList.toggle('calc-tab--active', type === 'butt');
    document.getElementById('autoTypeFlange').classList.toggle('calc-tab--active', type === 'flange');
  },

  _updateAutoWall() {
    const sel = document.getElementById('autoSize');
    if (!sel || !this.data) return;
    const walls = (this.data.pipeWalls || {})[sel.value] || [];
    const wallSel = document.getElementById('autoWall');
    if (!wallSel) return;
    wallSel.innerHTML = '';
    walls.forEach(w => {
      const opt = document.createElement('option');
      opt.value = w.inch;
      opt.textContent = w.label;
      wallSel.appendChild(opt);
    });
  },

  calcAutoParam() {
    const od = parseFloat(document.getElementById('autoSize').value);
    const wallInch = parseFloat(document.getElementById('autoWall').value);
    const material = document.getElementById('autoMaterial').value;
    const isFlange = this._autoWeldType === 'flange';
    const r = (v, d) => this._round(v, d != null ? d : 2);

    if (!wallInch || isNaN(wallInch)) {
      this._showResult('result-autoparam', '<p class="calc-result__error">벽두께를 선택하세요</p>');
      return;
    }

    // 기본 치수
    const wallMm = wallInch * 25.4;
    const wallMils = wallInch * 1000;
    const odMm = od * 25.4;
    const circumMm = Math.PI * odMm;
    const sizeInfo = this.data.pipeSizes.find(s => s.od_inch === od);
    const matName = material === '316l' ? '316L BA' : '304 BA';

    // OD 열용량 보정 (기준: 3" × 0.065")
    const refArea = Math.PI * (3.0 - 0.065) * 0.065;
    const curArea = Math.PI * (od - wallInch) * wallInch;
    const odFactor = Math.max(0.70, Math.min(1.10, Math.pow(curArea / refArea, 0.15)));

    // 1A/mil + 모드별 펄스 기본값
    const p = {};
    if (isFlange) {
      p.targetRMS = wallMils * odFactor * 1.18;
      p.bgPct = 50; p.duty = 70;
      p.optIPM = Math.max(6, Math.min(12, 12 - (wallMils - 30) * 6 / 79));
    } else {
      p.targetRMS = wallMils * odFactor;
      p.bgPct = 33; p.duty = 35;
      p.optIPM = Math.max(4, Math.min(7, 7 - (wallMils - 30) * 3 / 79));
    }

    // Peak 역산 (RMS → Peak)
    const rmsFactor = Math.sqrt(p.duty / 100 + Math.pow(p.bgPct / 100, 2) * (1 - p.duty / 100));
    p.peak = Math.max(30, Math.min(350, Math.round(p.targetRMS / rmsFactor)));
    p.bgAmps = p.peak * p.bgPct / 100;
    p.iAvg = p.peak * p.duty / 100 + p.bgAmps * (1 - p.duty / 100);
    p.iRMS = Math.sqrt(p.peak * p.peak * p.duty / 100 + p.bgAmps * p.bgAmps * (1 - p.duty / 100));

    // 이송속도
    p.optSpeed = p.optIPM * 25.4;
    p.optRPM = p.optIPM / (Math.PI * od);
    p.minIPM = Math.max(isFlange ? 5 : 3.5, p.optIPM * 0.85);
    p.maxIPM = Math.min(isFlange ? 13 : 7.5, p.optIPM * 1.15);
    p.minRPM = p.minIPM / (Math.PI * od);
    p.maxRPM = p.maxIPM / (Math.PI * od);
    p.weldTime = p.optRPM > 0 ? 60 / p.optRPM : 0;

    // PPS (75% 오버랩)
    const spotDia = 2.5 * wallInch;
    p.pps = spotDia > 0 ? Math.max(1, Math.round((p.optIPM / 60) / (spotDia * 0.25))) : 3;

    // 전압 / 열입력 / 아크갭 / 리플
    p.volt = wallMils < 80 ? 9 : wallMils < 150 ? 10 : 12;
    p.heatKJ = (p.volt * p.iAvg * 60) / (p.optSpeed * 1000);
    p.arcGap = isFlange ? 0.010 + wallInch / 4 : 0.010 + wallInch / 2;
    p.ripple = p.pps > 0 ? (p.optSpeed / 60) / p.pps : 0;

    // 전극 / 용가재 / 가스
    p.elec = wallMils <= 65 ? 'WCe20 1.6mm' : 'WCe20 2.4mm';
    const fSize = wallMils <= 65 ? '1.0~1.6mm' : wallMils <= 120 ? '1.6~2.0mm' : '2.0~2.4mm';
    p.filler = (material === '316l' ? 'ER316L ' : 'ER308L ') + fSize;
    p.gas = odMm < 30 ? '8~10' : odMm < 80 ? '10~12' : '12~15';
    p.purge = odMm < 30 ? '3~5' : odMm < 80 ? '5~8' : '8~12';

    // 열입력 판정
    const hiColor = p.heatKJ <= 0.5 ? '#16a34a' : p.heatKJ <= 1.0 ? '#ea580c' : '#dc2626';
    const hiLabel = p.heatKJ <= 0.3 ? '최적' : p.heatKJ <= 0.5 ? '양호' : p.heatKJ <= 1.0 ? '주의' : '위험';

    // 주의사항
    const cautions = [];
    if (material === '316l') cautions.push('로우셀파 의심 시 Peak +10~15%');
    cautions.push('백퍼지 필수 (변색 방지)');
    cautions.push('층간온도 150℃ 이하');
    if (wallMils <= 65) cautions.push('박판 — 번스루 주의, 낮은 듀티 유지');
    if (p.peak > 250) cautions.push('350A급 장비 필요 (Peak ' + p.peak + 'A)');

    // ── 결과 렌더링 ──
    const html = `
      <div style="background:var(--color-bg-alt, #f0f9ff); padding:1rem; border-radius:12px;">
        <p style="font-weight:bold; font-size:1.15rem;">${isFlange ? '🔩' : '⚡'} ${sizeInfo.nominal} × ${r(wallInch, 3)}" (${r(wallMm)}mm) ${matName}</p>
        <p style="font-size:0.9rem; color:var(--text-muted);">${isFlange ? '플랜지 필렛' : '맞대기 완전용입'} · ${Math.round(wallMils)}mil · 1A/mil → RMS ${r(p.targetRMS)}A · OD보정 ${r(odFactor)}</p>
      </div>

      <div class="calc-result__grid" style="margin-top:0.75rem;">
        <div class="calc-result__item calc-result__item--primary">
          <span class="calc-result__label">Peak</span>
          <span class="calc-result__value">${p.peak} A</span>
        </div>
        <div class="calc-result__item">
          <span class="calc-result__label">BG</span>
          <span class="calc-result__value">${r(p.bgAmps)} A (${p.bgPct}%)</span>
        </div>
        <div class="calc-result__item">
          <span class="calc-result__label">용접기 표시</span>
          <span class="calc-result__value">${r(p.iRMS)} A</span>
          <span class="calc-result__sub">Dynasty RMS</span>
        </div>
      </div>

      <div class="calc-result__breakdown" style="margin-top:0.75rem;">
        <p><strong>Dynasty 세팅값</strong></p>
        <table style="width:100%; font-size:0.95rem; border-collapse:collapse;">
          <tr>
            <td style="padding:0.3rem 0;">Peak</td><td style="text-align:right; font-weight:bold; font-size:1.1rem;">${p.peak} A</td>
            <td style="padding-left:1.5rem;">Duty</td><td style="text-align:right; font-weight:bold; font-size:1.1rem;">${p.duty}%</td>
          </tr>
          <tr>
            <td>BG</td><td style="text-align:right;">${p.bgPct}% → ${r(p.bgAmps)}A</td>
            <td style="padding-left:1.5rem;">PPS</td><td style="text-align:right;">${p.pps} Hz</td>
          </tr>
          <tr>
            <td>전압</td><td style="text-align:right;">~${p.volt} V</td>
            <td style="padding-left:1.5rem;">이론 평균</td><td style="text-align:right;">${r(p.iAvg)} A</td>
          </tr>
        </table>
      </div>

      <div class="calc-result__breakdown" style="margin-top:0.75rem;">
        <p><strong>이송속도 (턴테이블)</strong></p>
        <table style="width:100%; font-size:0.95rem; border-collapse:collapse;">
          <tr style="border-bottom:1px solid var(--border);">
            <th style="text-align:left; padding:0.25rem 0;"></th><th style="text-align:right;">IPM</th><th style="text-align:right;">RPM</th><th style="text-align:right;">mm/min</th>
          </tr>
          <tr style="color:#16a34a; font-weight:bold;">
            <td style="padding:0.25rem 0;">최적</td>
            <td style="text-align:right;">${r(p.optIPM)}</td>
            <td style="text-align:right;">${r(p.optRPM)}</td>
            <td style="text-align:right;">${r(p.optSpeed)}</td>
          </tr>
          <tr style="color:var(--text-muted);">
            <td>범위</td>
            <td style="text-align:right;">${r(p.minIPM)}~${r(p.maxIPM)}</td>
            <td style="text-align:right;">${r(p.minRPM)}~${r(p.maxRPM)}</td>
            <td></td>
          </tr>
        </table>
        <p style="color:var(--text-muted); font-size:0.85rem; margin-top:0.25rem;">1회전: ${r(p.weldTime)}초 · 원주: ${r(circumMm)}mm</p>
      </div>

      <div class="calc-result__breakdown" style="margin-top:0.75rem;">
        <table style="width:100%; font-size:0.95rem; border-collapse:collapse;">
          <tr>
            <td style="padding:0.3rem 0;"><strong>열입력</strong></td>
            <td style="text-align:right; color:${hiColor}; font-weight:bold;">${r(p.heatKJ, 3)} kJ/mm — ${hiLabel}</td>
          </tr>
          <tr>
            <td>리플 간격</td>
            <td style="text-align:right;">${r(p.ripple)} mm</td>
          </tr>
          <tr>
            <td>아크 갭</td>
            <td style="text-align:right;">${r(p.arcGap * 25.4)} mm (${r(p.arcGap, 3)}")</td>
          </tr>
        </table>
      </div>

      <div class="calc-result__breakdown" style="margin-top:0.75rem;">
        <p><strong>세팅</strong></p>
        <table style="width:100%; font-size:0.95rem; border-collapse:collapse;">
          <tr><td style="padding:0.3rem 0;">전극</td><td style="text-align:right;">${p.elec}</td></tr>
          <tr><td>용가재</td><td style="text-align:right;">${p.filler}</td></tr>
          <tr><td>실드가스 (Ar)</td><td style="text-align:right;">${p.gas} L/min</td></tr>
          <tr><td>백퍼지 (Ar)</td><td style="text-align:right;">${p.purge} L/min</td></tr>
        </table>
      </div>

      <div style="margin-top:0.75rem; background:#fef3c7; padding:0.75rem; border-radius:8px;">
        <p><strong>⚠️ ${matName} 주의</strong></p>
        ${cautions.map(c => '<p style="margin:0.15rem 0;">• ' + c + '</p>').join('')}
      </div>

      <p class="calc-result__note">${sizeInfo.nominal} (OD ${odMm}mm) · 1A/mil · Pro-Fusion 표준 기반 펄스 TIG</p>`;

    this._showResult('result-autoparam', html);
  },

  calcWeldParam() {
    const od = parseFloat(document.getElementById('weldSize').value);
    const isFlange = this._weldType === 'flange';
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

    // 산술 평균 전류 (열입력 계산용 이론값)
    const iAvg = peak * (duty / 100) + bgAmps * (1 - duty / 100);
    // 용접기 표시 평균 전류 (RMS - Dynasty 300 등 실제 용접기 디스플레이값)
    const iRMS = Math.sqrt(peak * peak * (duty / 100) + bgAmps * bgAmps * (1 - duty / 100));

    // ── 업계 표준 추천 엔진 (Pro-Fusion + OD 열용량 보정) ──
    // 출처: Pro-Fusion "Parameters for Orbital Tube Welding" (1999)
    // 기본: 벽 두께 → 전류(1A/mil), OD → RPM + 열용량 보정
    // 보정 원리: 파이프 단면적(thermal mass) 비율로 전류 자동 조정
    //   - 작은 OD: 열 축적 빠름 → 전류 감소
    //   - 큰 OD: 열 방출 큼 → 전류 유지/증가
    let rec = null;
    if (wallMm > 0) {
      rec = {};

      // 1. 목표 용접기 표시 전류(RMS): 1A/mil 기본 + OD 열용량 보정
      // Pro-Fusion: "1 ampere per 0.001 inch wall thickness" → 용접기 RMS 기준
      // OD 보정: 단면적 비율의 거듭제곱 (열 전달은 비선형)
      //   기준 파이프: 3" OD × 0.065" wall (보정 계수 = 1.0)
      //   공식: factor = (현재 단면적 / 기준 단면적) ^ 0.15
      const refOD = 3.0;       // 기준 외경 (inch)
      const refWall = 0.065;   // 기준 벽 두께 (inch)
      const refArea = Math.PI * (refOD - refWall) * refWall;
      const curArea = Math.PI * (od - wallInch) * wallInch;
      const thermalFactor = Math.pow(curArea / refArea, 0.15);
      // 범위 제한: 0.70 ~ 1.10 (극단적 보정 방지)
      rec.odFactor = Math.max(0.70, Math.min(1.10, thermalFactor));
      rec.isFlange = isFlange;

      if (isFlange) {
        // ── 플랜지-파이프 필렛 용접 모드 ──
        // 원리: 표면 필렛 (완전 용입 아님) + 플랜지 히트싱크 보상
        // 플랜지가 열을 빨아들이므로 평균 전류 ↑, 파이프 번스루 방지로 Peak ↓
        // 실측 기준: 3" OD, 0.065" wall → Peak 90A, Duty 70%, BG 50%, RPM 1.2

        // 1. 목표 용접기 표시 전류(RMS): 맞대기 기준 × OD 보정 × 히트싱크 보상(1.18)
        const flangeHeatSinkFactor = 1.18;
        rec.targetIRMS = wallMils * 1.0 * rec.odFactor * flangeHeatSinkFactor;

        // 2. 플랜지 펄스 전략: 높은 Duty(70%) + 높은 BG(50%)
        // 낮은 Peak로 파이프 보호, 높은 Duty/BG로 플랜지에 충분한 열 전달
        rec.bgPct = 50;
        rec.duty = 70;

        // 3. 속도: 맞대기보다 빠르게 (표면 wetting, 깊은 용입 불필요)
        // 실측: 3" OD → RPM 1.2 → 약 9.6 IPM
        // 플랜지 필렛은 6-12 IPM 범위 (두께별 보간)
        rec.optIPM = Math.max(6, Math.min(12, 12 - (wallMils - 30) * (6 / 79)));
        rec.minIPM = Math.max(5, rec.optIPM * 0.85);
        rec.maxIPM = Math.min(13, rec.optIPM * 1.15);
      } else {
        // ── 맞대기 용접 모드 (기존) ──
        rec.targetIRMS = wallMils * 1.0 * rec.odFactor;

        // 펄스 설정 (Pro-Fusion 표준)
        rec.bgPct = 33;
        rec.duty = 35;

        // 속도: 4-7 IPM (실무 검증 범위)
        rec.optIPM = Math.max(4, Math.min(7, 7 - (wallMils - 30) * (3 / 79)));
        rec.minIPM = Math.max(3.5, rec.optIPM * 0.85);
        rec.maxIPM = Math.min(7.5, rec.optIPM * 1.15);
      }

      // 공통: Peak, 속도, PPS 계산 (RMS 기준으로 Peak 역산)
      // RMS = Peak × √(Duty + BG%² × (1-Duty)) → Peak = targetRMS / rmsFactor
      const rmsFactor = Math.sqrt(rec.duty / 100 + Math.pow(rec.bgPct / 100, 2) * (1 - rec.duty / 100));
      rec.peak = Math.round(rec.targetIRMS / rmsFactor);
      if (rec.peak > 350) rec.peak = 350;
      if (rec.peak < 30) rec.peak = 30;
      rec.bgAmps = rec.peak * rec.bgPct / 100;
      rec.iAvg = rec.peak * (rec.duty / 100) + rec.bgAmps * (1 - rec.duty / 100);
      rec.iRMS = Math.sqrt(rec.peak * rec.peak * (rec.duty / 100) + rec.bgAmps * rec.bgAmps * (1 - rec.duty / 100));

      // 속도 → mm/min, RPM
      rec.optSpeed = rec.optIPM * 25.4;
      rec.optRPM = rec.optIPM / (Math.PI * od);
      rec.minRPM = rec.minIPM / (Math.PI * od);
      rec.maxRPM = rec.maxIPM / (Math.PI * od);

      // 목표 열입력
      rec.targetHI = (voltage * rec.iAvg * 60) / (rec.optSpeed * 1000);

      // 추천 PPS (Pro-Fusion: 75% 오버랩)
      const spotDia = 2.5 * wallInch;
      const stepPerPulse = spotDia * 0.25;
      rec.pps = stepPerPulse > 0 ? Math.max(1, Math.round((rec.optIPM / 60) / stepPerPulse)) : 3;

      // 아크 갭
      if (isFlange) {
        // 플랜지: 표면 필렛이므로 갭 줄임
        rec.arcGap = 0.010 + wallInch / 4;
      } else {
        // 맞대기: Pro-Fusion 공식 "0.010" + half the wall thickness"
        rec.arcGap = 0.010 + wallInch / 2;
      }
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
          <span class="calc-result__label">용접기 표시 평균</span>
          <span class="calc-result__value">${r(iRMS)} A</span>
          <span class="calc-result__sub">Dynasty 300 디스플레이 값 (RMS)</span>
        </div>
        <div class="calc-result__item">
          <span class="calc-result__label">이론 산술 평균</span>
          <span class="calc-result__value">${r(iAvg)} A</span>
          <span class="calc-result__sub">Peak ${peak}A × ${duty}% + BG ${r(bgAmps)}A × ${100-duty}%</span>
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
        <p style="font-weight:bold; font-size:1.05rem;">${rec.isFlange ? '🔩 플랜지 필렛' : '⚡ 맞대기 완전용입'} 추천 (${wallDisplay}, OD ${od}")</p>
        <p style="color:var(--text-muted); font-size:0.85rem;">${rec.isFlange
          ? '1A/mil(RMS) × OD(' + r(rec.odFactor) + ') × 히트싱크(1.18) + Duty 70% + BG 50%'
          : 'Pro-Fusion 1A/mil(RMS) × OD 보정(' + r(rec.odFactor) + ') + 4~7 IPM + BG 1/3 + Duty 35%'}</p>
        <p style="color:var(--text-muted); font-size:0.8rem;">${rec.isFlange
          ? '※ 표면 필렛. 낮은 Peak + 높은 Duty로 파이프 번스루 방지'
          : '※ 오비탈 기준. 턴테이블(평용접)은 최대 ~15% 빠를 수 있음'}</p>
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
            <td>용접기 평균</td>
            <td style="text-align:right;">${r(iRMS)}A</td>
            <td style="text-align:right;">${r(rec.iRMS)}A</td>
            <td style="text-align:right;">${Math.abs(iRMS - rec.targetIRMS) <= rec.targetIRMS * 0.15 ? '<span style="color:#16a34a">OK</span>' : iRMS > rec.targetIRMS * 1.15 ? '<span style="color:#ea580c">과다</span>' : '<span style="color:#2563eb">부족</span>'}</td>
          </tr>
          <tr style="color:var(--text-muted);">
            <td>이론 평균</td>
            <td style="text-align:right;">${r(iAvg)}A</td>
            <td style="text-align:right;">${r(rec.iAvg)}A</td>
            <td style="text-align:right; font-size:0.8rem;">열입력 계산용</td>
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
      const iAvgOk = Math.abs(iRMS - rec.targetIRMS) <= rec.targetIRMS * 0.15;
      const rpmOk = rpm > 0 ? Math.abs(rpm - rec.optRPM) / rec.optRPM <= 0.2 : false;
      const allGood = iAvgOk && (rpm <= 0 || rpmOk);

      if (allGood && rpm > 0) {
        html += `<p style="color:#16a34a; margin-top:0.5rem; font-weight:bold;">✓ 현재 설정이 업계 표준과 일치합니다</p>`;
      } else {
        html += `<p style="margin-top:0.5rem; font-weight:bold;">조정 가이드:</p>`;
        if (!iAvgOk) {
          if (iRMS > rec.targetIRMS * 1.15) {
            html += `<p>• 용접기 평균 ${r(iRMS)}A → <strong>${r(rec.targetIRMS)}A</strong> (Peak↓ 또는 Duty↓)</p>`;
          } else {
            html += `<p>• 용접기 평균 ${r(iRMS)}A → <strong>${r(rec.targetIRMS)}A</strong> (Peak↑ 또는 Duty↑)</p>`;
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
          <p style="color:var(--text-muted); font-size:0.85rem;">STS: 벽 두께(mil)당 1A 용접기 RMS 전류 + 맞대기 4~7 IPM (평균 5) 이동속도 연립 계산</p>
        </div>`;
      }
    }

    // ── STS 팁 ──
    html += `
      <div class="calc-result__breakdown" style="margin-top:0.75rem; border-top:1px solid var(--border); padding-top:0.75rem;">
        <p><strong>STS 열변형 줄이기</strong></p>
        <p>1. Duty 30~40% (냉각 시간 확보)</p>
        <p>2. Peak:BG = 3:1~5:1 (BG 최소화)</p>
        <p>3. 벽 두께에 맞는 속도 유지 (맞대기 4~7 IPM, 평균 5)</p>
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

      <div class="calc-result__breakdown" style="margin-top:0.75rem; border-top:1px solid var(--border); padding-top:0.75rem; background:var(--color-bg-alt, #f0f9ff); padding:0.75rem; border-radius:8px;">
        <p style="font-weight:bold; font-size:1.05rem;">입/출 벤트 추천 (${sizeInfo.nominal})</p>
        <p style="color:var(--text-muted); font-size:0.8rem;">근거: AWS 실무 가이드 + NCPWB Purge Tips + Huntingdon Fusion 기준</p>
        ${(() => {
          // 벤트 사이즈 추천 (실무 데이터 종합)
          // ≤1": 1/8" 입구, 1/8"~3/16" 출구
          // 1.5"~2": 1/4" 입구, 1/4" 출구
          // 2.5"~3": 1/4" 입구, 1/4"~3/8" 출구
          // 4"+: 3/8" 입구, 3/8" 출구 (또는 1/4" × 2)
          // 원칙: 출구 ≥ 입구 (압력 축적 방지)
          let inlet, outlet, inletMm, outletMm, note;
          if (od <= 1.0) {
            inlet = '1/8"'; outlet = '3/16"';
            inletMm = 3.2; outletMm = 4.8;
            note = '소구경 — 유량 적어 작은 벤트로 충분';
          } else if (od <= 2.0) {
            inlet = '1/4"'; outlet = '1/4"';
            inletMm = 6.4; outletMm = 6.4;
            note = '표준 — 1/4" 단일 벤트 (가장 일반적)';
          } else if (od <= 3.0) {
            inlet = '1/4"'; outlet = '3/8"';
            inletMm = 6.4; outletMm = 9.5;
            note = '출구를 입구보다 크게 — 내압 방지';
          } else {
            inlet = '3/8"'; outlet = '3/8"';
            inletMm = 9.5; outletMm = 9.5;
            note = '대구경 — 1/4"×2 병렬도 가능';
          }
          return `
        <table style="width:100%; font-size:0.95rem; margin-top:0.5rem; border-collapse:collapse;">
          <tr style="border-bottom:1px solid var(--border);">
            <th style="text-align:left; padding:0.3rem 0;"></th>
            <th style="text-align:right;">사이즈</th>
            <th style="text-align:right;">mm</th>
            <th style="text-align:right;">위치</th>
          </tr>
          <tr>
            <td style="padding:0.3rem 0;">입구 (Inlet)</td>
            <td style="text-align:right; font-weight:bold;">${inlet}</td>
            <td style="text-align:right;">${inletMm} mm</td>
            <td style="text-align:right; color:#2563eb;">하부 (6시)</td>
          </tr>
          <tr>
            <td style="padding:0.3rem 0;">출구/벤트 (Outlet)</td>
            <td style="text-align:right; font-weight:bold;">${outlet}</td>
            <td style="text-align:right;">${outletMm} mm</td>
            <td style="text-align:right; color:#ea580c;">상부 (12시)</td>
          </tr>
        </table>
        <p style="font-size:0.85rem; margin-top:0.4rem;">💡 ${note}</p>
        <p style="font-size:0.8rem; color:var(--text-muted); margin-top:0.3rem;">원칙: 출구 ≥ 입구 (내압 축적 시 석백 발생). 아르곤은 공기보다 무거워 입구=하부, 출구=상부.</p>`;
        })()}
      </div>

      <div class="calc-result__breakdown" style="margin-top:0.75rem; border-top:1px solid var(--border); padding-top:0.75rem;">
        <p style="font-weight:bold;">퍼지 순서</p>
        <p>1. 양쪽 끝 밀봉 — 입구(하부) + 벤트(상부)</p>
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
  // ===== 11. 공학 계산기 (용접 특화) =====
  _sciExpr: '',
  _sciAngleMode: 'deg',

  _sci(cmd) {
    switch (cmd) {
      case 'clear':
        this._sciExpr = '';
        document.getElementById('sciExprLine').textContent = '';
        break;
      case 'del': {
        const fns = ['sin(', 'cos(', 'tan(', '√('];
        const match = fns.find(f => this._sciExpr.endsWith(f));
        this._sciExpr = this._sciExpr.slice(0, -(match ? match.length : 1));
        break;
      }
      case 'eval': {
        const result = this._sciEvalExpr();
        if (result !== 'Error') {
          document.getElementById('sciExprLine').textContent = this._sciExpr + ' =';
          this._sciExpr = String(result);
        }
        break;
      }
      case 'negate':
        if (this._sciExpr === '' || this._sciExpr === '0') { this._sciExpr = '-'; }
        else if (this._sciExpr.startsWith('-')) { this._sciExpr = this._sciExpr.slice(1); }
        else { this._sciExpr = '-' + this._sciExpr; }
        break;
      case 'angle':
        this._sciAngleMode = this._sciAngleMode === 'deg' ? 'rad' : 'deg';
        document.getElementById('sciAngleBtn').textContent = this._sciAngleMode.toUpperCase();
        break;
      case 'paren': {
        const o = (this._sciExpr.match(/\(/g) || []).length;
        const c = (this._sciExpr.match(/\)/g) || []).length;
        this._sciExpr += o > c ? ')' : '(';
        break;
      }
      default:
        this._sciExpr += cmd;
    }
    this._sciUpdateDisplay();
  },

  _sciUpdateDisplay() {
    const el = document.getElementById('sciResultLine');
    if (!el) return;
    if (!this._sciExpr) { el.textContent = '0'; return; }
    const live = this._sciEvalExpr();
    el.textContent = live !== 'Error' ? this._sciFormatNum(live) : this._sciExpr;
  },

  _sciEvalExpr() {
    let e = this._sciExpr;
    if (!e) return 0;
    e = e.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/\^/g, '**');
    e = e.replace(/π/g, '(Math.PI)');
    e = e.replace(/√\(/g, '_sq(');
    e = e.replace(/sin\(/g, '_si(');
    e = e.replace(/cos\(/g, '_co(');
    e = e.replace(/tan\(/g, '_ta(');
    const d = this._sciAngleMode === 'deg';
    const k = Math.PI / 180;
    try {
      return new Function('_si', '_co', '_ta', '_sq',
        'return ' + e
      )(
        d ? x => Math.sin(x * k) : Math.sin,
        d ? x => Math.cos(x * k) : Math.cos,
        d ? x => Math.tan(x * k) : Math.tan,
        Math.sqrt
      );
    } catch { return 'Error'; }
  },

  _sciFormatNum(n) {
    if (typeof n !== 'number' || !isFinite(n)) return 'Error';
    if (Number.isInteger(n) && Math.abs(n) < 1e12) return n.toLocaleString();
    if (Math.abs(n) < 0.0001 || Math.abs(n) >= 1e10) return n.toExponential(6);
    return parseFloat(n.toPrecision(10)).toString();
  },

  // --- 용접 공식: 펄스 전류 ---
  calcSciCurrent() {
    const peak = parseFloat(document.getElementById('sciPeak').value);
    const bgPct = parseFloat(document.getElementById('sciBG').value) / 100;
    const duty = parseFloat(document.getElementById('sciDuty').value) / 100;
    if (isNaN(peak) || isNaN(bgPct) || isNaN(duty)) {
      this._showResult('result-scicurrent', '<p class="calc-result__error">모든 값을 입력하세요</p>');
      return;
    }
    const bg = peak * bgPct;
    const iAvg = peak * duty + bg * (1 - duty);
    const iRMS = Math.sqrt(peak * peak * duty + bg * bg * (1 - duty));
    const ratio = bgPct > 0 ? this._round(1 / bgPct, 1) : '∞';
    this._showResult('result-scicurrent', `
      <div class="calc-result__grid" style="margin-top:0.5rem;">
        <div class="calc-result__item calc-result__item--primary">
          <span class="calc-result__label">RMS 전류</span>
          <span class="calc-result__value">${this._round(iRMS, 1)} A</span>
          <span class="calc-result__sub">용접기 디스플레이</span>
        </div>
        <div class="calc-result__item">
          <span class="calc-result__label">산술 평균</span>
          <span class="calc-result__value">${this._round(iAvg, 1)} A</span>
          <span class="calc-result__sub">열입력 계산용</span>
        </div>
        <div class="calc-result__item">
          <span class="calc-result__label">BG 전류</span>
          <span class="calc-result__value">${this._round(bg, 1)} A</span>
          <span class="calc-result__sub">Peak:BG = ${ratio}:1</span>
        </div>
      </div>
      <p class="calc-result__note">RMS = √(Peak²×D + BG²×(1-D)) · 평균 = Peak×D + BG×(1-D)</p>`);
  },

  // --- 용접 공식: 열입력 ---
  calcSciHeatInput() {
    const v = parseFloat(document.getElementById('sciHIVolt').value);
    const i = parseFloat(document.getElementById('sciHIAmp').value);
    const spd = parseFloat(document.getElementById('sciHISpeed').value);
    if (isNaN(v) || isNaN(i) || isNaN(spd) || spd <= 0) {
      this._showResult('result-sciheat', '<p class="calc-result__error">모든 값을 입력하세요</p>');
      return;
    }
    const hJ = (v * i * 60) / spd;
    const hKJ = hJ / 1000;
    const color = hKJ <= 0.5 ? '#16a34a' : hKJ <= 1.0 ? '#ea580c' : '#dc2626';
    const label = hKJ <= 0.3 ? '최적' : hKJ <= 0.5 ? '양호' : hKJ <= 1.0 ? '주의 (변형 가능)' : '위험 (열변형)';
    this._showResult('result-sciheat', `
      <div class="calc-result__grid" style="margin-top:0.5rem;">
        <div class="calc-result__item calc-result__item--primary">
          <span class="calc-result__label">열입력</span>
          <span class="calc-result__value" style="color:${color}">${this._round(hKJ, 3)} kJ/mm</span>
          <span class="calc-result__sub">${label}</span>
        </div>
        <div class="calc-result__item">
          <span class="calc-result__label">J/mm</span>
          <span class="calc-result__value">${this._round(hJ, 1)}</span>
        </div>
      </div>
      <p class="calc-result__note">HI = (V × I × 60) / Speed(mm/min) / 1000 · STS ≤0.5 kJ/mm 권장</p>`);
  },

  // --- 용접 공식: 속도 변환 ---
  calcSciSpeed() {
    const ipm = parseFloat(document.getElementById('sciIPM').value) || 0;
    const rpm = parseFloat(document.getElementById('sciRPM2').value) || 0;
    const od = parseFloat(document.getElementById('sciOD').value);
    if (isNaN(od) || od <= 0) {
      this._showResult('result-scispeed', '<p class="calc-result__error">OD를 입력하세요</p>');
      return;
    }
    const circ = Math.PI * od;
    let rIPM, rRPM, rMM;
    if (ipm > 0) { rIPM = ipm; rRPM = ipm / circ; }
    else if (rpm > 0) { rRPM = rpm; rIPM = rpm * circ; }
    else { this._showResult('result-scispeed', '<p class="calc-result__error">IPM 또는 RPM을 입력하세요</p>'); return; }
    rMM = rIPM * 25.4;
    const wt = rRPM > 0 ? 60 / rRPM : 0;
    this._showResult('result-scispeed', `
      <div class="calc-result__grid" style="margin-top:0.5rem;">
        <div class="calc-result__item"><span class="calc-result__label">IPM</span><span class="calc-result__value">${this._round(rIPM, 2)}</span></div>
        <div class="calc-result__item"><span class="calc-result__label">RPM</span><span class="calc-result__value">${this._round(rRPM, 3)}</span></div>
        <div class="calc-result__item"><span class="calc-result__label">mm/min</span><span class="calc-result__value">${this._round(rMM, 1)}</span></div>
      </div>
      <p class="calc-result__note">1회전: ${this._round(wt, 1)}초 · 원주: ${this._round(circ * 25.4, 1)}mm · IPM = RPM × π × OD</p>`);
  }
};

document.addEventListener('DOMContentLoaded', () => Calculator.init());
