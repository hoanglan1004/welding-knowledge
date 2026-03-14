/**
 * data-loader.js
 * JSON 데이터 파일 3개를 불러와서 통합 배열로 만드는 유틸리티.
 * 각 항목에 _type, _searchText 필드를 추가하여 검색/필터에 사용.
 */

const DataLoader = {
  // 로드된 원본 데이터 저장
  raw: {
    processes: [],
    materials: [],
    defects: [],
    inspections: []
  },

  // 검색/필터용 통합 배열
  allItems: [],

  /**
   * JSON 파일 3개를 모두 불러온다.
   * fetch가 실패하면 빈 배열로 대체 (네트워크 에러 방지).
   */
  async loadAll() {
    const [processData, materialData, defectData] = await Promise.all([
      this._fetchJSON('data/welding-processes.json'),
      this._fetchJSON('data/materials.json'),
      this._fetchJSON('data/defects.json')
    ]);

    this.raw.processes = processData.processes || [];
    this.raw.materials = materialData.materials || [];
    this.raw.defects = defectData.defects || [];
    this.raw.inspections = defectData.inspectionMethods || [];

    this._buildSearchIndex();
    return this.allItems;
  },

  /**
   * JSON 파일을 fetch로 불러온다.
   * 실패 시 빈 객체를 반환하고 콘솔에 에러를 출력한다.
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
   *
   * _type: 어디서 온 데이터인지 구분 (processes, materials, defects, inspections)
   * _searchText: 검색할 때 사용할 모든 텍스트를 하나로 합친 문자열
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
        ...(item.settings || []).map(s => `${s.material} ${s.fillerWire} ${s.notes}`)
      ]);
      this.allItems.push(item);
    });

    // 소재
    this.raw.materials.forEach(item => {
      item._type = 'materials';
      item._searchText = this._buildSearchText([
        item.name, item.category, item.composition,
        ...(item.characteristics || []),
        ...(item.commonUse || []),
        ...(item.weldingNotes || []),
        ...(item.cautions || []),
        ...(item.recommendedProcesses || []).map(p => `${p.process} ${p.filler} ${p.notes}`)
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
  },

  /**
   * 텍스트 배열을 하나의 소문자 문자열로 합친다.
   * 검색할 때 대소문자 구분 없이 비교하기 위함.
   */
  _buildSearchText(parts) {
    return parts
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
  },

  /**
   * id와 type으로 특정 항목을 찾는다.
   * 상세 페이지에서 사용.
   */
  findItem(type, id) {
    const source = {
      processes: this.raw.processes,
      materials: this.raw.materials,
      defects: this.raw.defects,
      inspections: this.raw.inspections
    };
    const list = source[type];
    if (!list) return null;
    return list.find(item => item.id === id) || null;
  }
};
