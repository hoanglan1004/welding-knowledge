/**
 * search.js
 * 검색 + 필터 엔진.
 * 트러블슈팅/과학 항목 포함하여 필터링.
 */

const Search = {
  _debounceTimer: null,

  init() {
    const searchInput = document.getElementById('searchInput');
    const typeFilter = document.getElementById('typeFilter');
    const processFilter = document.getElementById('processFilter');

    searchInput.addEventListener('input', () => {
      this._debounce(() => this.applyFilters(), 200);
    });

    typeFilter.addEventListener('change', () => this.applyFilters());
    processFilter.addEventListener('change', () => this.applyFilters());
  },

  applyFilters() {
    const query = document.getElementById('searchInput').value.trim().toLowerCase();
    const typeFilter = document.getElementById('typeFilter').value;
    const processFilter = document.getElementById('processFilter').value;

    let filtered = DataLoader.allItems.filter(item => {
      // 1. 분류 필터
      if (typeFilter === 'field') {
        // 현장 경험만 표시
        if (item.source !== '현장') return false;
      } else if (typeFilter !== 'all' && item._type !== typeFilter) {
        return false;
      }

      // 2. 용접 종류 필터
      if (processFilter !== 'all' && !this._matchesProcess(item, processFilter)) return false;

      // 3. 검색어 필터 (AND 검색)
      if (query) {
        const words = query.split(/\s+/).filter(Boolean);
        return words.every(word => item._searchText.includes(word));
      }

      return true;
    });

    // 현장 기록은 최신순 정렬
    if (typeFilter === 'field') {
      filtered.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    }

    App.renderCards(filtered, typeFilter === 'field');
  },

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

    // 트러블슈팅: relatedProcesses 필드로 필터
    if (item._type === 'troubleshooting') {
      return (item.relatedProcesses || []).includes(processId);
    }

    // 비파괴검사, 과학은 공법 필터와 무관 — 항상 표시
    if (item._type === 'inspections' || item._type === 'science') {
      return true;
    }

    return false;
  },

  _debounce(fn, delay) {
    clearTimeout(this._debounceTimer);
    this._debounceTimer = setTimeout(fn, delay);
  }
};
