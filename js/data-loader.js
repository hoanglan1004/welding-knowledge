/**
 * data-loader.js
 * JSON 데이터 파일 5개를 불러와서 통합 배열로 만드는 유틸리티.
 * 각 항목에 _type, _searchText 필드를 추가하여 검색/필터에 사용.
 */

const DataLoader = {
  // 로드된 원본 데이터 저장
  raw: {
    processes: [],
    materials: [],
    defects: [],
    inspections: [],
    troubleshooting: [],
    science: []
  },

  // 검색/필터용 통합 배열
  allItems: [],

  /**
   * JSON 파일 5개를 모두 불러온다.
   */
  async loadAll() {
    const [processData, materialData, defectData, troubleData, scienceData] = await Promise.all([
      this._fetchJSON('data/welding-processes.json'),
      this._fetchJSON('data/materials.json'),
      this._fetchJSON('data/defects.json'),
      this._fetchJSON('data/troubleshooting.json'),
      this._fetchJSON('data/advanced-science.json')
    ]);

    this.raw.processes = processData.processes || [];
    this.raw.materials = materialData.materials || [];
    this.raw.defects = defectData.defects || [];
    this.raw.inspections = defectData.inspectionMethods || [];
    this.raw.troubleshooting = troubleData.troubleshooting || [];
    this.raw.science = scienceData.science || [];

    this._buildSearchIndex();
    return this.allItems;
  },

  /**
   * JSON 파일을 fetch로 불러온다.
   */
  async _fetchJSON(path) {
    try {
      const response = await fetch(path);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error(`데이터 로드 실패: ${path}`, error);
      return {};
    }
  },

  /**
   * 모든 항목을 하나의 배열로 합치고,
   * 각 항목에 _type과 _searchText를 추가한다.
   */
  _buildSearchIndex() {
    this.allItems = [];

    // 용접 공법
    this.raw.processes.forEach(item => {
      item._type = 'processes';
      item._searchText = this._buildSearchText([
        item.name, item.nameEn, item.category, item.summary,
        ...(item.shieldingGas || []),
        ...(item.applications || []),
        ...(item.pros || []),
        ...(item.cons || []),
        ...(item.tips || []),
        ...(item.settings || []).map(s => `${s.material} ${s.fillerWire} ${s.notes}`),
        ...(item.pulseSettings || []).map(s => `${s.scenario} ${s.notes}`)
      ]);
      this.allItems.push(item);
    });

    // 소재
    this.raw.materials.forEach(item => {
      item._type = 'materials';
      const metTexts = [];
      if (item.metallurgy) {
        metTexts.push(item.metallurgy.sensitization || '');
        metTexts.push(item.metallurgy.lowSulfur || '');
        metTexts.push(item.metallurgy.manufacturing || '');
        if (item.metallurgy.surfaceFinish) {
          metTexts.push(item.metallurgy.surfaceFinish.BA || '');
          metTexts.push(item.metallurgy.surfaceFinish.EP || '');
        }
      }
      item._searchText = this._buildSearchText([
        item.name, item.category, item.composition,
        ...(item.characteristics || []),
        ...(item.commonUse || []),
        ...(item.weldingNotes || []),
        ...(item.cautions || []),
        ...(item.recommendedProcesses || []).map(p => `${p.process} ${p.filler} ${p.notes}`),
        ...metTexts
      ]);
      this.allItems.push(item);
    });

    // 결함
    this.raw.defects.forEach(item => {
      item._type = 'defects';
      item._searchText = this._buildSearchText([
        item.name, item.nameEn, item.category, item.description,
        ...(item.causes || []),
        ...(item.prevention || []),
        ...(item.detection || [])
      ]);
      this.allItems.push(item);
    });

    // 비파괴검사
    this.raw.inspections.forEach(item => {
      item._type = 'inspections';
      item._searchText = this._buildSearchText([
        item.name, item.nameEn, item.category, item.principle,
        ...(item.detectableDefects || []),
        ...(item.pros || []),
        ...(item.cons || [])
      ]);
      this.allItems.push(item);
    });

    // 현장 문제해결
    this.raw.troubleshooting.forEach(item => {
      item._type = 'troubleshooting';
      item._searchText = this._buildSearchText([
        item.symptom, item.icon, item.category, item.description,
        ...(item.quickFixes || []),
        ...(item.causes || []),
        ...(item.detailedSolutions || []).map(s => `${s.action} ${s.detail}`)
      ]);
      this.allItems.push(item);
    });

    // 용접 과학
    this.raw.science.forEach(item => {
      item._type = 'science';
      item._searchText = this._buildSearchText([
        item.name, item.nameEn, item.category, item.summary,
        ...(item.keyPoints || []).map(k => `${k.title} ${k.detail}`)
      ]);
      this.allItems.push(item);
    });
  },

  /**
   * 텍스트 배열을 하나의 소문자 문자열로 합친다.
   */
  _buildSearchText(parts) {
    return parts
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
  },

  /**
   * id와 type으로 특정 항목을 찾는다.
   */
  findItem(type, id) {
    const source = {
      processes: this.raw.processes,
      materials: this.raw.materials,
      defects: this.raw.defects,
      inspections: this.raw.inspections,
      troubleshooting: this.raw.troubleshooting,
      science: this.raw.science
    };
    const list = source[type];
    if (!list) return null;
    return list.find(item => item.id === id) || null;
  }
};
