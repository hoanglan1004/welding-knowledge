/**
 * app.js
 * 메인 애플리케이션 로직.
 * - index.html: 카드 렌더링
 * - detail.html: 상세 페이지 렌더링
 */

const App = {
  /**
   * 페이지가 로드되면 실행.
   * 현재 페이지가 index인지 detail인지 판단하여 각각 초기화.
   */
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

  /**
   * 메인 페이지 초기화: 모든 카드를 표시하고 검색/필터 이벤트 연결.
   */
  initIndexPage() {
    this.renderCards(DataLoader.allItems);
    Search.init();
  },

  /**
   * 카드 목록을 화면에 렌더링한다.
   * items: 표시할 항목 배열 (필터링된 결과 또는 전체)
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
   * 항목 타입(공법/소재/결함/검사)에 따라 표시 내용이 다름.
   */
  _createCardHTML(item) {
    const typeClass = this._getTypeClass(item._type);
    const tagLabel = this._getTagLabel(item._type);
    const tagClass = this._getTagClass(item._type);
    const subtitle = this._getSubtitle(item);
    const keywords = this._getKeywords(item);

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
      inspections: 'card--inspection'
    };
    return map[type] || '';
  },

  _getTagLabel(type) {
    const map = {
      processes: '공법',
      materials: '소재',
      defects: '결함',
      inspections: '검사'
    };
    return map[type] || '';
  },

  _getTagClass(type) {
    const map = {
      processes: 'card__tag--process',
      materials: 'card__tag--material',
      defects: 'card__tag--defect',
      inspections: 'card__tag--inspection'
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
    return [];
  },

  // ============================
  // 상세 페이지 (detail.html)
  // ============================

  /**
   * URL 파라미터에서 type과 id를 읽어 해당 항목을 찾아 렌더링한다.
   */
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

    // 페이지 제목 업데이트
    document.title = `${item.name} - 용접 지식 백과`;

    // 타입별 렌더링 함수 호출
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

  // --- 용접 공법 상세 렌더링 ---
  _renderProcess(item) {
    return `
      <h1 class="detail__title">${item.name}</h1>
      <div class="detail__name-en">${item.nameEn || ''}</div>
      <span class="detail__category" style="background: var(--color-tag-process)">${item.category}</span>
      <div class="detail__summary">${item.summary}</div>

      ${this._renderListSection('보호가스', item.shieldingGas)}
      ${this._renderListSection('적용 분야', item.applications)}
      ${this._renderProsCons(item.pros, item.cons)}
      ${this._renderSettingsTable(item.settings)}
      ${this._renderTips(item.tips)}
      ${this._renderRelatedDefects(item.relatedDefects)}
    `;
  },

  // --- 소재 상세 렌더링 ---
  _renderMaterial(item) {
    return `
      <h1 class="detail__title">${item.name}</h1>
      <span class="detail__category" style="background: var(--color-tag-material)">${item.category}</span>
      <div class="detail__summary">${item.composition}</div>

      ${this._renderListSection('특성', item.characteristics)}
      ${this._renderListSection('주요 용도', item.commonUse)}
      ${this._renderCautions('용접 시 주의사항', item.weldingNotes)}
      ${this._renderRecommendedProcesses(item.recommendedProcesses)}
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
