export const getLocalizedCategory = (cat: string, t: (key: string) => string) => {
  const norm = cat ? cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase() : '';
  const map: Record<string, string> = {
    'Nature': t('nature') || '자연',
    'Landscape': '풍경 (Landscape)',
    'People': t('people') || '인물',
    'Portrait': '인물 (Portrait)',
    'Travel': t('travel') || '여행',
    'Urban': '도시 (Urban)',
    'Work': '업무 (Work)',
    'Abstract': '추상 (Abstract)',
    'Food': t('food') || '음식',
    'Architecture': t('architecture') || '건축',
    'Documents': t('documents') || '문서',
    'Uncategorized': t('uncategorized') || '미분류'
  };
  return map[norm] || map[cat] || cat;
};
