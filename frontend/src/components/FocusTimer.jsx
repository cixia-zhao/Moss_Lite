import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, Square, Plus, BookOpen, Clock, AlertCircle, Settings } from "lucide-react";

export default function FocusTimer({ onStateChange, onRecordAdded, apiUrl }) {
  const [activeTab, setActiveTab] = useState("timer");
  
  // --- 计时器设置状态 ---
  const [timerMode, setTimerMode] = useState("forward"); // forward, p25, p50, custom_down
  const [customMinutes, setCustomMinutes] = useState(15);
  const [categoryPreset, setCategoryPreset] = useState("study"); // study, exercise, reading, coding, custom
  const [customCategory, setCustomCategory] = useState("");
  
  // --- 计时器运行状态 ---
  const [isRunning, setIsRunning] = useState(false);
  const [seconds, setSeconds] = useState(0); // 无论是正向还是倒向，都只存当前的秒数
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [timerDesc, setTimerDesc] = useState("");
  
  // --- 手动补登状态 ---
  const [manualDate, setManualDate] = useState(new Date().toISOString().split("T")[0]);
  const [manualCategory, setManualCategory] = useState("study");
  const [manualDuration, setManualDuration] = useState(60);
  const [manualDesc, setManualDesc] = useState("");
  const [manualStartTime, setManualStartTime] = useState("");
  const [manualEndTime, setManualEndTime] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const intervalRef = useRef(null);

  // 初始化或切换模式时设置初始秒数
  useEffect(() => {
    if (!isRunning && !showSaveModal) {
      if (timerMode === "forward") setSeconds(0);
      else if (timerMode === "p25") setSeconds(25 * 60);
      else if (timerMode === "p50") setSeconds(50 * 60);
      else if (timerMode === "custom_down") setSeconds(customMinutes * 60);
    }
  }, [timerMode, customMinutes, isRunning, showSaveModal]);

  useEffect(() => {
    if (isRunning) {
      onStateChange("active");
    } else {
      onStateChange("calm");
    }
  }, [isRunning, onStateChange]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSeconds((prev) => {
          if (timerMode === "forward") {
            return prev + 1;
          } else {
            if (prev <= 1) {
              clearInterval(intervalRef.current);
              setIsRunning(false);
              // 自动弹出保存
              setShowSaveModal(true);
              return 0;
            }
            return prev - 1;
          }
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, timerMode]);

  const formatTime = (totalSec) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return [
      hrs > 0 ? String(hrs).padStart(2, "0") : null,
      String(mins).padStart(2, "0"),
      String(secs).padStart(2, "0")
    ].filter(Boolean).join(":");
  };

  const handleStartPause = () => setIsRunning(!isRunning);

  const handleStop = () => {
    setIsRunning(false);
    // 如果是正向计时且时间很短
    if (timerMode === "forward" && seconds < 10) {
      setSeconds(0);
      return;
    }
    setShowSaveModal(true);
  };

  const getActualCategory = (preset, custom) => preset === "custom" ? custom : preset;

  const saveTimerRecord = async () => {
    let elapsedMinutes = 0;
    if (timerMode === "forward") {
      elapsedMinutes = Math.max(1, Math.round(seconds / 60));
    } else {
      let total = 0;
      if (timerMode === "p25") total = 25 * 60;
      if (timerMode === "p50") total = 50 * 60;
      if (timerMode === "custom_down") total = customMinutes * 60;
      elapsedMinutes = Math.max(1, Math.round((total - seconds) / 60));
    }

    const finalCategory = getActualCategory(categoryPreset, customCategory) || "study";

    const payload = {
      duration_minutes: elapsedMinutes,
      category: finalCategory,
      description: timerDesc || `[${finalCategory}] 计时记录`,
      date: new Date().toISOString().split("T")[0]
    };

    try {
      const res = await fetch(`${apiUrl}/api/records/study`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        // 重置
        if (timerMode === "forward") setSeconds(0);
        else if (timerMode === "p25") setSeconds(25 * 60);
        else if (timerMode === "p50") setSeconds(50 * 60);
        else if (timerMode === "custom_down") setSeconds(customMinutes * 60);
        setTimerDesc("");
        setShowSaveModal(false);
        onRecordAdded();
      }
    } catch (err) {
      console.error("保存专注记录失败:", err);
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    let duration = parseInt(manualDuration);
    let startDt = null;
    let endDt = null;

    if (manualStartTime && manualEndTime) {
      const [startH, startM] = manualStartTime.split(":").map(Number);
      const [endH, endM] = manualEndTime.split(":").map(Number);
      let diffMins = (endH * 60 + endM) - (startH * 60 + startM);
      if (diffMins <= 0) {
        setErrorMsg("结束时间必须晚于开始时间");
        return;
      }
      duration = diffMins;
      startDt = `${manualDate}T${manualStartTime}:00`;
      endDt = `${manualDate}T${manualEndTime}:00`;
    }

    const payload = {
      duration_minutes: duration,
      category: manualCategory,
      description: manualDesc || `补登记录`,
      date: manualDate,
      start_time: startDt,
      end_time: endDt
    };

    try {
      const res = await fetch(`${apiUrl}/api/records/study`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setManualDesc("");
        setManualStartTime("");
        setManualEndTime("");
        onRecordAdded();
      } else {
        const data = await res.json();
        setErrorMsg(data.detail || "提交失败");
      }
    } catch (err) {
      setErrorMsg("与服务器连接断开，请重试");
    }
  };

  return (
    <div className="cyber-panel p-5 rounded-lg cyber-border-glow select-none flex flex-col justify-between h-full">
      <div className="flex border-b border-cyber-blue/20 mb-4 font-mono text-xs">
        <button
          onClick={() => !isRunning && setActiveTab("timer")}
          className={`flex-1 py-2 text-center border-b-2 transition-all ${
            activeTab === "timer" 
              ? "border-cyber-cyan text-cyber-cyan cyber-text-glow" 
              : "border-transparent text-gray-500 hover:text-cyber-blue"
          }`}
        >
          <Clock className="inline w-3.5 h-3.5 mr-1" />
          MOSS FOCUS
        </button>
        <button
          onClick={() => !isRunning && setActiveTab("manual")}
          className={`flex-1 py-2 text-center border-b-2 transition-all ${
            activeTab === "manual" 
              ? "border-cyber-cyan text-cyber-cyan cyber-text-glow" 
              : "border-transparent text-gray-500 hover:text-cyber-blue"
          } ${isRunning ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <Plus className="inline w-3.5 h-3.5 mr-1" />
          MANUAL
        </button>
      </div>

      {activeTab === "timer" && (
        <div className="flex-1 flex flex-col items-center">
          {/* 配置行，只有未运行时可编辑 */}
          <div className={`w-full grid grid-cols-2 gap-2 mb-4 transition-opacity ${isRunning ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
            <div className="font-mono text-[11px] text-gray-400">
              <label className="block mb-1">模式设定</label>
              <select 
                value={timerMode} 
                onChange={e => setTimerMode(e.target.value)}
                className="w-full bg-cyber-bg border border-cyber-blue/30 rounded px-1.5 py-1 text-cyber-cyan outline-none"
              >
                <option value="forward">正向计时</option>
                <option value="p25">🍅 25分钟番茄</option>
                <option value="p50">🍅 50分钟番茄</option>
                <option value="custom_down">⚙️ 自定义倒数</option>
              </select>
              {timerMode === "custom_down" && (
                <input 
                  type="number" min="1" max="300"
                  value={customMinutes} onChange={e => setCustomMinutes(e.target.value)}
                  className="w-full mt-1 bg-cyber-bg border border-cyber-blue/30 rounded px-1.5 py-1 text-cyber-cyan outline-none"
                  placeholder="分钟数"
                />
              )}
            </div>
            <div className="font-mono text-[11px] text-gray-400">
              <label className="block mb-1">记录标签</label>
              <select 
                value={categoryPreset} 
                onChange={e => setCategoryPreset(e.target.value)}
                className="w-full bg-cyber-bg border border-cyber-blue/30 rounded px-1.5 py-1 text-cyber-cyan outline-none"
              >
                <option value="study">📖 学习/复习</option>
                <option value="coding">💻 代码/刷题</option>
                <option value="exercise">🏃 健身/运动</option>
                <option value="reading">📚 书籍阅读</option>
                <option value="custom">✏️ 自定义标签</option>
              </select>
              {categoryPreset === "custom" && (
                <input 
                  type="text"
                  value={customCategory} onChange={e => setCustomCategory(e.target.value)}
                  className="w-full mt-1 bg-cyber-bg border border-cyber-blue/30 rounded px-1.5 py-1 text-cyber-cyan outline-none"
                  placeholder="输入新标签名"
                />
              )}
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center py-2">
            <div className={`font-mono text-5xl font-black tracking-widest transition-colors ${timerMode === "forward" ? "text-cyber-cyan cyber-text-glow" : "text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]"}`}>
              {formatTime(seconds)}
            </div>
          </div>
          
          <div className="flex gap-4 mb-2 mt-4">
            <button
              onClick={handleStartPause}
              className={`p-3 rounded-full border transition-all ${
                isRunning 
                  ? "bg-amber-500/20 border-amber-500 text-amber-400" 
                  : "bg-cyber-cyan/10 border-cyber-cyan text-cyber-cyan shadow-[0_0_15px_rgba(102,252,241,0.2)]"
              }`}
            >
              {isRunning ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 fill-current" />}
            </button>
            <button
              onClick={handleStop}
              className="p-3 rounded-full border bg-cyber-pink/10 border-cyber-pink text-cyber-pink hover:shadow-[0_0_15px_rgba(255,0,127,0.2)]"
            >
              <Square className="w-6 h-6 fill-current" />
            </button>
          </div>
        </div>
      )}

      {activeTab === "manual" && (
        <form onSubmit={handleManualSubmit} className="space-y-3 font-mono text-[11px] sm:text-xs text-cyber-text">
          {errorMsg && (
             <div className="p-2 bg-cyber-red/10 border border-cyber-red/30 text-cyber-red rounded">
               {errorMsg}
             </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-gray-500 mb-1">日期</label>
              <input type="date" value={manualDate} onChange={e => setManualDate(e.target.value)} className="w-full bg-cyber-bg border border-cyber-blue/30 rounded px-2 py-1 outline-none text-cyber-cyan" required />
            </div>
            <div>
              <label className="block text-gray-500 mb-1">标签</label>
              <input type="text" value={manualCategory} onChange={e => setManualCategory(e.target.value)} placeholder="study/reading..." className="w-full bg-cyber-bg border border-cyber-blue/30 rounded px-2 py-1 outline-none text-cyber-cyan" required />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div><label className="block text-gray-500 mb-1">起</label><input type="time" value={manualStartTime} onChange={e=>setManualStartTime(e.target.value)} className="w-full bg-cyber-bg border border-cyber-blue/30 rounded px-1 py-1 outline-none text-cyber-cyan"/></div>
            <div><label className="block text-gray-500 mb-1">止</label><input type="time" value={manualEndTime} onChange={e=>setManualEndTime(e.target.value)} className="w-full bg-cyber-bg border border-cyber-blue/30 rounded px-1 py-1 outline-none text-cyber-cyan"/></div>
            <div><label className="block text-gray-500 mb-1">分</label><input type="number" disabled={!!(manualStartTime&&manualEndTime)} value={manualDuration} onChange={e=>setManualDuration(e.target.value)} className="w-full bg-cyber-bg border border-cyber-blue/30 rounded px-1 py-1 outline-none text-cyber-cyan"/></div>
          </div>
          <div>
            <label className="block text-gray-500 mb-1">备注</label>
            <input type="text" value={manualDesc} onChange={e=>setManualDesc(e.target.value)} className="w-full bg-cyber-bg border border-cyber-blue/30 rounded px-2 py-1 outline-none text-cyber-text" placeholder="事项说明"/>
          </div>
          <button type="submit" className="w-full bg-cyber-blue/20 border border-cyber-blue text-cyber-cyan py-1.5 rounded tracking-widest mt-1 hover:bg-cyber-blue/30 transition-all">LOG DATA</button>
        </form>
      )}

      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-cyber-card border border-cyber-cyan/30 rounded-lg p-5 w-full max-w-sm font-mono text-xs text-cyber-text">
            <h3 className="font-orbitron font-bold text-sm text-cyber-cyan mb-3 tracking-widest border-b border-cyber-blue/20 pb-2">
              FOCUS COMPLETION
            </h3>
            <div className="mb-4">
              <div className="flex justify-between items-center bg-cyber-bg/50 p-2 rounded mb-3 border border-cyber-blue/10">
                 <span className="text-gray-400">设定标签:</span>
                 <strong className="text-cyber-cyan uppercase">{getActualCategory(categoryPreset, customCategory)}</strong>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-gray-500 mb-1">简要记录</label>
                  <input
                    type="text"
                    value={timerDesc}
                    onChange={(e) => setTimerDesc(e.target.value)}
                    placeholder="本次主要进展？"
                    className="w-full bg-cyber-bg border border-cyber-blue/30 rounded px-2.5 py-1.5 text-cyber-text outline-none focus:border-cyber-cyan"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setShowSaveModal(false); if(timerMode==="forward")setSeconds(0); }}
                className="flex-1 border border-gray-600 hover:bg-gray-800 text-gray-400 py-1.5 rounded"
              >
                DISCARD
              </button>
              <button
                onClick={saveTimerRecord}
                className="flex-1 bg-cyber-cyan/20 border border-cyber-cyan text-cyber-cyan hover:bg-cyber-cyan/30 py-1.5 rounded"
              >
                SAVE LOG
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
