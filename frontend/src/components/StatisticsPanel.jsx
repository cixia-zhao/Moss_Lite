import React, { useState } from "react";
import { BarChart2, Calendar, Target, Clock, Activity, Zap } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";

export default function StatisticsPanel({ stats }) {
  const { t } = useLanguage();
  const [timeRange, setTimeRange] = useState("daily"); // daily, weekly, monthly, yearly, total
  
  if (!stats || !stats.advanced_stats) {
    return null;
  }

  const advancedData = stats.advanced_stats[timeRange] || {};
  
  // 按照标签值从大到小排序显示
  const sortedCategories = Object.keys(advancedData).sort((a, b) => advancedData[b] - advancedData[a]);
  
  const getTotalDuration = () => {
    return sortedCategories.reduce((acc, cat) => acc + advancedData[cat], 0);
  };

  const getCategoryIcon = (cat) => {
    if (cat === "study") return "📖";
    if (cat === "coding") return "💻";
    if (cat === "exercise") return "🏃";
    if (cat === "reading") return "📚";
    return "⚡";
  };

  const getCategoryName = (cat) => {
    if (cat === "study") return t('heatmap.study');
    if (cat === "coding") return t('heatmap.luogu');
    if (cat === "exercise") return t('heatmap.exercise');
    if (cat === "reading") return t('timer.reading');
    return cat.toUpperCase();
  };

  const formatDuration = (mins) => {
    if (mins < 60) return `${mins} 分钟`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h} 小时`;
  };

  return (
    <div className="cyber-panel p-5 rounded-lg cyber-border-glow select-none h-full flex flex-col">
      <div className="flex justify-between items-center border-b border-cyber-blue/20 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-cyber-cyan" />
          <h3 className="font-orbitron font-bold text-sm text-cyber-cyan tracking-widest">
            {t('stats.title')}
          </h3>
        </div>
        
        {/* 时间维度切换器 */}
        <div className="flex gap-1 font-mono text-xs bg-cyber-bg/50 p-1 rounded border border-cyber-blue/10">
          {[
            { id: "daily", label: t('stats.daily') },
            { id: "weekly", label: t('stats.weekly') },
            { id: "monthly", label: t('stats.monthly') },
            { id: "yearly", label: t('stats.yearly') },
            { id: "total", label: t('stats.total') }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setTimeRange(tab.id)}
              className={`px-2 py-0.5 rounded transition-all ${
                timeRange === tab.id 
                  ? "bg-cyber-cyan/20 text-cyber-cyan font-bold shadow-[0_0_5px_rgba(102,252,241,0.2)]" 
                  : "text-gray-500 hover:text-cyber-cyan/70"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center">
        {sortedCategories.length === 0 ? (
          <div className="text-center text-gray-600 font-mono text-xs py-10 flex flex-col items-center gap-2">
             <Zap className="w-6 h-6 text-gray-700" />
             <p>{t('stats.empty')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 总时长统计牌 */}
            <div className="flex justify-between items-center bg-cyber-blue/5 border border-cyber-blue/20 p-3 rounded">
              <div className="flex items-center gap-2 text-gray-400 font-mono text-xs">
                 <Clock className="w-4 h-4 text-cyber-cyan" />
                 <span>{t('stats.cumulative')}</span>
              </div>
              <div className="font-orbitron font-black text-xl text-cyber-cyan cyber-text-glow">
                 {formatDuration(getTotalDuration())}
              </div>
            </div>

            {/* 各标签进度条和分布 */}
            <div className="space-y-3 font-mono text-xs">
              {sortedCategories.map(cat => {
                const mins = advancedData[cat];
                const percentage = Math.min(100, Math.round((mins / getTotalDuration()) * 100));
                
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between items-end text-gray-400">
                       <span className="flex items-center gap-1.5">
                          <span>{getCategoryIcon(cat)}</span>
                          <span className="text-cyber-text">{getCategoryName(cat)}</span>
                       </span>
                       <span className="text-cyber-cyan">{formatDuration(mins)}</span>
                    </div>
                    {/* 进度条外框 */}
                    <div className="w-full bg-gray-800/50 rounded-full h-1.5 border border-gray-700/50 overflow-hidden">
                       <div 
                         className="bg-cyber-cyan h-full rounded-full shadow-[0_0_5px_rgba(102,252,241,0.5)] transition-all duration-500" 
                         style={{ width: `${percentage}%` }}
                       />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
