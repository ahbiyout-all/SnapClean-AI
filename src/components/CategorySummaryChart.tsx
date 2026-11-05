import React, { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend
} from 'recharts';
import { motion } from 'motion/react';
import { useI18n } from '../i18n/context';
import { getLocalizedCategory } from '../utils/categoryUtils';
import { BarChart3, Info } from 'lucide-react';

interface CategorySummaryChartProps {
  categoryStats: Record<string, { count: number, size: number }>;
}

const COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
  '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#475569'
];

export const CategorySummaryChart: React.FC<CategorySummaryChartProps> = ({ categoryStats }) => {
  const { t, language } = useI18n();

  const data = useMemo(() => {
    return (Object.entries(categoryStats) as [string, { count: number; size: number }][])
      .map(([name, stats], index) => ({
        name,
        displayName: getLocalizedCategory(name, t),
        value: stats.count,
        color: COLORS[index % COLORS.length]
      }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [categoryStats, t]);

  const totalCount = useMemo(() => data.reduce((sum, item) => sum + item.value, 0), [data]);

  if (data.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6 backdrop-blur-sm"
    >
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
          <BarChart3 size={18} />
        </div>
        <div>
          <h3 className="text-sm font-black text-white uppercase tracking-wider">
            {language === 'ko' ? '카테고리별 요약' : 'Category Summary'}
          </h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
            {language === 'ko' ? `총 ${totalCount}장의 사진 분포` : `Distribution of ${totalCount} photos`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        {/* Summary List */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {data.map((item) => (
              <div 
                key={item.name}
                className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <div 
                    className="w-2 h-2 rounded-full shrink-0" 
                    style={{ backgroundColor: item.color }} 
                  />
                  <span className="text-xs font-bold text-slate-200 truncate">
                    {item.displayName}
                  </span>
                </div>
                <span className="text-xs font-mono font-black text-indigo-400">
                  {item.value.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
          
          <div className="flex items-center gap-1.5 mt-4 text-[10px] text-slate-500 font-medium px-1">
            <Info size={12} />
            <span>
              {language === 'ko' 
                ? 'AI가 사진의 시각적 특징을 분석하여 자동으로 분류한 통계입니다.' 
                : 'Statistics automatically classified by AI analyzing visual features.'}
            </span>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={85}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
                animationBegin={0}
                animationDuration={1200}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <RechartsTooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload;
                    const percent = ((item.value / totalCount) * 100).toFixed(1);
                    return (
                      <div className="bg-slate-900/90 border border-white/10 backdrop-blur-md p-3 rounded-xl shadow-xl">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-xs font-bold text-white">{item.displayName}</span>
                        </div>
                        <div className="text-[11px] text-slate-300 font-mono">
                          {item.value.toLocaleString()} {language === 'ko' ? '장' : 'photos'} ({percent}%)
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
};
