import { ElementType } from 'react';

export const StatCard = ({ icon: Icon, label, value, subtext }: { icon: ElementType, label: string, value: string, subtext: string }) => (
  <div className="glass p-6 rounded-2xl flex flex-col gap-2 card-hover">
    <div className="flex items-center justify-between mb-2">
      <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
        <Icon size={20} />
      </div>
      <span className="text-xs font-medium text-blue-400 bg-blue-400/10 px-2 py-1 rounded-full">{subtext}</span>
    </div>
    <span className="text-slate-400 text-sm font-medium">{label}</span>
    <span className="text-2xl font-bold text-white">{value}</span>
  </div>
);
