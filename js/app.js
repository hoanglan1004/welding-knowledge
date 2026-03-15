/**
 * app.js
 * 메인 애플리케이션 로직.
 * - index.html: 트러블슈팅 퀵 액세스 + 카드 렌더링
 * - detail.html: 상세 페이지 렌더링
 */

const App = {
  async init() {
    await DataLoader.loadAll();

    if (document.getElementById('cardGrid')) {
      this.initIndexPage();
    } else if (document.getElementById('detailContent')) {
      this.initDetailPage();
    }
  },

  // ========================
  // 메인 페이지 (index.html)
  // ========================

  initIndexPage() {
    this.renderTroubleshootQuick();
    this.renderCards(DataLoader.allItems);
    Search.init();
  },

  /**
   * 현장 문제해결 퀵 액세스 버튼을 렌더링한다.
   */
  renderTroubleshootQuick() {
    const grid = document.getElementById('troubleshootGrid');
    if (!grid) return;

    const items = DataLoader.raw.troubleshooting;
    grid.innerHTML = items.map(item => `
      <a href="detail.html?type=troubleshooting&id=${item.id}" class="ts-btn ts-btn--${item.urgency}">
        <span class="ts-btn__icon">${item.icon}</span>
        <span class="ts-btn__label">${item.symptom}</span>
      </a>
    `).join('');
  },

  /**
   * 카드 목록을 화면에 렌더링한다.
   */
  renderCards(items) {
    const grid = document.getElementById('cardGrid');
    const noResults = document.getElementById('noResults');
    const countEl = document.getElementById('resultCount');

    if (items.length === 0) {
      grid.innerHTML = '';
      noResults.style.display = 'block';
      countEl.textContent = '';
      return;
    }

    noResults.style.display = 'none';
    countEl.textContent = `${items.length}건`;

    grid.innerHTML = items.map(item => this._createCardHTML(item)).join('');

    // 카드 클릭 이벤트
    grid.querySelectorAll('.card').forEach(card => {
      card.addEventListener('click', () => {
        const type = card.dataset.type;
        const id = card.dataset.id;
        window.location.href = `detail.html?type=${type}&id=${id}`;
      });
    });
  },

  /**
   * 하나의 카드 HTML을 만든다.
   */
  _createCardHTML(item) {
    const typeClass = this._getTypeClass(item._type);
    const tagLabel = this._getTagLabel(item._type);
    const tagClass = this._getTagClass(item._type);
    const subtitle = this._getSubtitle(item);
    const keywords = this._getKeywords(item);

    // 트러블슈팅 카드는 특별 처리
    if (item._type === 'troubleshooting') {
      return `
        <div class="card card--trouble" data-type="${item._type}" data-id="${item.id}">
          <div class="card__header">
            <span class="card__title">${item.icon} ${item.symptom}</span>
            <span class="card__tag card__tag--trouble card__tag--${item.urgency}">${item.urgency === 'critical' ? '긴급' : item.urgency === 'high' ? '중요' : item.urgency === 'medium' ? '보통' : '참고'}</span>
          </div>
          <div class="card__summary">${item.description}</div>
          <div class="card__quickfix">
            <strong>즉시 조치:</strong> ${item.quickFixes[0]}
          </div>
        </div>
      `;
    }

    return `
      <div class="card ${typeClass}" data-type="${item._type}" data-id="${item.id}">
        <div class="card__header">
          <span class="card__title">${item.name}</span>
          <span class="card__tag ${tagClass}">${tagLabel}</span>
        </div>
        ${subtitle ? `<div class="card__subtitle">${subtitle}</div>` : ''}
        <div class="card__summary">${item.summary || item.description || item.principle || ''}</div>
        ${keywords.length > 0 ? `
          <div class="card__keywords">
            ${keywords.map(k => `<span class="card__keyword">${k}</span>`).join('')}
          </div>
        ` : ''}
      </div>
    `;
  },

  _getTypeClass(type) {
    const map = {
      processes: 'card--process',
      materials: 'card--material',
      defects: 'card--defect',
      inspections: 'card--inspection',
      troubleshooting: 'card--trouble',
      science: 'card--science'
    };
    return map[type] || '';
  },

  _getTagLabel(type) {
    const map = {
      processes: '공법',
      materials: '소재',
      defects: '결함',
      inspections: '검사',
      troubleshooting: '문제해결',
      science: '과학'
    };
    return map[type] || '';
  },

  _getTagClass(type) {
    const map = {
      processes: 'card__tag--process',
      materials: 'card__tag--material',
      defects: 'card__tag--defect',
      inspections: 'card__tag--inspection',
      troubleshooting: 'card__tag--trouble',
      science: 'card__tag--science'
    };
    return map[type] || '';
  },

  _getSubtitle(item) {
    if (item.nameEn) return item.nameEn;
    if (item.composition) return item.composition;
    if (item.category) return item.category;
    return '';
  },

  _getKeywords(item) {
    if (item._type === 'processes') {
      return (item.applications || []).slice(0, 4);
    }
    if (item._type === 'materials') {
      return (item.commonUse || []).slice(0, 4);
    }
    if (item._type === 'defects') {
      return (item.detection || []).slice(0, 4);
    }
    if (item._type === 'inspections') {
      return (item.detectableDefects || []).slice(0, 4);
    }
    if (item._type === 'science') {
      return (item.keyPoints || []).slice(0, 3).map(k => k.title.split('—')[0].trim());
    }
    return [];
  },

  // ============================
  // 상세 페이지 (detail.html)
  // ============================

  initDetailPage() {
    const params = new URLSearchParams(window.location.search);
    const type = params.get('type');
    const id = params.get('id');

    if (!type || !id) {
      this._showDetailError('잘못된 접근입니다.');
      return;
    }

    const item = DataLoader.findItem(type, id);
    if (!item) {
      this._showDetailError('항목을 찾을 수 없습니다.');
      return;
    }

    document.title = `${item.name || item.symptom} - 용접 지식 백과`;

    const container = document.getElementById('detailContent');
    switch (type) {
      case 'processes':
        container.innerHTML = this._renderProcess(item);
        break;
      case 'materials':
        container.innerHTML = this._renderMaterial(item);
        break;
      case 'defects':
        container.innerHTML = this._renderDefect(item);
        break;
      case 'inspections':
        container.innerHTML = this._renderInspection(item);
        break;
      case 'troubleshooting':
        container.innerHTML = this._renderTroubleshooting(item);
        break;
      case 'science':
        container.innerHTML = this._renderScience(item);
        break;
      default:
        this._showDetailError('알 수 없는 항목 유형입니다.');
    }
  },

  _showDetailError(message) {
    const container = document.getElementById('detailContent');
    container.innerHTML = `
      <div class="no-results">
        <p>${message}</p>
        <p><a href="index.html">목록으로 돌아가기</a></p>
      </div>
    `;
  },

  // --- 현장 문제해결 상세 렌더링 ---
  _renderTroubleshooting(item) {
    const urgencyLabel = { critical: '긴급', high: '중요', medium: '보통', low: '참고' };
    const urgencyColor = { critical: '#c0392b', high: '#e74c3c', medium: '#e67e22', low: '#3498db' };

    return `
      <div class="ts-detail">
        <div class="ts-detail__header">
          <span class="ts-detail__icon">${item.icon}</span>
          <h1 class="ts-detail__title">${item.symptom}</h1>
        </div>
        <span class="detail__category" style="background: ${urgencyColor[item.urgency]}">${urgencyLabel[item.urgency]} · ${item.category}</span>
        <div class="detail__summary">${item.description}</div>

        <div class="ts-quickfix-section">
          <h2 class="ts-quickfix-section__title">즉시 조치</h2>
          ${item.quickFixes.map((fix, i) => `
            <div class="ts-quickfix">
              <span class="ts-quickfix__num">${i + 1}</span>
              <span class="ts-quickfix__text">${fix}</span>
            </div>
          `).join('')}
        </div>

        ${this._renderCautions('원인 분석', item.causes)}

        ${item.detailedSolutions ? `
          <div class="detail-section">
            <h2 class="detail-section__title">상세 해결 방법</h2>
            ${item.detailedSolutions.map(sol => `
              <div class="ts-solution">
                <div class="ts-solution__action">${sol.action}</div>
                <div class="ts-solution__detail">${sol.detail}</div>
              </div>
            `).join('')}
          </div>
        ` : ''}

        ${this._renderRelatedDefects(item.relatedDefects)}
        ${this._renderRelatedProcesses(item.relatedProcesses)}

        <div class="ts-nav">
          <a href="index.html#troubleshoot-section" class="ts-nav__back">다른 문제 보기</a>
        </div>
      </div>
    `;
  },

  // --- 용접 과학 상세 렌더링 ---
  _renderScience(item) {
    let practicalGuide = '';
    if (item.practicalGuide) {
      const pg = item.practicalGuide;
      practicalGuide = `
        <div class="detail-section">
          <h2 class="detail-section__title">${pg.title}</h2>
          <div class="settings-table-wrapper">
            <table class="settings-table">
              <thead>
                <tr>
                  <th>시나리오</th>
                  <th>피크</th>
                  <th>베이스</th>
                  <th>주파수</th>
                  <th>듀티</th>
                  <th>비고</th>
                </tr>
              </thead>
              <tbody>
                ${pg.settings.map(s => `
                  <tr>
                    <td data-label="시나리오"><strong>${s.scenario}</strong></td>
                    <td data-label="피크">${s.peak || s.peakCurrent || ''}</td>
                    <td data-label="베이스">${s.base || s.baseCurrent || ''}</td>
                    <td data-label="주파수">${s.frequency}</td>
                    <td data-label="듀티">${s.duty || s.dutyCycle || ''}</td>
                    <td data-label="비고">${s.notes}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    return `
      <h1 class="detail__title">${item.name}</h1>
      <div class="detail__name-en">${item.nameEn || ''}</div>
      <span class="detail__category" style="background: var(--color-tag-science)">${item.category}</span>
      <div class="detail__summary">${item.summary}</div>

      <div class="detail-section">
        <h2 class="detail-section__title">핵심 포인트</h2>
        ${(item.keyPoints || []).map(kp => `
          <div class="science-point">
            <div class="science-point__title">${kp.title}</div>
            <div class="science-point__detail">${kp.detail}</div>
          </div>
        `).join('')}
      </div>

      ${practicalGuide}

      ${item.relatedTopics ? `
        <div class="detail-section">
          <h2 class="detail-section__title">관련 항목</h2>
          <div class="related-links">
            ${item.relatedTopics.map(topicId => {
              // 트러블슈팅에서 찾기
              let found = DataLoader.findItem('troubleshooting', topicId);
              if (found) return `<a href="detail.html?type=troubleshooting&id=${topicId}" class="related-link">${found.icon} ${found.symptom}</a>`;
              // 과학에서 찾기
              found = DataLoader.findItem('science', topicId);
              if (found) return `<a href="detail.html?type=science&id=${topicId}" class="related-link">${found.name}</a>`;
              return `<span class="related-link">${topicId}</span>`;
            }).join('')}
          </div>
        </div>
      ` : ''}
    `;
  },

  // --- 용접 공법 상세 렌더링 ---
  _renderProcess(item) {
    let pulseSection = '';
    if (item.pulseSettings && item.pulseSettings.length > 0) {
      pulseSection = `
        <div class="detail-section">
          <h2 class="detail-section__title">펄스 세팅 가이드</h2>
          <div class="settings-table-wrapper">
            <table class="settings-table">
              <thead>
                <tr>
                  <th>시나리오</th>
                  <th>피크 전류</th>
                  <th>베이스 전류</th>
                  <th>주파수</th>
                  <th>듀티</th>
                  <th>비고</th>
                </tr>
              </thead>
              <tbody>
                ${item.pulseSettings.map(s => `
                  <tr>
                    <td data-label="시나리오"><strong>${s.scenario}</strong></td>
                    <td data-label="피크 전류">${s.peakCurrent}</td>
                    <td data-label="베이스 전류">${s.baseCurrent}</td>
                    <td data-label="주파수">${s.frequency}</td>
                    <td data-label="듀티">${s.dutyCycle}</td>
                    <td data-label="비고">${s.notes}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    return `
      <h1 class="detail__title">${item.name}</h1>
      <div class="detail__name-en">${item.nameEn || ''}</div>
      <span class="detail__category" style="background: var(--color-tag-process)">${item.category}</span>
      <div class="detail__summary">${item.summary}</div>

      ${this._renderListSection('보호가스', item.shieldingGas)}
      ${this._renderListSection('적용 분야', item.applications)}
      ${this._renderProsCons(item.pros, item.cons)}
      ${this._renderSettingsTable(item.settings)}
      ${pulseSection}
      ${this._renderTips(item.tips)}
      ${this._renderRelatedDefects(item.relatedDefects)}
    `;
  },

  // --- 소재 상세 렌더링 ---
  _renderMaterial(item) {
    let metallurgySection = '';
    if (item.metallurgy) {
      const m = item.metallurgy;
      metallurgySection = `
        <div class="detail-section">
          <h2 class="detail-section__title">금속학 심화</h2>
          ${m.sensitization ? `<div class="science-point"><div class="science-point__title">예민화 (Sensitization)</div><div class="science-point__detail">${m.sensitization}</div></div>` : ''}
          ${m.lowSulfur ? `<div class="science-point"><div class="science-point__title">로우셀파 (Low Sulfur) 효과</div><div class="science-point__detail">${m.lowSulfur}</div></div>` : ''}
          ${m.manufacturing ? `<div class="science-point"><div class="science-point__title">제조 공정</div><div class="science-point__detail">${m.manufacturing}</div></div>` : ''}
          ${m.surfaceFinish ? `
            <div class="science-point"><div class="science-point__title">표면 처리: BA</div><div class="science-point__detail">${m.surfaceFinish.BA}</div></div>
            <div class="science-point"><div class="science-point__title">표면 처리: EP</div><div class="science-point__detail">${m.surfaceFinish.EP}</div></div>
          ` : ''}
        </div>
      `;
    }

    return `
      <h1 class="detail__title">${item.name}</h1>
      <span class="detail__category" style="background: var(--color-tag-material)">${item.category}</span>
      <div class="detail__summary">${item.composition}</div>

      ${this._renderListSection('특성', item.characteristics)}
      ${this._renderListSection('주요 용도', item.commonUse)}
      ${this._renderCautions('용접 시 주의사항', item.weldingNotes)}
      ${this._renderRecommendedProcesses(item.recommendedProcesses)}
      ${metallurgySection}
      ${this._renderCautions('추가 주의사항', item.cautions)}
      ${this._renderRelatedMaterials(item.relatedMaterials)}
    `;
  },

  // --- 결함 상세 렌더링 ---
  _renderDefect(item) {
    return `
      <h1 class="detail__title">${item.name}</h1>
      <div class="detail__name-en">${item.nameEn || ''}</div>
      <span class="detail__category" style="background: var(--color-tag-defect)">${item.category} · 심각도: ${item.severity || '-'}</span>
      <div class="detail__summary">${item.description}</div>

      ${this._renderCautions('발생 원인', item.causes)}
      ${this._renderTips(item.prevention, '예방 방법')}
      ${this._renderListSection('검출 방법', item.detection)}
      ${item.acceptanceCriteria ? `
        <div class="detail-section">
          <h2 class="detail-section__title">합부 판정 기준</h2>
          <div class="tip-box">${item.acceptanceCriteria}</div>
        </div>
      ` : ''}
      ${this._renderRelatedProcesses(item.relatedProcesses)}
    `;
  },

  // --- 비파괴검사 상세 렌더링 ---
  _renderInspection(item) {
    return `
      <h1 class="detail__title">${item.name}</h1>
      <div class="detail__name-en">${item.nameEn || ''}</div>
      <span class="detail__category" style="background: var(--color-tag-inspection)">${item.category}</span>
      <div class="detail__summary">${item.principle}</div>

      ${this._renderListSection('검출 가능 결함', item.detectableDefects)}
      ${this._renderProsCons(item.pros, item.cons)}
      ${item.applicableThickness ? `
        <div class="detail-section">
          <h2 class="detail-section__title">적용 가능 두께</h2>
          <div class="tip-box">${item.applicableThickness}</div>
        </div>
      ` : ''}
      ${this._renderRelatedDefectsFromInspection(item.relatedDefects)}
    `;
  },

  // ========================
  // 공통 렌더링 헬퍼 함수
  // ========================

  _renderListSection(title, items) {
    if (!items || items.length === 0) return '';
    return `
      <div class="detail-section">
        <h2 class="detail-section__title">${title}</h2>
        <ul class="detail-section__list">
          ${items.map(i => `<li>${i}</li>`).join('')}
        </ul>
      </div>
    `;
  },

  _renderProsCons(pros, cons) {
    if ((!pros || pros.length === 0) && (!cons || cons.length === 0)) return '';
    return `
      <div class="detail-section">
        <h2 class="detail-section__title">장단점</h2>
        <div class="pros-cons">
          <div>
            <div class="pros-label">장점</div>
            <ul class="pros-list">
              ${(pros || []).map(p => `<li>+ ${p}</li>`).join('')}
            </ul>
          </div>
          <div>
            <div class="cons-label">단점</div>
            <ul class="cons-list">
              ${(cons || []).map(c => `<li>- ${c}</li>`).join('')}
            </ul>
          </div>
        </div>
      </div>
    `;
  },

  _renderSettingsTable(settings) {
    if (!settings || settings.length === 0) return '';
    return `
      <div class="detail-section">
        <h2 class="detail-section__title">소재별 세팅 가이드</h2>
        <div class="settings-table-wrapper">
          <table class="settings-table">
            <thead>
              <tr>
                <th>소재</th>
                <th>두께</th>
                <th>전류</th>
                <th>전압</th>
                <th>가스유량</th>
                <th>전극</th>
                <th>용접봉</th>
                <th>비고</th>
              </tr>
            </thead>
            <tbody>
              ${settings.map(s => `
                <tr>
                  <td data-label="소재"><strong>${s.material}</strong></td>
                  <td data-label="두께">${s.thickness}</td>
                  <td data-label="전류">${s.current}</td>
                  <td data-label="전압">${s.voltage}</td>
                  <td data-label="가스유량">${s.gasFlow}</td>
                  <td data-label="전극">${s.electrode}</td>
                  <td data-label="용접봉">${s.fillerWire}</td>
                  <td data-label="비고">${s.notes}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  _renderTips(tips, title) {
    if (!tips || tips.length === 0) return '';
    return `
      <div class="detail-section">
        <h2 class="detail-section__title">${title || '실전 팁'}</h2>
        ${tips.map(tip => `<div class="tip-box">${tip}</div>`).join('')}
      </div>
    `;
  },

  _renderCautions(title, items) {
    if (!items || items.length === 0) return '';
    return `
      <div class="detail-section">
        <h2 class="detail-section__title">${title}</h2>
        ${items.map(item => `<div class="caution-box">${item}</div>`).join('')}
      </div>
    `;
  },

  _renderRecommendedProcesses(processes) {
    if (!processes || processes.length === 0) return '';
    return `
      <div class="detail-section">
        <h2 class="detail-section__title">추천 용접 공법</h2>
        <div class="settings-table-wrapper">
          <table class="settings-table">
            <thead>
              <tr>
                <th>공법</th>
                <th>용가재</th>
                <th>적합도</th>
                <th>비고</th>
              </tr>
            </thead>
            <tbody>
              ${processes.map(p => `
                <tr>
                  <td data-label="공법"><a href="detail.html?type=processes&id=${p.processId || ''}">${p.process}</a></td>
                  <td data-label="용가재">${p.filler}</td>
                  <td data-label="적합도"><strong>${p.suitability}</strong></td>
                  <td data-label="비고">${p.notes}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  _renderRelatedDefects(defectIds) {
    if (!defectIds || defectIds.length === 0) return '';
    const links = defectIds.map(id => {
      const defect = DataLoader.findItem('defects', id);
      const name = defect ? defect.name : id;
      return `<a href="detail.html?type=defects&id=${id}" class="related-link">${name}</a>`;
    });
    return `
      <div class="detail-section">
        <h2 class="detail-section__title">관련 결함</h2>
        <div class="related-links">${links.join('')}</div>
      </div>
    `;
  },

  _renderRelatedDefectsFromInspection(defectIds) {
    if (!defectIds || defectIds.length === 0) return '';
    const links = defectIds.map(id => {
      const defect = DataLoader.findItem('defects', id);
      const name = defect ? defect.name : id;
      return `<a href="detail.html?type=defects&id=${id}" class="related-link">${name}</a>`;
    });
    return `
      <div class="detail-section">
        <h2 class="detail-section__title">관련 결함</h2>
        <div class="related-links">${links.join('')}</div>
      </div>
    `;
  },

  _renderRelatedMaterials(materialIds) {
    if (!materialIds || materialIds.length === 0) return '';
    const links = materialIds.map(id => {
      const mat = DataLoader.findItem('materials', id);
      const name = mat ? mat.name : id;
      return `<a href="detail.html?type=materials&id=${id}" class="related-link">${name}</a>`;
    });
    return `
      <div class="detail-section">
        <h2 class="detail-section__title">관련 소재</h2>
        <div class="related-links">${links.join('')}</div>
      </div>
    `;
  },

  _renderRelatedProcesses(processIds) {
    if (!processIds || processIds.length === 0) return '';
    const links = processIds.map(id => {
      const proc = DataLoader.findItem('processes', id);
      const name = proc ? proc.name : id;
      return `<a href="detail.html?type=processes&id=${id}" class="related-link">${name}</a>`;
    });
    return `
      <div class="detail-section">
        <h2 class="detail-section__title">관련 용접 공법</h2>
        <div class="related-links">${links.join('')}</div>
      </div>
    `;
  }
};

// 페이지 로드 시 앱 초기화
document.addEventListener('DOMContentLoaded', () => App.init());
