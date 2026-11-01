import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { motion } from 'motion/react';
import { Flame, HardDrive, Hash, Filter, Info, X, ChevronDown, RefreshCw } from 'lucide-react';
import { DedupeGroup, DedupeEngine } from '../services/dedupeEngine';
import { PhotoRecord } from '../services/db';
import { useI18n } from '../i18n/context';

export interface FolderDuplicateHeatmapProps {
  groups: DedupeGroup[];
  onSelectFolderFilter?: (folderPath: string | null) => void;
  activeFolderFilter?: string | null;
  addNotification?: (title: string, message: string, type: 'info' | 'success' | 'warning' | 'error') => void;
}

interface FolderMetrics {
  folderPath: string;
  folderName: string;
  redundantCount: number;
  wastedBytes: number;
  groupCount: number;
  samplePhotos: PhotoRecord[];
}

function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function getFolderPath(filePath?: string): string {
  if (!filePath) return '/';
  const normalized = filePath.replace(/\\/g, '/');
  const lastSlash = normalized.lastIndexOf('/');
  if (lastSlash === -1) return '/';
  return normalized.substring(0, lastSlash) || '/';
}

export const FolderDuplicateHeatmap: React.FC<FolderDuplicateHeatmapProps> = ({
  groups,
  onSelectFolderFilter,
  activeFolderFilter,
  addNotification,
}) => {
  const { language } = useI18n();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [metricMode, setMetricMode] = useState<'size' | 'count'>('size');
  const [hoveredFolder, setHoveredFolder] = useState<FolderMetrics | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // 1. Process duplicate groups into folder aggregated metrics
  const folderData = useMemo<FolderMetrics[]>(() => {
    const folderMap = new Map<string, FolderMetrics>();

    for (const group of groups) {
      if (!group.photos || group.photos.length <= 1) continue;
      
      const best = DedupeEngine.getBestPhoto(group.photos, 'sharpest');
      const redundant = group.photos.filter((p) => p.id !== best.id);

      for (const photo of redundant) {
        const folder = getFolderPath(photo.path);
        const folderName = folder.split('/').pop() || folder;

        const existing = folderMap.get(folder) || {
          folderPath: folder,
          folderName: folderName,
          redundantCount: 0,
          wastedBytes: 0,
          groupCount: 0,
          samplePhotos: [],
        };

        existing.redundantCount += 1;
        existing.wastedBytes += photo.size || 0;
        existing.groupCount += 1;
        if (existing.samplePhotos.length < 3) {
          existing.samplePhotos.push(photo);
        }

        folderMap.set(folder, existing);
      }
    }

    const list = Array.from(folderMap.values());
    // Sort descending based on metricMode
    list.sort((a, b) => {
      if (metricMode === 'size') {
        return b.wastedBytes - a.wastedBytes;
      }
      return b.redundantCount - a.redundantCount;
    });

    return list.slice(0, 24); // Top 24 hotspot folders for crisp layout
  }, [groups, metricMode]);

  const totalWastedBytes = useMemo(
    () => folderData.reduce((acc, f) => acc + f.wastedBytes, 0),
    [folderData]
  );
  const totalRedundantCount = useMemo(
    () => folderData.reduce((acc, f) => acc + f.redundantCount, 0),
    [folderData]
  );

  // 2. Render D3 Heatmap Grid
  useEffect(() => {
    if (!svgRef.current || folderData.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = containerRef.current?.clientWidth || 800;
    const height = 300;

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const maxVal = d3.max(folderData, (d: FolderMetrics) =>
      metricMode === 'size' ? d.wastedBytes : d.redundantCount
    ) || 1;

    // D3 Heatmap Color Scale: Slate-900 (cold) -> Amber (warm) -> Crimson/Red (hotspot)
    const colorScale = d3
      .scaleLinear<string>()
      .domain([0, Number(maxVal) * 0.3, Number(maxVal) * 0.7, Number(maxVal)])
      .range(['#1e293b', '#b45309', '#f43f5e', '#e11d48']);

    // Treemap or Heatmap Tile Layout calculation
    const cols = width > 900 ? 6 : width > 600 ? 4 : 3;
    const rows = Math.ceil(folderData.length / cols);
    const padding = 8;

    const tileWidth = (width - padding * (cols + 1)) / cols;
    const tileHeight = Math.max(60, (height - padding * (rows + 1)) / rows);

    const g = svg.append('g').attr('transform', `translate(${padding}, ${padding})`);

    const tiles = g
      .selectAll<SVGGElement, FolderMetrics>('g.tile')
      .data(folderData)
      .enter()
      .append('g')
      .attr('class', 'tile')
      .attr('transform', (_, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        return `translate(${col * (tileWidth + padding)}, ${row * (tileHeight + padding)})`;
      })
      .style('cursor', 'pointer');

    // Tile background rectangles with rounded corners and D3 color transition
    tiles
      .append('rect')
      .attr('width', tileWidth)
      .attr('height', tileHeight)
      .attr('rx', 12)
      .attr('ry', 12)
      .attr('fill', (d: FolderMetrics) => {
        const val = metricMode === 'size' ? d.wastedBytes : d.redundantCount;
        return colorScale(val);
      })
      .attr('stroke', (d: FolderMetrics) =>
        activeFolderFilter === d.folderPath ? '#f59e0b' : 'rgba(255, 255, 255, 0.1)'
      )
      .attr('stroke-width', (d: FolderMetrics) => (activeFolderFilter === d.folderPath ? 3 : 1))
      .style('transition', 'all 0.25s ease')
      .on('mouseover', function (event, d: FolderMetrics) {
        d3.select(this)
          .attr('stroke', '#38bdf8')
          .attr('stroke-width', 2.5)
          .style('filter', 'drop-shadow(0 0 10px rgba(244, 63, 94, 0.4))');

        setHoveredFolder(d);
        const rect = svgRef.current?.getBoundingClientRect();
        if (rect) {
          setTooltipPos({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
          });
        }
      })
      .on('mousemove', function (event) {
        const rect = svgRef.current?.getBoundingClientRect();
        if (rect) {
          setTooltipPos({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
          });
        }
      })
      .on('mouseout', function (_, d: FolderMetrics) {
        d3.select(this)
          .attr('stroke', activeFolderFilter === d.folderPath ? '#f59e0b' : 'rgba(255, 255, 255, 0.1)')
          .attr('stroke-width', activeFolderFilter === d.folderPath ? 3 : 1)
          .style('filter', 'none');

        setHoveredFolder(null);
        setTooltipPos(null);
      })
      .on('click', (_, d: FolderMetrics) => {
        if (onSelectFolderFilter) {
          const next = activeFolderFilter === d.folderPath ? null : d.folderPath;
          onSelectFolderFilter(next);
          if (addNotification) {
            addNotification(
              language === 'ko' ? '🔥 중복 폴더 필터링' : '🔥 Duplicate Folder Filter',
              next
                ? language === 'ko'
                  ? `'${d.folderName}' 폴더의 중복 항목만 표시합니다.`
                  : `Filtering duplicates for folder: ${d.folderName}`
                : language === 'ko'
                ? '전체 중복 폴더 필터를 해제했습니다.'
                : 'Cleared folder filter.',
              'info'
            );
          }
        }
      });

    // Folder Label (Name)
    tiles
      .append('text')
      .attr('x', 12)
      .attr('y', 22)
      .attr('fill', '#ffffff')
      .attr('font-size', '11px')
      .attr('font-weight', '800')
      .text((d: FolderMetrics) => {
        const maxChar = Math.floor(tileWidth / 8);
        return d.folderName.length > maxChar
          ? d.folderName.substring(0, maxChar - 2) + '…'
          : d.folderName;
      });

    // Value Badge Text (Bytes or Count)
    tiles
      .append('text')
      .attr('x', 12)
      .attr('y', tileHeight - 12)
      .attr('fill', '#fde047')
      .attr('font-size', '12px')
      .attr('font-weight', '900')
      .attr('font-family', 'monospace')
      .text((d: FolderMetrics) =>
        metricMode === 'size'
          ? formatBytes(d.wastedBytes)
          : `${d.redundantCount} ${language === 'ko' ? '개 파일' : 'files'}`
      );

    // Flame / Hotspot icon indicator on high density tiles
    tiles
      .filter((d: FolderMetrics) => {
        const val = metricMode === 'size' ? d.wastedBytes : d.redundantCount;
        return val >= Number(maxVal) * 0.5;
      })
      .append('text')
      .attr('x', tileWidth - 20)
      .attr('y', 22)
      .attr('font-size', '12px')
      .text('🔥');

  }, [folderData, metricMode, activeFolderFilter, language, onSelectFolderFilter, addNotification]);

  if (folderData.length === 0) {
    return (
      <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-6 text-center text-xs text-slate-400">
        {language === 'ko'
          ? '중복 폴더 데이터가 없거나 이미 모든 중복이 정리되었습니다.'
          : 'No duplicate folder hotspots detected.'}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900/80 border border-amber-500/30 rounded-[2rem] p-5 sm:p-7 space-y-4 shadow-xl relative overflow-hidden"
    >
      {/* Top Header & Controls Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-amber-500/20 via-rose-500/20 to-indigo-500/20 border border-amber-500/30 rounded-2xl text-amber-400 shrink-0">
            <Flame size={20} className="animate-bounce text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm sm:text-base text-white tracking-tight flex items-center gap-2">
                {language === 'ko' ? '🔥 중복 파일 폴더별 D3 히트맵 (Storage Hotspots)' : '🔥 Duplicate Folder D3 Heatmap'}
              </h3>
              {activeFolderFilter && (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[10px] border border-amber-500/40 flex items-center gap-1">
                  <Filter size={10} />
                  {language === 'ko' ? '필터 활성' : 'Filtered'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {language === 'ko'
                ? '가장 낭비 용량이 큰 핫스팟 폴더를 한눈에 파악하고 클릭하여 즉시 시각적으로 선택·정리하세요.'
                : 'Quickly spot folders with the highest redundant storage usage and click to filter.'}
            </p>
          </div>
        </div>

        {/* Controls & Metric Toggles */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <div className="bg-slate-950 p-1 rounded-xl border border-white/10 flex items-center gap-1 text-xs">
            <button
              onClick={() => setMetricMode('size')}
              className={`px-3 py-1.5 rounded-lg font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                metricMode === 'size'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <HardDrive size={13} />
              <span>{language === 'ko' ? '낭비 용량 (MB)' : 'Wasted Size'}</span>
            </button>
            <button
              onClick={() => setMetricMode('count')}
              className={`px-3 py-1.5 rounded-lg font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                metricMode === 'count'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Hash size={13} />
              <span>{language === 'ko' ? '중복 수 (개)' : 'File Count'}</span>
            </button>
          </div>

          {activeFolderFilter && (
            <button
              onClick={() => onSelectFolderFilter && onSelectFolderFilter(null)}
              className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
            >
              <X size={13} />
              <span>{language === 'ko' ? '필터 해제' : 'Clear'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Overview Stat Badges Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono bg-slate-950/60 p-3 rounded-2xl border border-white/5">
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400 font-bold uppercase">{language === 'ko' ? '분석 폴더 수' : 'Hotspot Folders'}</span>
          <span className="text-white font-extrabold text-sm">{folderData.length} {language === 'ko' ? '개 디렉터리' : 'folders'}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400 font-bold uppercase">{language === 'ko' ? '총 낭비 용량' : 'Total Wasted Space'}</span>
          <span className="text-rose-400 font-black text-sm">{formatBytes(totalWastedBytes)}</span>
        </div>
        <div className="col-span-2 sm:col-span-1 flex flex-col">
          <span className="text-[10px] text-slate-400 font-bold uppercase">{language === 'ko' ? '총 중복 복사본' : 'Total Redundant Files'}</span>
          <span className="text-amber-300 font-black text-sm">{totalRedundantCount.toLocaleString()} {language === 'ko' ? '개' : 'items'}</span>
        </div>
      </div>

      {/* Interactive D3 SVG Container */}
      <div ref={containerRef} className="relative w-full overflow-hidden rounded-2xl bg-slate-950/80 p-2 border border-white/5">
        <svg ref={svgRef} className="w-full h-[300px] block" />

        {/* Hover D3 Tooltip overlay */}
        {hoveredFolder && tooltipPos && (
          <div
            className="absolute z-30 pointer-events-none p-3.5 bg-slate-900/95 border border-amber-500/40 rounded-2xl shadow-2xl text-xs text-white max-w-xs space-y-1.5 animate-fade-in"
            style={{
              left: Math.min(tooltipPos.x + 10, (containerRef.current?.clientWidth || 300) - 240),
              top: Math.max(10, tooltipPos.y - 80),
            }}
          >
            <div className="font-extrabold text-amber-300 flex items-center gap-1.5 border-b border-white/10 pb-1">
              <Flame size={13} className="text-rose-400 shrink-0" />
              <span className="truncate">{hoveredFolder.folderName}</span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono truncate">
              {hoveredFolder.folderPath}
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1">
              <div>
                <span className="text-slate-400 block">{language === 'ko' ? '낭비 용량' : 'Wasted Space'}</span>
                <span className="text-rose-400 font-bold">{formatBytes(hoveredFolder.wastedBytes)}</span>
              </div>
              <div>
                <span className="text-slate-400 block">{language === 'ko' ? '중복 사진 수' : 'Duplicate Files'}</span>
                <span className="text-amber-300 font-bold">{hoveredFolder.redundantCount}개</span>
              </div>
            </div>
            <div className="text-[10px] text-indigo-300 pt-1 italic font-bold">
              💡 {language === 'ko' ? '클릭 시 이 폴더의 중복 항목만 필터링합니다.' : 'Click to filter duplicates in this folder.'}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};
