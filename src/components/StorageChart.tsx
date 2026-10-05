import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { useI18n } from '../i18n/context';
import { getLocalizedCategory } from '../utils/categoryUtils';

export const colorMap: Record<string, string> = {
  'Nature': '#10b981', // Emerald
  'People': '#f43f5e', // Rose
  'Documents': '#f59e0b', // Amber
  'Architecture': '#6366f1', // Indigo
  'Food': '#ec4899', // Pink
  'Travel': '#3b82f6', // Blue
  'Uncategorized': '#64748b' // Slate
};

export const StorageChart = ({ data }: { data: Record<string, number> }) => {
  const { t } = useI18n();
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || Object.keys(data).length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 200;
    const height = 200;
    const radius = Math.min(width, height) / 2;

    const g = svg.append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`);

    const color = (key: string) => colorMap[key] || '#3b82f6';

    const pie = d3.pie<any>().value((d: any) => d[1]);
    const arc = d3.arc<any>().innerRadius(radius * 0.6).outerRadius(radius);

    const arcs = g.selectAll('.arc')
      .data(pie(Object.entries(data) as any))
      .enter().append('g')
      .attr('class', 'arc');

    arcs.append('path')
      .attr('d', arc)
      .attr('fill', (d: any) => color(d.data[0]) as string)
      .style('opacity', 0.8)
      .on('mouseover', function() { d3.select(this as any).style('opacity', 1); })
      .on('mouseout', function() { d3.select(this as any).style('opacity', 0.8); });

  }, [data]);

  return (
    <div className="flex flex-col items-center">
      <svg ref={svgRef} width="200" height="200" className="drop-shadow-xl" />
      <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2">
        {Object.entries(data).map(([key, val], idx) => (
          <div key={`${key}-${idx}`} className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-400">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colorMap[key] || '#3b82f6' }} />
            {getLocalizedCategory(key, t)}: {val}
          </div>
        ))}
      </div>
    </div>
  );
};
