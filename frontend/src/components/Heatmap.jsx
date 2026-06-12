import React, { useState } from "react";
import { Calendar, HelpCircle, Plus, AlertCircle } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";

export default function Heatmap({ data, onRefresh, apiUrl }) {
  const { t } = useLanguage();
  const [dimension, setDimension] = useState("combined"); // "combined", "luogu", "study", "exercise"
  const [hoveredCell, setHoveredCell] = useState(null);
  
  // 未来事件表单 Modal
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventDate, setEventDate] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [eventDesc, setEventDesc] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // 兼容老版本的数组格式与新版本对象格式
  const points = Array.isArray(data) ? data : (data?.points || []);
  const difficultyStats = Array.isArray(data) ? { "0": 0, "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0, "7": 0 } : (data?.difficulty_stats || { "0": 0, "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0, "7": 0 });

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    try {
      const res = await fetch(`${apiUrl}/api/records/future_events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: eventDate,
          title: eventTitle,
          description: eventDesc
        })
      });
      if (res.ok) {
        setShowEventModal(false);
        setEventDate("");
        setEventTitle("");
        setEventDesc("");
        onRefresh();
      } else {
        const data = await res.json();
        setErrorMsg(data.detail || "添加失败");
      }
    } catch (err) {
      setErrorMsg("网络异常");
    }
  };

  const getColorClass = (cell) => {
    // 处理未来事件格子
    if (cell.is_future) {
      if (cell.events && cell.events.length > 0) {
        // 未来存在事件：显示高亮边框和呼吸灯效果
        return "bg-amber-500/20 border-amber-400 text-amber-500 shadow-[0_0_8px_rgba(251,191,36,0.6)] animate-pulse";
      }
      // 未来空位：深色虚线边框
      return "bg-[#0b0c10] border-gray-800 border-dashed opacity-50";
    }

    let val = 0;
    if (dimension === "combined") val = cell.combined_score;
    else if (dimension === "luogu") val = cell.luogu_solved;
    else if (dimension === "study") val = cell.study_minutes;
    else if (dimension === "exercise") val = cell.exercise_minutes;

    if (val === 0) {
      if (cell.events && cell.events.length > 0) {
        return "bg-amber-900/40 border-amber-600/50 shadow-[0_0_4px_rgba(251,191,36,0.2)]"; // 过去有事件但当天没打卡的标记
      }
      return "bg-[#181a20] border-gray-800/40";
    }

    // 梯度划分逻辑
    if (dimension === "combined") {
      if (val < 30) return "bg-cyber-cyan/20 border-cyber-cyan/30 text-cyber-cyan shadow-[0_0_4px_rgba(102,252,241,0.1)]";
      if (val < 90) return "bg-cyber-cyan/40 border-cyber-cyan/50 text-cyber-cyan shadow-[0_0_6px_rgba(102,252,241,0.25)]";
      if (val < 180) return "bg-cyber-cyan/70 border-cyber-cyan/80 text-cyber-cyan shadow-[0_0_8px_rgba(102,252,241,0.4)]";
      return "bg-cyber-cyan border-white shadow-[0_0_12px_rgba(102,252,241,0.65)]";
    }
    
    if (dimension === "luogu") {
      const maxDiff = cell.luogu_max_difficulty || 0;
      if (maxDiff === 0) return "bg-gray-600/30 border-gray-500/40 shadow-[0_0_4px_rgba(156,163,175,0.2)]"; // 暂无评定
      if (maxDiff === 1) return "bg-[#fe4c61]/35 border-[#fe4c61]/65 text-[#fe4c61] shadow-[0_0_6px_rgba(254,76,97,0.3)]"; // 入门
      if (maxDiff === 2) return "bg-[#f39c11]/35 border-[#f39c11]/65 text-[#f39c11] shadow-[0_0_6px_rgba(243,156,17,0.3)]"; // 普及-
      if (maxDiff === 3) return "bg-[#ffc107]/35 border-[#ffc107]/65 text-[#ffc107] shadow-[0_0_6px_rgba(255,193,7,0.3)]"; // 普及/提高-
      if (maxDiff === 4) return "bg-[#52c41a]/35 border-[#52c41a]/65 text-[#52c41a] shadow-[0_0_6px_rgba(82,196,26,0.3)]"; // 普及+/提高
      if (maxDiff === 5) return "bg-[#2196f3]/35 border-[#2196f3]/65 text-[#2196f3] shadow-[0_0_6px_rgba(33,150,243,0.3)]"; // 提高+/省选-
      if (maxDiff === 6) return "bg-[#9c27b0]/35 border-[#9c27b0]/65 text-[#9c27b0] shadow-[0_0_6px_rgba(156,39,176,0.3)]"; // 省选/NOI-
      return "bg-[#0e1d69]/50 border-[#0e1d69]/80 text-[#0e1d69] shadow-[0_0_8px_rgba(14,29,105,0.45)]"; // NOI/NOI+/CTSC
    }

    if (dimension === "study") {
      if (val < 45) return "bg-purple-600/20 border-purple-500/30 shadow-[0_0_4px_rgba(168,85,247,0.1)]";
      if (val < 90) return "bg-purple-600/40 border-purple-500/50 shadow-[0_0_6px_rgba(168,85,247,0.25)]";
      if (val < 150) return "bg-purple-600/70 border-purple-500/80 shadow-[0_0_8px_rgba(168,85,247,0.4)]";
      return "bg-purple-500 border-white shadow-[0_0_12px_rgba(168,85,247,0.65)]";
    }

    if (dimension === "exercise") {
      if (val < 15) return "bg-cyber-green/20 border-cyber-green/30 shadow-[0_0_4px_rgba(57,255,20,0.1)]";
      if (val < 30) return "bg-cyber-green/40 border-cyber-green/50 shadow-[0_0_6px_rgba(57,255,20,0.25)]";
      if (val < 60) return "bg-cyber-green/70 border-cyber-green/80 shadow-[0_0_8px_rgba(57,255,20,0.4)]";
      return "bg-cyber-green border-white shadow-[0_0_12px_rgba(57,255,20,0.65)]";
    }

    return "bg-gray-800";
  };

  const renderGridCells = () => {
    if (!points || points.length === 0) return null;
    
    const cells = [];
    const dStr = points[0].date + "T00:00:00";
    const firstDate = new Date(dStr);
    const startPadding = firstDate.getDay(); 
    
    for (let i = 0; i < startPadding; i++) {
      cells.push(<div key={`pad-${i}`} className="w-3.5 h-3.5 bg-transparent" />);
    }

    points.forEach((cell) => {
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

  const renderMonthLabels = () => {
    if (!points || points.length === 0) return null;
    const dStr = points[0].date + "T00:00:00";
    const firstDate = new Date(dStr);
    const startPadding = firstDate.getDay(); 
    const columnsCount = Math.ceil((points.length + startPadding) / 7);
    
    const cols = Array.from({ length: columnsCount });
    let lastMonth = -1;
    
    return (
      <div className="grid grid-flow-col gap-[3px] auto-cols-max text-[10px] font-mono text-gray-500 mt-1.5 ml-[38px] select-none">
        {cols.map((_, col) => {
          const dayIdx = col * 7 - startPadding;
          if (dayIdx >= 0 && dayIdx < points.length) {
            const d = new Date(points[dayIdx].date + "T00:00:00");
            const m = d.getMonth();
            if (m !== lastMonth) {
              lastMonth = m;
              return (
                <div key={`m-${col}`} className="w-3.5 text-left truncate" style={{ minWidth: "14px" }}>
                  {m + 1}月
                </div>
              );
            }
          }
          return <div key={`m-${col}`} className="w-3.5" style={{ minWidth: "14px" }} />;
        })}
      </div>
    );
  };

  const renderDifficultyStats = () => {
    const diffList = [
      { key: "0", label: "暂无评定", color: "bg-gray-800/40 border-gray-700/50 text-gray-400" },
      { key: "1", label: "入门", color: "bg-[#fe4c61]/15 border-[#fe4c61]/35 text-[#fe4c61]" },
      { key: "2", label: "普及-", color: "bg-[#f39c11]/15 border-[#f39c11]/35 text-[#f39c11]" },
      { key: "3", label: "普及/提高-", color: "bg-[#ffc107]/15 border-[#ffc107]/35 text-[#ffc107]" },
      { key: "4", label: "普及+/提高", color: "bg-[#52c41a]/15 border-[#52c41a]/35 text-[#52c41a]" },
      { key: "5", label: "提高+/省选-", color: "bg-[#2196f3]/15 border-[#2196f3]/35 text-[#2196f3]" },
      { key: "6", label: "省选/NOI-", color: "bg-[#9c27b0]/15 border-[#9c27b0]/35 text-[#9c27b0]" },
      { key: "7", label: "NOI/NOI+/CTSC", color: "bg-[#0e1d69]/20 border-[#0e1d69]/40 text-[#0e1d69]" }
    ];

    return diffList.map(item => {
      const count = difficultyStats[item.key] || 0;
      return (
        <div key={item.key} className="flex justify-between items-center py-1 border-b border-cyber-blue/10 last:border-0 text-[10px]">
          <span className={`px-1.5 py-0.5 rounded border text-[9px] ${item.color} scale-95 origin-left`}>
            {item.label}
          </span>
          <strong className="text-cyber-cyan">{count} 题</strong>
        </div>
      );
    });
  };

  const getRatingDesc = (rating) => {
    if (rating === "N/A") return "⏳ 等待时间揭晓";
    if (rating === "A") return "👑 完美达标 (A)";
    if (rating === "B") return "⚡ 基本达标 (B)";
    if (rating === "C") return "⚠️ 自律预警 (C)";
    return "未知";
  };

  const getDaysDiff = (dateStr) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr + "T00:00:00");
    const diffTime = target - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="cyber-panel p-5 rounded-lg cyber-border-glow select-none relative z-10">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 border-b border-cyber-blue/20 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-cyber-cyan" />
          <h3 className="font-orbitron font-bold text-sm text-cyber-cyan tracking-widest">
            {t('heatmap.title')}
          </h3>
          <button 
            onClick={() => setShowEventModal(true)}
            className="ml-2 flex items-center gap-1 px-2 py-0.5 border border-amber-500/50 text-amber-500 hover:bg-amber-500/20 text-[10px] font-mono rounded"
          >
            + {t('heatmap.addEvent')}
          </button>
        </div>
        
        <div className="flex flex-wrap gap-1 font-mono text-xs">
          <button
            onClick={() => setDimension("combined")}
            className={`px-2 py-1 border transition-all ${
              dimension === "combined" ? "bg-cyber-cyan/20 border-cyber-cyan text-cyber-cyan cyber-text-glow" : "border-gray-800 text-gray-500 hover:text-cyber-blue"
            }`}
          >
            {t('heatmap.combined')}
          </button>
          <button
            onClick={() => setDimension("luogu")}
            className={`px-2 py-1 border transition-all ${
              dimension === "luogu" ? "bg-cyber-pink/20 border-cyber-pink text-cyber-pink cyber-text-glow-pink" : "border-gray-800 text-gray-500 hover:text-cyber-blue"
            }`}
          >
            {t('heatmap.luogu')}
          </button>
          <button
            onClick={() => setDimension("study")}
            className={`px-2 py-1 border transition-all ${
              dimension === "study" ? "bg-purple-500/20 border-purple-500 text-purple-400" : "border-gray-800 text-gray-500 hover:text-cyber-blue"
            }`}
          >
            {t('heatmap.study')}
          </button>
          <button
            onClick={() => setDimension("exercise")}
            className={`px-2 py-1 border transition-all ${
              dimension === "exercise" ? "bg-cyber-green/20 border-cyber-green text-cyber-green" : "border-gray-800 text-gray-500 hover:text-cyber-blue"
            }`}
          >
            {t('heatmap.exercise')}
          </button>
        </div>
      </div>

      {/* 主热力图与侧栏统计并排容器 */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        
        {/* 左侧：热力图网格和月份对齐标识 */}
        <div className="flex-1 w-full relative overflow-x-auto py-2 heatmap-scroll-container">
          <div className="flex gap-2 min-w-max items-center">
            {/* 左侧星期指示 - 完美对齐 */}
            <div className="grid grid-rows-7 gap-[3px] text-[11px] font-mono text-gray-600 pr-1.5 h-[116px]">
              <span className="h-3.5 flex items-center">周日</span>
              <span className="h-3.5 invisible">周一</span>
              <span className="h-3.5 flex items-center">周二</span>
              <span className="h-3.5 invisible">周三</span>
              <span className="h-3.5 flex items-center">周四</span>
              <span className="h-3.5 invisible">周五</span>
              <span className="h-3.5 flex items-center">周六</span>
            </div>
            
            <div className="flex-1">
              <div className="grid grid-flow-col grid-rows-7 gap-[3px] auto-cols-max h-[116px]">
                {renderGridCells()}
              </div>
            </div>
          </div>
          
          {/* 月份对齐指示栏 */}
          {renderMonthLabels()}
        </div>

        {/* 右侧：难度总统计小面板（仅在洛谷维度下展示） */}
        {dimension === "luogu" && (
          <div className="w-full lg:w-44 bg-cyber-card/30 border border-cyber-pink/20 rounded p-3 font-mono text-xs text-cyber-text space-y-1.5 shrink-0 shadow-[0_0_12px_rgba(255,0,127,0.1)]">
            <h4 className="font-orbitron font-bold text-cyber-pink border-b border-cyber-pink/20 pb-1.5 mb-2 text-[10px] tracking-wider uppercase text-center">
              🏆 难度总统计
            </h4>
            <div className="space-y-1">
              {renderDifficultyStats()}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center mt-3 pt-3 border-t border-cyber-blue/10 font-mono text-xs text-gray-600">
        <span className="flex items-center gap-1">
          <HelpCircle className="w-3 h-3 text-gray-600" />
          {t('heatmap.hint')}
        </span>
      </div>

      {/* 悬浮提示框 */}
      {hoveredCell && (
        <div 
          className="fixed z-50 pointer-events-none bg-cyber-card/95 border border-cyber-cyan/40 rounded p-3 shadow-2xl font-mono text-xs w-56 text-cyber-text"
          style={{ 
            left: `${Math.min(hoveredCell.x + 15, window.innerWidth - 240)}px`, 
            top: `${Math.min(hoveredCell.y + 15, window.innerHeight - 150)}px` 
          }}
        >
          <div className="text-cyber-cyan font-bold border-b border-cyber-blue/30 pb-1 mb-1.5 flex justify-between">
            <span>📅 {hoveredCell.date}</span>
            <span>{hoveredCell.is_future ? "🔮" : (hoveredCell.rating === "A" ? "🥇" : hoveredCell.rating === "B" ? "🥈" : "🚨")}</span>
          </div>
          
          {hoveredCell.is_future && (
            <div className="mb-2">
               <span className="bg-amber-500/20 text-amber-500 px-1 py-0.5 rounded border border-amber-500/30">
                  {t('heatmap.countdown', { days: getDaysDiff(hoveredCell.date) })}
               </span>
            </div>
          )}

          {hoveredCell.events && hoveredCell.events.length > 0 && (
            <div className="mb-2 space-y-1">
              {hoveredCell.events.map(ev => (
                <div key={ev.id} className="bg-amber-900/40 p-1.5 rounded border border-amber-600/50">
                   <div className="text-amber-400 font-bold">{ev.title}</div>
                   {ev.description && <div className="text-[10px] text-amber-200/70">{ev.description}</div>}
                </div>
              ))}
            </div>
          )}

          {!hoveredCell.is_future && (
            <div className="space-y-1 text-gray-400">
              {dimension === "combined" && (
                <>
                  <div className="flex justify-between">
                    <span>📚 学习时长:</span>
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
                </>
              )}
              
              {dimension === "study" && (
                <div className="flex justify-between">
                  <span>📚 学习时长:</span>
                  <strong className="text-cyber-cyan">{hoveredCell.study_minutes} min</strong>
                </div>
              )}
              
              {dimension === "exercise" && (
                <div className="flex justify-between">
                  <span>🏃 运动时长:</span>
                  <strong className="text-cyber-green">{hoveredCell.exercise_minutes} min</strong>
                </div>
              )}
              
              {dimension === "luogu" && (
                <>
                  <div className="flex justify-between">
                    <span>💻 当日过题:</span>
                    <strong className="text-cyber-pink">{hoveredCell.luogu_solved} 题</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>最高难度:</span>
                    <strong className="text-amber-400">
                      {["暂无评定", "入门", "普及-", "普及/提高-", "普及+/提高", "提高+/省选-", "省选/NOI-", "NOI/NOI+/CTSC"][hoveredCell.luogu_max_difficulty || 0]}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>刷题时长:</span>
                    <strong className="text-cyber-cyan">{hoveredCell.coding_minutes || 0} min</strong>
                  </div>
                </>
              )}

              <div className="text-[11px] text-cyber-cyan/50 border-t border-cyber-blue/10 pt-1 mt-1">
                {getRatingDesc(hoveredCell.rating)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 创建未来日程 Modal */}
      {showEventModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <form onSubmit={handleCreateEvent} className="bg-cyber-card border border-amber-500/50 rounded-lg p-5 w-full max-w-sm font-mono text-xs text-cyber-text space-y-3">
            <h3 className="font-orbitron font-bold text-sm text-amber-500 mb-2 tracking-widest border-b border-amber-500/20 pb-2">
              {t('heatmap.addMilestone')}
            </h3>
            {errorMsg && (
              <div className="flex items-center gap-1.5 p-2 bg-red-900/40 border border-red-500/50 text-red-400 rounded">
                <AlertCircle className="w-3.5 h-3.5" /> {errorMsg}
              </div>
            )}
            <div>
              <label className="block text-amber-500/70 mb-1">{t('heatmap.targetDate')}</label>
              <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} required className="w-full bg-cyber-bg border border-amber-500/30 rounded px-2 py-1.5 outline-none text-amber-500 focus:border-amber-500" />
            </div>
            <div>
              <label className="block text-amber-500/70 mb-1">{t('heatmap.eventName')}</label>
              <input type="text" value={eventTitle} onChange={e => setEventTitle(e.target.value)} required className="w-full bg-cyber-bg border border-amber-500/30 rounded px-2 py-1.5 outline-none text-amber-500 focus:border-amber-500" />
            </div>
            <div>
              <label className="block text-amber-500/70 mb-1">{t('heatmap.eventDesc')}</label>
              <input type="text" value={eventDesc} onChange={e => setEventDesc(e.target.value)} className="w-full bg-cyber-bg border border-amber-500/30 rounded px-2 py-1.5 outline-none text-amber-500 focus:border-amber-500" />
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setShowEventModal(false)} className="flex-1 border border-gray-600 text-gray-400 py-1.5 rounded hover:bg-gray-800">{t('settings.cancel')}</button>
              <button type="submit" className="flex-1 bg-amber-500/20 border border-amber-500 text-amber-500 py-1.5 rounded hover:bg-amber-500/30">{t('heatmap.addEventBtn')}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
