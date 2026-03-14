/**
 * search.js
 * 검색 + 필터 엔진.
 * 검색바에 타이핑하거나 필터 드롭다운을 변경하면
 * DataLoader.allItems를 필터링하여 App.renderCards()로 표시.
 */

const Search = {
  _debounceTimer: null,

  /**
   * 검색/필터 이벤트를 연결한다.
   * App.initIndexPage()에서 호출됨.
   */
  init() {
    const searchInput = document.getElementById('searchInput');
    const typeFilter = document.getElementById('typeFilter');
    const processFilter = document.getElementById('processFilter');

    // 검색: 타이핑할 때마다 (200ms 디바운스)
    searchInput.addEventListener('input', () => {
      this._debounce(() => this.applyFilters(), 200);
    });

    // 필터 변경: 즉시 적용
    typeFilter.addEventListener('change', () => this.applyFilters());
    processFilter.addEventListener('change', () => this.applyFilters());
  },

  /**
   * 현재 검색어와 필터 값을 읽어서 필터링하고 카드를 다시 그린다.
   */
  applyFilters() {
    const query = document.getElementById('searchInput').value.trim().toLowerCase();
    const typeFilter = document.getElementById('typeFilter').value;
    const processFilter = document.getElementById('processFilter').value;

    const filtered = DataLoader.allItems.filter(item => {
      // 1. 분류 필터
      if (typeFilter !== 'all' && item._type !== typeFilter) return false;

      // 2. 용접 종류 필터
      if (processFilter !== 'all' && !this._matchesProcess(item, processFilter)) return false;

      // 3. 검색어 필터 (AND 검색: 모든 단어가 포함되어야 함)
      if (query) {
        const words = query.split(/\s+/).filter(Boolean);
        return words.every(word => item._searchText.includes(word));
      }

      return true;
    });

    App.renderCards(filtered);
  },

  /**
   * 항목이 특정 용접 공법과 관련이 있는지 확인한다.
   *
   * - processes: 해당 공법 자체이면 true
   * - materials: recommendedProcesses에 해당 공법이 있으면 true
   * - defects: relatedProcesses에 해당 공법이 있으면 true
   * - inspections: 항상 true (모든 공법에 관련)
   */
  _matchesProcess(item, processId) {
    if (item._type === 'processes') {
      return item.id === processId;
    }

    if (item._type === 'materials') {
      return (item.recommendedProcesses || []).some(
        p => p.processId === processId
      );
    }

    if (item._type === 'defects') {
      return (item.relatedProcesses || []).includes(processId);
    }

    // 비파괴검사는 공법 필터와 무관 — 항상 표시
    if (item._type === 'inspections') {
      return true;
    }

    return false;
  },

  /**
   * 디바운스: 연속 호출 시 마지막 호출만 실행.
   * 검색바에 빠르게 타이핑할 때 성능 보호용.
   */
  _debounce(fn, delay) {
    clearTimeout(this._debounceTimer);
    this._debounceTimer = setTimeout(fn, delay);
  }
};
