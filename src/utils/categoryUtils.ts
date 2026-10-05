export const getLocalizedCategory = (cat: string, t: (key: string) => string) => {
  const map: Record<string, string> = {
    'Nature': t('nature'),
    'People': t('people'),
    'Documents': t('documents'),
    'Architecture': t('architecture'),
    'Food': t('food'),
    'Travel': t('travel'),
    'Uncategorized': t('uncategorized')
  };
  return map[cat] || cat;
};
