import React, { useState, useEffect } from "react";
import { Calendar, HelpCircle, ChevronRight } from "lucide-react";

export default function Heatmap({ data, onRefresh, days = 70 }) {
  const [dimension, setDimension] = useState("combined"); // "combined", "luogu", "study", "exercise"
  const [hoveredCell, setHoveredCell] = useState(null);

  // 根据指标和大小计算色阶等级 (0-4)
  const getColorClass = (cell) => {
    let val = 0;
    if (dimension === "combined") val = cell.combined_score;
    else if (dimension === "luogu") val = cell.luogu_solved;
    else if (dimension === "study") val = cell.study_minutes;
    else if (dimension === "exercise") val = cell.exercise_minutes;

    if (val === 0) return "bg-[#181a20] border-gray-800/40";

    // 梯度划分逻辑
    if (dimension === "combined") {
      if (val < 30) return "bg-cyber-cyan/20 border-cyber-cyan/30 text-cyber-cyan";
      if (val < 90) return "bg-cyber-cyan/40 border-cyber-cyan/50 text-cyber-cyan";
      if (val < 180) return "bg-cyber-cyan/70 border-cyber-cyan/80 text-cyber-cyan";
      return "bg-cyber-cyan border-white shadow-[0_0_10px_rgba(102,252,241,0.5)]";
    }
    
    if (dimension === "luogu") {
      if (val === 1) return "bg-cyber-pink/20 border-cyber-pink/30";
      if (val === 2) return "bg-cyber-pink/40 border-cyber-pink/50";
      if (val === 3) return "bg-cyber-pink/70 border-cyber-pink/80";
      return "bg-cyber-pink border-white shadow-[0_0_10px_rgba(255,0,127,0.5)]";
    }

    if (dimension === "study") {
      if (val < 45) return "bg-purple-600/20 border-purple-500/30";
      if (val < 90) return "bg-purple-600/40 border-purple-500/50";
      if (val < 150) return "bg-purple-600/70 border-purple-500/80";
      return "bg-purple-500 border-white shadow-[0_0_10px_rgba(168,85,247,0.5)]";
    }

    if (dimension === "exercise") {
      if (val < 15) return "bg-cyber-green/20 border-cyber-green/30";
      if (val < 30) return "bg-cyber-green/40 border-cyber-green/50";
      if (val < 60) return "bg-cyber-green/70 border-cyber-green/80";
      return "bg-cyber-green border-white shadow-[0_0_10px_rgba(57,255,20,0.5)]";
    }

    return "bg-gray-800";
  };

  // 整理网格布局 (按星期排列，保证对齐)
  // 获取数据中第一天是星期几
  const renderGridCells = () => {
    if (!data || data.length === 0) return null;
    
    const cells = [];
    const firstDate = new Date(data[0].date);
    const startPadding = firstDate.getDay(); // 0 是周日，以此填充空白格子
    
    for (let i = 0; i < startPadding; i++) {
      cells.push(<div key={`pad-${i}`} className="w-3.5 h-3.5 bg-transparent" />);
    }

    data.forEach((cell, idx) => {
      cells.push(
        <div
          key={cell.date}
          onMouseEnter={(e) => setHoveredCell({ ...cell, x: e.clientX, y: e.clientY })}
          onMouseLeave={() => setHoveredCell(null)}
          className={`w-3.5 h-3.5 rounded-sm border cursor-crosshair transition-all duration-150 hover:scale-125 hover:z-10 ${getColorClass(cell)}`}
        />
      );
    });

    return cells;
  };

  // 翻译等级
  const getRatingDesc = (rating) => {
    if (rating === "A") return "👑 完美达标 (A)";
    if (rating === "B") return "⚡ 基本达标 (B)";
    if (rating === "C") return "⚠️ 自律预警 (C)";
    return "未知";
  };

  return (
    <div className="cyber-panel p-5 rounded-lg cyber-border-glow select-none">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-cyber-blue/20 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-cyber-cyan" />
          <h3 className="font-orbitron font-bold text-sm text-cyber-cyan tracking-widest">
            COGNITIVE ACTIVE HEATMAP
          </h3>
        </div>
        
        {/* 维度选择器 */}
        <div className="flex flex-wrap gap-1 font-mono text-[9px]">
          <button
            onClick={() => setDimension("combined")}
            className={`px-2 py-1 border transition-all ${
              dimension === "combined"
                ? "bg-cyber-cyan/20 border-cyber-cyan text-cyber-cyan cyber-text-glow"
                : "border-gray-800 text-gray-500 hover:text-cyber-blue"
            }`}
          >
            🔥 综合活跃
          </button>
          <button
            onClick={() => setDimension("luogu")}
            className={`px-2 py-1 border transition-all ${
              dimension === "luogu"
                ? "bg-cyber-pink/20 border-cyber-pink text-cyber-pink cyber-text-glow-pink"
                : "border-gray-800 text-gray-500 hover:text-cyber-blue"
            }`}
          >
            💻 洛谷刷题
          </button>
          <button
            onClick={() => setDimension("study")}
            className={`px-2 py-1 border transition-all ${
              dimension === "study"
                ? "bg-purple-500/20 border-purple-500 text-purple-400"
                : "border-gray-800 text-gray-500 hover:text-cyber-blue"
            }`}
          >
            📖 学习时间
          </button>
          <button
            onClick={() => setDimension("exercise")}
            className={`px-2 py-1 border transition-all ${
              dimension === "exercise"
                ? "bg-cyber-green/20 border-cyber-green text-cyber-green"
                : "border-gray-800 text-gray-500 hover:text-cyber-blue"
            }`}
          >
            🏃 体育健身
          </button>
        </div>
      </div>

      {/* 热力图网格 */}
      <div className="relative overflow-x-auto py-2">
        <div className="flex gap-2 min-w-[500px]">
          {/* 左侧星期指示 */}
          <div className="flex flex-col justify-between text-[8px] font-mono text-gray-600 pr-1 h-[122px] pt-1">
            <span>周日</span>
            <span>周二</span>
            <span>周四</span>
            <span>周六</span>
          </div>
          
          {/* 网格主容器 */}
          <div className="flex-1">
            <div className="grid grid-flow-col grid-rows-7 gap-[3px] auto-cols-max h-[122px]">
              {renderGridCells()}
            </div>
          </div>
        </div>
      </div>

      {/* 底部色带说明 */}
      <div className="flex justify-between items-center mt-3 pt-3 border-t border-cyber-blue/10 font-mono text-[9px] text-gray-600">
        <span className="flex items-center gap-1">
          <HelpCircle className="w-3 h-3 text-gray-600" />
          光格代表当天活跃度：越深越自律
        </span>
        <div className="flex items-center gap-1.5">
          <span>少</span>
          <div className="w-2.5 h-2.5 rounded-sm bg-[#181a20] border border-gray-800/40" />
          <div className={`w-2.5 h-2.5 rounded-sm border ${
            dimension === "combined" ? "bg-cyber-cyan/20 border-cyber-cyan/30" :
            dimension === "luogu" ? "bg-cyber-pink/20 border-cyber-pink/30" :
            dimension === "study" ? "bg-purple-600/20 border-purple-500/30" : "bg-cyber-green/20 border-cyber-green/30"
          }`} />
          <div className={`w-2.5 h-2.5 rounded-sm border ${
            dimension === "combined" ? "bg-cyber-cyan/40 border-cyber-cyan/50" :
            dimension === "luogu" ? "bg-cyber-pink/40 border-cyber-pink/50" :
            dimension === "study" ? "bg-purple-600/40 border-purple-500/50" : "bg-cyber-green/40 border-cyber-green/50"
          }`} />
          <div className={`w-2.5 h-2.5 rounded-sm border ${
            dimension === "combined" ? "bg-cyber-cyan/70 border-cyber-cyan/80" :
            dimension === "luogu" ? "bg-cyber-pink/70 border-cyber-pink/80" :
            dimension === "study" ? "bg-purple-600/70 border-purple-500/80" : "bg-cyber-green/70 border-cyber-green/80"
          }`} />
          <div className={`w-2.5 h-2.5 rounded-sm ${
            dimension === "combined" ? "bg-cyber-cyan" :
            dimension === "luogu" ? "bg-cyber-pink" :
            dimension === "study" ? "bg-purple-500" : "bg-cyber-green"
          }`} />
          <span>多</span>
        </div>
      </div>

      {/* 全息悬浮卡片 (Tooltip) */}
      {hoveredCell && (
        <div 
          className="fixed z-50 pointer-events-none bg-cyber-card/95 border border-cyber-cyan/40 rounded p-3 shadow-2xl font-mono text-[10px] w-48 text-cyber-text"
          style={{ 
            left: `${hoveredCell.x + 15}px`, 
            top: `${hoveredCell.y + 15}px` 
          }}
        >
          <div className="text-cyber-cyan font-bold border-b border-cyber-blue/30 pb-1 mb-1.5 flex justify-between">
            <span>📅 {hoveredCell.date}</span>
            <span>{hoveredCell.rating === "A" ? "🥇" : hoveredCell.rating === "B" ? "🥈" : "🚨"}</span>
          </div>
          <div className="space-y-1 text-gray-400">
            <div className="flex justify-between">
              <span>📚 学习专注:</span>
              <strong className="text-cyber-cyan">{hoveredCell.study_minutes} min</strong>
            </div>
            <div className="flex justify-between">
              <span>🏃 运动时长:</span>
              <strong className="text-cyber-green">{hoveredCell.exercise_minutes} min</strong>
            </div>
            <div className="flex justify-between">
              <span>💻 洛谷刷题:</span>
              <strong className="text-cyber-pink">{hoveredCell.luogu_solved} 题</strong>
            </div>
            <div className="flex justify-between border-t border-cyber-blue/10 pt-1 mt-1">
              <span>💰 今日支出:</span>
              <strong className="text-amber-500">￥{hoveredCell.expense}</strong>
            </div>
            <div className="text-[9px] text-cyber-cyan/50 mt-1">
              {getRatingDesc(hoveredCell.rating)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
