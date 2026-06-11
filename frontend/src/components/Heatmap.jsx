import React, { useState } from "react";
import { Calendar, HelpCircle, Plus, AlertCircle, Trash } from "lucide-react";

export default function Heatmap({ data, onRefresh, apiUrl }) {
  const [dimension, setDimension] = useState("combined"); // "combined", "luogu", "study", "exercise"
  const [hoveredCell, setHoveredCell] = useState(null);
  
  // 未来事件表单 Modal
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventDate, setEventDate] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [eventDesc, setEventDesc] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

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
      if (val === 1) return "bg-cyber-pink/20 border-cyber-pink/30 shadow-[0_0_4px_rgba(255,0,127,0.1)]";
      if (val === 2) return "bg-cyber-pink/40 border-cyber-pink/50 shadow-[0_0_6px_rgba(255,0,127,0.25)]";
      if (val === 3) return "bg-cyber-pink/70 border-cyber-pink/80 shadow-[0_0_8px_rgba(255,0,127,0.4)]";
      return "bg-cyber-pink border-white shadow-[0_0_12px_rgba(255,0,127,0.65)]";
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
    if (!data || data.length === 0) return null;
    
    const cells = [];
    // 为防止时区偏差，将字串直接以 UTC 甚至时区 0 来解析，或用 getUTCDay()。
    // ISO 日期串 "2024-01-01" 加上 "T00:00:00" 并在本地计算
    const dStr = data[0].date + "T00:00:00";
    const firstDate = new Date(dStr);
    const startPadding = firstDate.getDay(); 
    
    for (let i = 0; i < startPadding; i++) {
      cells.push(<div key={`pad-${i}`} className="w-3.5 h-3.5 bg-transparent" />);
    }

    data.forEach((cell) => {
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
            COGNITIVE HEATMAP
          </h3>
          <button 
            onClick={() => setShowEventModal(true)}
            className="ml-2 flex items-center gap-1 px-2 py-0.5 border border-amber-500/50 text-amber-500 hover:bg-amber-500/20 text-[10px] font-mono rounded"
          >
            <Plus className="w-3 h-3" /> 未来日程
          </button>
        </div>
        
        <div className="flex flex-wrap gap-1 font-mono text-xs">
          <button
            onClick={() => setDimension("combined")}
            className={`px-2 py-1 border transition-all ${
              dimension === "combined" ? "bg-cyber-cyan/20 border-cyber-cyan text-cyber-cyan cyber-text-glow" : "border-gray-800 text-gray-500 hover:text-cyber-blue"
            }`}
          >
            🔥 综合活跃
          </button>
          <button
            onClick={() => setDimension("luogu")}
            className={`px-2 py-1 border transition-all ${
              dimension === "luogu" ? "bg-cyber-pink/20 border-cyber-pink text-cyber-pink cyber-text-glow-pink" : "border-gray-800 text-gray-500 hover:text-cyber-blue"
            }`}
          >
            💻 洛谷刷题
          </button>
          <button
            onClick={() => setDimension("study")}
            className={`px-2 py-1 border transition-all ${
              dimension === "study" ? "bg-purple-500/20 border-purple-500 text-purple-400" : "border-gray-800 text-gray-500 hover:text-cyber-blue"
            }`}
          >
            📖 学习时间
          </button>
          <button
            onClick={() => setDimension("exercise")}
            className={`px-2 py-1 border transition-all ${
              dimension === "exercise" ? "bg-cyber-green/20 border-cyber-green text-cyber-green" : "border-gray-800 text-gray-500 hover:text-cyber-blue"
            }`}
          >
            🏃 体育健身
          </button>
        </div>
      </div>

      {/* 热力图网格 */}
      <div className="relative overflow-x-auto py-2 heatmap-scroll-container">
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
      </div>

      <div className="flex justify-between items-center mt-3 pt-3 border-t border-cyber-blue/10 font-mono text-xs text-gray-600">
        <span className="flex items-center gap-1">
          <HelpCircle className="w-3 h-3 text-gray-600" />
          光格代表当天活跃度：越深越自律 (虚线为未来规划)
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
                  倒计时: {getDaysDiff(hoveredCell.date)} 天
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
              <div className="flex justify-between border-t border-cyber-blue/10 pt-1 mt-1">
                <span>💰 今日支出:</span>
                <strong className="text-amber-500">￥{hoveredCell.expense}</strong>
              </div>
              <div className="text-[11px] text-cyber-cyan/50 mt-1">
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
              ADD MILESTONE
            </h3>
            {errorMsg && (
              <div className="flex items-center gap-1.5 p-2 bg-red-900/40 border border-red-500/50 text-red-400 rounded">
                <AlertCircle className="w-3.5 h-3.5" /> {errorMsg}
              </div>
            )}
            <div>
              <label className="block text-amber-500/70 mb-1">目标日期</label>
              <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} required className="w-full bg-cyber-bg border border-amber-500/30 rounded px-2 py-1.5 outline-none text-amber-500 focus:border-amber-500" />
            </div>
            <div>
              <label className="block text-amber-500/70 mb-1">事件名称 (如 六级考试)</label>
              <input type="text" value={eventTitle} onChange={e => setEventTitle(e.target.value)} required className="w-full bg-cyber-bg border border-amber-500/30 rounded px-2 py-1.5 outline-none text-amber-500 focus:border-amber-500" />
            </div>
            <div>
              <label className="block text-amber-500/70 mb-1">备注详情</label>
              <input type="text" value={eventDesc} onChange={e => setEventDesc(e.target.value)} className="w-full bg-cyber-bg border border-amber-500/30 rounded px-2 py-1.5 outline-none text-amber-500 focus:border-amber-500" />
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setShowEventModal(false)} className="flex-1 border border-gray-600 text-gray-400 py-1.5 rounded hover:bg-gray-800">CANCEL</button>
              <button type="submit" className="flex-1 bg-amber-500/20 border border-amber-500 text-amber-500 py-1.5 rounded hover:bg-amber-500/30">ADD EVENT</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
