import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  Legend
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart3, 
  Sparkles, 
  Calendar, 
  Layers, 
  HardDrive, 
  X, 
  Info, 
  Filter, 
  Check, 
  ArrowUpDown,
  TrendingUp,
  Search
} from 'lucide-react';
import { PhotoRecord } from '../services/db';
import { SmartQuery } from '../services/geminiService';
import { useI18n } from '../i18n/context';
import { getLocalizedCategory } from '../utils/categoryUtils';

export interface SearchDistributionChartProps {
  photos: PhotoRecord[];
  searchQuery?: string;
  smartQuery?: SmartQuery | null;
  isProcessingSmartQuery?: boolean;
  onSelectCategory?: (category: string) => void;
  onSelectYear?: (year: string) => void;
  onClose?: () => void;
  selectedCategories?: string[];
  selectedYears?: string[];
}

const CATEGORY_COLORS: Record<string, string> = {
  Nature: '#10b981',       // Emerald
  Travel: '#3b82f6',       // Blue
  People: '#f43f5e',       // Rose
  Food: '#f59e0b',         // Amber
  Architecture: '#8b5cf6', // Violet
  Documents: '#06b6d4',    // Cyan
  Animal: '#ec4899',       // Pink
  Street: '#6366f1',       // Indigo
  Personal: '#14b8a6',     // Teal
  Event: '#e11d48',        // Crimson
  Landscape: '#059669',    // Forest
  Other: '#64748b',        // Slate
  Uncategorized: '#94a3b8' // Slate light
};

const YEAR_COLORS = [
  '#6366f1', '#3b82f6', '#06b6d4', '#10b981', 
  '#f59e0b', '#f97316', '#ef4444', '#ec4899', '#8b5cf6'
];

export const SearchDistributionChart: React.FC<SearchDistributionChartProps> = ({
  photos,
  searchQuery = '',
  smartQuery = null,
  isProcessingSmartQuery = false,
  onSelectCategory,
  onSelectYear,
  onClose,
  selectedCategories = [],
  selectedYears = []
}) => {
  const { t, language } = useI18n();
  const [dimension, setDimension] = useState<'category' | 'year'>('category');
  const [metric, setMetric] = useState<'count' | 'size'>('count');
  const [chartOrientation, setChartOrientation] = useState<'horizontal' | 'vertical'>('vertical');

  // Compute distribution data
  const { categoryData, yearData, totalSize, topCategory, yearRange } = useMemo(() => {
    let sizeSum = 0;
    const catMap: Record<string, { count: number; size: number }> = {};
    const yrMap: Record<string, { count: number; size: number }> = {};
    const yearsFound: number[] = [];

    photos.forEach((p) => {
      const pSize = p.size || 0;
      sizeSum += pSize;

      // Category extraction
      const cat = p.category?.trim() || 'Uncategorized';
      if (!catMap[cat]) {
        catMap[cat] = { count: 0, size: 0 };
      }
      catMap[cat].count += 1;
      catMap[cat].size += pSize;

      // Year extraction
      const yr = p.dateTaken 
        ? new Date(p.dateTaken).getFullYear() 
        : p.lastModified 
          ? new Date(p.lastModified).getFullYear() 
          : null;
      const yrKey = yr ? String(yr) : (language === 'ko' ? '미지정' : 'Unknown');
      if (yr) yearsFound.push(yr);

      if (!yrMap[yrKey]) {
        yrMap[yrKey] = { count: 0, size: 0 };
      }
      yrMap[yrKey].count += 1;
      yrMap[yrKey].size += pSize;
    });

    const totalCount = photos.length || 1;

    // Convert category map to array
    const catArr = Object.entries(catMap).map(([name, val]) => ({
      name,
      displayName: getLocalizedCategory(name, t),
      count: val.count,
      sizeMb: parseFloat((val.size / (1024 * 1024)).toFixed(2)),
      percentage: parseFloat(((val.count / totalCount) * 100).toFixed(1)),
      color: CATEGORY_COLORS[name] || CATEGORY_COLORS.Other,
      selected: selectedCategories.includes(name)
    })).sort((a, b) => b.count - a.count);

    // Convert year map to array
    const yrArr = Object.entries(yrMap).map(([name, val], idx) => ({
      name,
      displayName: name,
      count: val.count,
      sizeMb: parseFloat((val.size / (1024 * 1024)).toFixed(2)),
      percentage: parseFloat(((val.count / totalCount) * 100).toFixed(1)),
      color: YEAR_COLORS[idx % YEAR_COLORS.length],
      selected: selectedYears.includes(name)
    })).sort((a, b) => {
      if (a.name === '미지정' || a.name === 'Unknown') return 1;
      if (b.name === '미지정' || b.name === 'Unknown') return -1;
      return a.name.localeCompare(b.name);
    });

    const topCat = catArr[0] || null;
    const sortedYears = [...yearsFound].sort((a, b) => a - b);
    const yrSpan = sortedYears.length > 0 
      ? (sortedYears[0] === sortedYears[sortedYears.length - 1] 
          ? `${sortedYears[0]}` 
          : `${sortedYears[0]} ~ ${sortedYears[sortedYears.length - 1]}`)
      : '-';

    return {
      categoryData: catArr,
      yearData: yrArr,
      totalSize: sizeSum,
      topCategory: topCat,
      yearRange: yrSpan
    };
  }, [photos, t, language, selectedCategories, selectedYears]);

  const activeData = dimension === 'category' ? categoryData : yearData;

  const formatFileSize = (bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleBarClick = (entry: any) => {
    if (!entry || !entry.name) return;
    if (dimension === 'category' && onSelectCategory) {
      onSelectCategory(entry.name);
    } else if (dimension === 'year' && onSelectYear) {
      onSelectYear(entry.name);
    }
  };

  // Custom Chart Tooltip
  const CustomChartTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length > 0) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 border border-indigo-500/40 backdrop-blur-xl p-3.5 rounded-2xl shadow-2xl min-w-[180px] pointer-events-none">
          <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-white/10">
            <div 
              className="w-3 h-3 rounded-full shrink-0 shadow-sm"
              style={{ backgroundColor: data.color }}
            />
            <span className="font-black text-white text-xs truncate">
              {data.displayName || data.name}
            </span>
          </div>

          <div className="space-y-1 text-[11px]">
            <div className="flex items-center justify-between gap-4 text-slate-300">
              <span className="text-slate-400">{language === 'ko' ? '사진 수:' : 'Photo Count:'}</span>
              <span className="font-bold text-white font-mono">
                {data.count.toLocaleString()} {language === 'ko' ? '장' : 'photos'} ({data.percentage}%)
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 text-slate-300">
              <span className="text-slate-400">{language === 'ko' ? '데이터 용량:' : 'Total Size:'}</span>
              <span className="font-bold text-indigo-300 font-mono">
                {data.sizeMb.toLocaleString()} MB
              </span>
            </div>
          </div>

          <div className="mt-2.5 pt-1.5 border-t border-white/5 flex items-center gap-1 text-[9px] text-amber-300 font-medium">
            <Filter size={10} className="shrink-0" />
            <span>{language === 'ko' ? '클릭 시 해당 항목으로 필터링' : 'Click bar to filter library'}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.25 }}
      className="bg-slate-900/90 border border-indigo-500/30 rounded-3xl p-4 sm:p-6 mb-6 shadow-2xl backdrop-blur-xl relative overflow-hidden"
    >
      {/* Background ambient decorative glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none -mb-20" />

      {/* Header section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/10 relative z-10">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-md shadow-indigo-500/10">
              <BarChart3 size={18} />
            </div>
            <h3 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
              <span>{language === 'ko' ? '스마트 검색 결과 데이터 시각화' : 'Search Distribution Visualization'}</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                recharts
              </span>
            </h3>

            {isProcessingSmartQuery && (
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-purple-300 bg-purple-500/20 px-2.5 py-0.5 rounded-full border border-purple-500/30 animate-pulse">
                <Sparkles size={11} className="animate-spin" />
                {language === 'ko' ? 'AI 의미 분석 중...' : 'Analyzing semantic query...'}
              </span>
            )}
          </div>

          {/* Search Query Details & Intent */}
          <div className="flex items-center gap-2 flex-wrap text-xs text-slate-300">
            {searchQuery ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-slate-200">
                <Search size={12} className="text-indigo-400" />
                <span className="text-[11px] text-slate-400">{language === 'ko' ? '검색어:' : 'Query:'}</span>
                <span className="font-bold text-amber-300">"{searchQuery}"</span>
              </div>
            ) : (
              <span className="text-[11px] text-slate-400">
                {language === 'ko' ? '전체 보관함 사진 분포' : 'All Library Photos Distribution'}
              </span>
            )}

            {smartQuery && smartQuery.intent && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-200">
                <Sparkles size={12} className="text-purple-400" />
                <span className="text-[11px] text-purple-300/80">{language === 'ko' ? 'AI 의도:' : 'Intent:'}</span>
                <span className="font-bold text-purple-100">{smartQuery.intent}</span>
              </div>
            )}

            {smartQuery && smartQuery.keywords && smartQuery.keywords.length > 1 && (
              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                <span>{language === 'ko' ? '확장 키워드:' : 'Keywords:'}</span>
                {smartQuery.keywords.slice(0, 4).map((kw, i) => (
                  <span key={i} className="px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/20">
                    #{kw}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Dimension & Metric Controls */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Dimension Toggle: Category vs Year */}
          <div className="flex items-center p-1 bg-white/5 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => setDimension('category')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                dimension === 'category'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers size={13} />
              <span>{language === 'ko' ? '카테고리별' : 'Categories'}</span>
            </button>
            <button
              type="button"
              onClick={() => setDimension('year')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                dimension === 'year'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Calendar size={13} />
              <span>{language === 'ko' ? '연도별' : 'Years'}</span>
            </button>
          </div>

          {/* Metric Toggle: Count vs Size */}
          <div className="flex items-center p-1 bg-white/5 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => setMetric('count')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                metric === 'count'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
              title={language === 'ko' ? '사진 장수 기준' : 'By Photo Count'}
            >
              {language === 'ko' ? '장수 (Count)' : 'Count'}
            </button>
            <button
              type="button"
              onClick={() => setMetric('size')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                metric === 'size'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
              title={language === 'ko' ? '저장 용량 (MB) 기준' : 'By Storage Size (MB)'}
            >
              {language === 'ko' ? '용량 (MB)' : 'Size'}
            </button>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-colors cursor-pointer"
              title={language === 'ko' ? '시각화 뷰 닫기' : 'Close Chart'}
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4 relative z-10">
        <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">
            {language === 'ko' ? '검색된 사진' : 'Found Photos'}
          </p>
          <p className="text-xl font-black text-white font-mono">
            {photos.length.toLocaleString()}
            <span className="text-xs font-normal text-slate-400 ml-1">{language === 'ko' ? '장' : 'items'}</span>
          </p>
        </div>

        <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">
            {language === 'ko' ? '총 데이터 크기' : 'Total Size'}
          </p>
          <p className="text-xl font-black text-indigo-300 font-mono">
            {formatFileSize(totalSize)}
          </p>
        </div>

        <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">
            {language === 'ko' ? '최다 카테고리' : 'Top Category'}
          </p>
          <p className="text-sm sm:text-base font-black text-amber-300 truncate">
            {topCategory ? topCategory.displayName : '-'}
            {topCategory && (
              <span className="text-[10px] font-normal text-slate-400 ml-1">
                ({topCategory.count}장)
              </span>
            )}
          </p>
        </div>

        <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">
            {language === 'ko' ? '촬영 연도 범위' : 'Year Span'}
          </p>
          <p className="text-base sm:text-lg font-black text-emerald-400 font-mono truncate">
            {yearRange}
          </p>
        </div>
      </div>

      {/* Main Recharts Bar Chart View */}
      {activeData.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-sm">
          <Info size={28} className="mx-auto mb-2 text-slate-500" />
          <p>{language === 'ko' ? '표시할 사진 데이터가 없습니다.' : 'No photo data matching this query.'}</p>
        </div>
      ) : (
        <div className="mt-2 relative z-10">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2 px-1">
            <span className="flex items-center gap-1.5 font-bold">
              <TrendingUp size={13} className="text-indigo-400" />
              {dimension === 'category'
                ? (metric === 'count' ? (language === 'ko' ? '카테고리별 사진 수 분포' : 'Photo Distribution by Category') : (language === 'ko' ? '카테고리별 용량(MB) 분포' : 'Storage Size (MB) by Category'))
                : (metric === 'count' ? (language === 'ko' ? '연도별 사진 수 분포' : 'Photo Distribution by Year') : (language === 'ko' ? '연도별 용량(MB) 분포' : 'Storage Size (MB) by Year'))}
            </span>
            <span className="text-[10px] text-slate-500">
              {language === 'ko' ? '막대를 클릭하면 해당 항목으로 즉시 필터링됩니다' : 'Click any bar to filter library'}
            </span>
          </div>

          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={activeData}
                margin={{ top: 10, right: 10, left: -15, bottom: 25 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload[0]) {
                    handleBarClick(e.activePayload[0].payload);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
                <XAxis
                  dataKey="displayName"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                  height={45}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={metric === 'size'}
                />
                <Tooltip content={<CustomChartTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} />
                <Bar
                  dataKey={metric === 'count' ? 'count' : 'sizeMb'}
                  radius={[8, 8, 2, 2]}
                  animationDuration={800}
                  className="cursor-pointer transition-all"
                >
                  {activeData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      opacity={entry.selected ? 1 : 0.85}
                      stroke={entry.selected ? '#ffffff' : undefined}
                      strokeWidth={entry.selected ? 2 : 0}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Interactive Legend / Filter Badges */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-4 pt-3 border-t border-white/5">
            {activeData.map((item, idx) => (
              <button
                key={`${item.name}-${idx}`}
                type="button"
                onClick={() => handleBarClick(item)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                  item.selected
                    ? 'bg-white/20 text-white border-white/40 shadow-sm'
                    : 'bg-white/5 text-slate-400 hover:text-white border-white/5 hover:bg-white/10'
                }`}
              >
                <div 
                  className="w-2.5 h-2.5 rounded-full shrink-0" 
                  style={{ backgroundColor: item.color }} 
                />
                <span>{item.displayName || item.name}</span>
                <span className="text-[10px] font-mono text-slate-500">
                  ({metric === 'count' ? `${item.count}장` : `${item.sizeMb}MB`})
                </span>
                {item.selected && <Check size={11} className="text-emerald-400 ml-0.5" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};
