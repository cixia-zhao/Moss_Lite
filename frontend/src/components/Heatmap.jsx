import React, { useState } from "react";
import { Calendar, HelpCircle, Plus, AlertCircle, Edit, Trash2 } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";

function isValidDate(y, m, d) {
  const year = parseInt(y, 10);
  const month = parseInt(m, 10);
  const day = parseInt(d, 10);

  if (isNaN(year) || isNaN(month) || isNaN(day)) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  const monthLength = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  if (year % 400 === 0 || (year % 100 !== 0 && year % 4 === 0)) {
    monthLength[1] = 29;
  }

  return day <= monthLength[month - 1];
}

export default function Heatmap({ data, onRefresh, apiUrl }) {
  const { t } = useLanguage();
  const [dimension, setDimension] = useState("combined"); // "combined", "luogu", "study", "exercise"
  const [hoveredCell, setHoveredCell] = useState(null);
  
  // 未来事件管理 Modal 状态
  const [showManageModal, setShowManageModal] = useState(false);
  const [futureEvents, setFutureEvents] = useState([]);
  const [showEventForm, setShowEventForm] = useState(false);
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [editingEventId, setEditingEventId] = useState(null);
  const [eventDate, setEventDate] = useState("");
  const [dateYear, setDateYear] = useState("");
  const [dateMonth, setDateMonth] = useState("");
  const [dateDay, setDateDay] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [eventDesc, setEventDesc] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // 同步拆分日期到三个文本框中
  React.useEffect(() => {
    if (eventDate && eventDate.includes("-")) {
      const parts = eventDate.split("-");
      setDateYear(parts[0] || "");
      setDateMonth(parts[1] || "");
      setDateDay(parts[2] || "");
    } else {
      setDateYear("");
      setDateMonth("");
      setDateDay("");
    }
  }, [eventDate]);


  // 兼容老版本的数组格式与新版本对象格式
  const points = Array.isArray(data) ? data : (data?.points || []);
  const difficultyStats = Array.isArray(data) ? { "0": 0, "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0, "7": 0 } : (data?.difficulty_stats || { "0": 0, "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0, "7": 0 });

  const fetchFutureEvents = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/records/future_events`);
      if (res.ok) {
        const data = await res.json();
        setFutureEvents(data);
      }
    } catch (err) {
      console.error("获取未来事件失败:", err);
    }
  };

  const handleYearChange = (e) => {
    const val = e.target.value.replace(/\D/g, "");
    setDateYear(val);
    if (val.length === 4) {
      document.getElementById("event-date-month")?.focus();
    }
  };

  const handleMonthChange = (e) => {
    let val = e.target.value.replace(/\D/g, "");
    if (val !== "") {
      const num = parseInt(val, 10);
      if (num > 12) {
        val = "12";
      }
      if (val.length === 1 && num > 1) {
        val = "0" + val;
      }
    }
    setDateMonth(val);
    if (val.length === 2) {
      document.getElementById("event-date-day")?.focus();
    }
  };

  const handleMonthBlur = () => {
    if (dateMonth && dateMonth.length === 1) {
      setDateMonth(dateMonth.padStart(2, "0"));
    }
  };

  const handleDayChange = (e) => {
    let val = e.target.value.replace(/\D/g, "");
    if (val !== "") {
      const num = parseInt(val, 10);
      if (num > 31) {
        val = "31";
      }
      if (val.length === 1 && num > 3) {
        val = "0" + val;
      }
    }
    setDateDay(val);
  };

  const handleDayBlur = () => {
    if (dateDay && dateDay.length === 1) {
      setDateDay(dateDay.padStart(2, "0"));
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    const year = dateYear.trim();
    const month = dateMonth.trim().padStart(2, "0");
    const day = dateDay.trim().padStart(2, "0");

    if (year.length !== 4 || dateMonth.trim().length === 0 || dateDay.trim().length === 0) {
      setErrorMsg("请输入有效的年月日日期");
      return;
    }

    if (!isValidDate(year, month, day)) {
      setErrorMsg("请输入有效的公历日期（注意大小月及闰年）");
      return;
    }

    const payload = {
      date: `${year}-${month}-${day}`,
      title: eventTitle,
      description: eventDesc || null
    };

    try {
      const url = isEditingEvent 
        ? `${apiUrl}/api/records/future_events/${editingEventId}`
        : `${apiUrl}/api/records/future_events`;
      const method = isEditingEvent ? "PUT" : "POST";

      const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowEventForm(false);
        setIsEditingEvent(false);
        setEditingEventId(null);
        setEventDate("");
        setEventTitle("");
        setEventDesc("");
        fetchFutureEvents();
        onRefresh();
      } else {
        const data = await res.json();
        setErrorMsg(data.detail || "操作失败");
      }
    } catch (err) {
      setErrorMsg("网络异常，请稍后重试");
    }
  };

  const handleEditClick = (ev) => {
    setIsEditingEvent(true);
    setEditingEventId(ev.id);
    setEventDate(ev.date);
    setEventTitle(ev.title);
    setEventDesc(ev.description || "");
    setShowEventForm(true);
  };

  const handleDeleteClick = async (eventId) => {
    try {
      const res = await fetch(`${apiUrl}/api/records/future_events/${eventId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        fetchFutureEvents();
        onRefresh();
      } else {
        setErrorMsg("删除失败");
      }
    } catch (err) {
      setErrorMsg("网络异常");
    }
  };

  const handleCellClick = (cell) => {
    if (cell.is_future || (cell.events && cell.events.length > 0)) {
      setEventDate(cell.date);
      fetchFutureEvents();
      setShowManageModal(true);
      if (!cell.events || cell.events.length === 0) {
        setShowEventForm(true);
        setIsEditingEvent(false);
        setEditingEventId(null);
        setEventTitle("");
        setEventDesc("");
      } else {
        setShowEventForm(false);
        setIsEditingEvent(false);
        setEditingEventId(null);
      }
    }
  };

  const handleOpenManager = () => {
    fetchFutureEvents();
    setShowManageModal(true);
    setShowEventForm(false);
    setIsEditingEvent(false);
    setEditingEventId(null);
    setEventDate("");
    setEventTitle("");
    setEventDesc("");
    setErrorMsg("");
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
          onClick={() => handleCellClick(cell)}
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
            onClick={handleOpenManager}
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

      {/* 未来日程管理舱 Modal */}
      {showManageModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-cyber-card border border-cyber-blue/30 rounded-lg p-5 w-full max-w-lg font-mono text-xs text-cyber-text space-y-4 shadow-[0_0_15px_rgba(0,186,255,0.15)] flex flex-col max-h-[85vh]">
            {/* 头部 */}
            <div className="flex justify-between items-center border-b border-cyber-blue/20 pb-2 flex-shrink-0">
              <h3 className="font-orbitron font-bold text-sm text-cyber-cyan tracking-widest flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-cyber-cyan" />
                未来日程管理舱
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowManageModal(false);
                  setIsEditingEvent(false);
                  setEventDate("");
                  setEventTitle("");
                  setEventDesc("");
                  setErrorMsg("");
                }}
                className="text-gray-500 hover:text-cyber-cyan text-base font-bold px-1"
              >
                ✕
              </button>
            </div>

            {/* 错误提示 */}
            {errorMsg && (
              <div className="flex items-center gap-1.5 p-2 bg-red-900/40 border border-red-500/50 text-red-400 rounded flex-shrink-0">
                <AlertCircle className="w-3.5 h-3.5" /> {errorMsg}
              </div>
            )}

            {/* 表单区域：用于新增或修改 */}
            {(showEventForm || isEditingEvent) ? (
              <form onSubmit={handleFormSubmit} className="bg-cyber-bg/50 border border-cyber-blue/10 p-4 rounded space-y-3 flex-shrink-0">
                <h4 className="text-cyber-cyan font-bold mb-2 tracking-wider">
                  {isEditingEvent ? "✏️ 修改里程碑" : "✨ 新增未来里程碑"}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-500 mb-1">{t('heatmap.targetDate')}</label>
                    <div className="flex items-center bg-cyber-bg border border-cyber-blue/30 rounded px-2.5 py-1.5 focus-within:border-cyber-cyan gap-1">
                      <input
                        id="event-date-year"
                        type="text"
                        maxLength={4}
                        value={dateYear}
                        onChange={handleYearChange}
                        placeholder="YYYY"
                        required
                        className="w-10 bg-transparent text-center text-cyber-cyan outline-none font-mono"
                      />
                      <span className="text-gray-600 font-mono">/</span>
                      <input
                        id="event-date-month"
                        type="text"
                        maxLength={2}
                        value={dateMonth}
                        onChange={handleMonthChange}
                        onBlur={handleMonthBlur}
                        placeholder="MM"
                        required
                        className="w-6 bg-transparent text-center text-cyber-cyan outline-none font-mono"
                      />
                      <span className="text-gray-600 font-mono">/</span>
                      <input
                        id="event-date-day"
                        type="text"
                        maxLength={2}
                        value={dateDay}
                        onChange={handleDayChange}
                        onBlur={handleDayBlur}
                        placeholder="DD"
                        required
                        className="w-6 bg-transparent text-center text-cyber-cyan outline-none font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-gray-500 mb-1">{t('heatmap.eventName')}</label>
                    <input 
                      type="text" 
                      value={eventTitle} 
                      onChange={e => setEventTitle(e.target.value)} 
                      required 
                      placeholder="如 六级考试, 期末备考" 
                      className="w-full bg-cyber-bg border border-cyber-blue/30 rounded px-2.5 py-1.5 outline-none text-cyber-cyan focus:border-cyber-cyan" 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-gray-500 mb-1">{t('heatmap.eventDesc')}</label>
                  <input 
                    type="text" 
                    value={eventDesc} 
                    onChange={e => setEventDesc(e.target.value)} 
                    placeholder="详细目标或备注" 
                    className="w-full bg-cyber-bg border border-cyber-blue/30 rounded px-2.5 py-1.5 outline-none text-cyber-cyan focus:border-cyber-cyan" 
                  />
                </div>
                <div className="flex gap-2 pt-1.5">
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowEventForm(false);
                      setIsEditingEvent(false);
                      setEditingEventId(null);
                      setEventDate("");
                      setEventTitle("");
                      setEventDesc("");
                    }} 
                    className="flex-1 border border-gray-600 text-gray-400 py-1.5 rounded hover:bg-gray-800"
                  >
                    {t('settings.cancel')}
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 bg-cyber-cyan/20 border border-cyber-cyan text-cyber-cyan py-1.5 rounded hover:bg-cyber-cyan/30 font-bold"
                  >
                    {isEditingEvent ? "保存修改" : t('heatmap.addEventBtn')}
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setShowEventForm(true)}
                className="w-full py-2 bg-cyber-cyan/10 border border-dashed border-cyber-cyan/40 hover:bg-cyber-cyan/20 text-cyber-cyan rounded flex items-center justify-center gap-1.5 font-bold flex-shrink-0"
              >
                <Plus className="w-4 h-4" />
                建立新里程碑计划
              </button>
            )}

            {/* 列表区域：展示所有的未来日程 */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 min-h-[200px]">
              {futureEvents.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  未来空空如也，快去定下一个目标吧 🚀
                </div>
              ) : (
                futureEvents.map(ev => (
                  <div key={ev.id} className="bg-cyber-bg/40 border border-cyber-blue/10 hover:border-cyber-cyan/30 p-3 rounded flex justify-between items-start transition-all gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-1.5 py-0.5 rounded font-mono font-bold">
                          📅 {ev.date}
                        </span>
                        <span className="text-gray-500 font-mono scale-90 origin-left">
                          ({t('heatmap.countdown', { days: getDaysDiff(ev.date) })})
                        </span>
                      </div>
                      <h4 className="font-bold text-cyber-text text-sm leading-snug">{ev.title}</h4>
                      {ev.description && (
                        <p className="text-[11px] text-gray-400/80 leading-relaxed font-mono pl-0.5">{ev.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <button
                        type="button"
                        onClick={() => handleEditClick(ev)}
                        className="text-gray-500 hover:text-cyber-cyan p-1 transition-all"
                        title="编辑"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteClick(ev.id)}
                        className="text-gray-500 hover:text-cyber-pink p-1 transition-all"
                        title="删除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
