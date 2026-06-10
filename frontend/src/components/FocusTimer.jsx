import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, Square, Plus, BookOpen, Clock, AlertCircle } from "lucide-react";

export default function FocusTimer({ onStateChange, onRecordAdded, apiUrl }) {
  const [activeTab, setActiveTab] = useState("timer"); // "timer" 或 "manual"
  
  // 计时器状态
  const [isRunning, setIsRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [timerCategory, setTimerCategory] = useState("study");
  const [timerDesc, setTimerDesc] = useState("");
  const [showSaveModal, setShowSaveModal] = useState(false);
  
  // 手动补登状态
  const [manualDate, setManualDate] = useState(new Date().toISOString().split("T")[0]);
  const [manualCategory, setManualCategory] = useState("study");
  const [manualDuration, setManualDuration] = useState(60);
  const [manualDesc, setManualDesc] = useState("");
  const [manualStartTime, setManualStartTime] = useState("");
  const [manualEndTime, setManualEndTime] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const intervalRef = useRef(null);

  // 监听计时器状态改变，通知父组件修改智脑波动
  useEffect(() => {
    if (isRunning) {
      onStateChange("active");
    } else {
      onStateChange("calm");
    }
  }, [isRunning, onStateChange]);

  // 计时累加
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  // 格式化展示时间
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

  // 开始 / 暂停
  const handleStartPause = () => {
    setIsRunning(!isRunning);
  };

  // 结束计时
  const handleStop = () => {
    if (seconds < 10) {
      // 专注不足10秒直接重置，不予记录
      setIsRunning(false);
      setSeconds(0);
      return;
    }
    setIsRunning(false);
    setShowSaveModal(true);
  };

  // 保存计时数据
  const saveTimerRecord = async () => {
    const minutes = Math.max(1, Math.round(seconds / 60));
    const payload = {
      duration_minutes: minutes,
      category: timerCategory,
      description: timerDesc || "在线专注计时器记录",
      date: new Date().toISOString().split("T")[0]
    };

    try {
      const res = await fetch(`${apiUrl}/api/records/study`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setSeconds(0);
        setTimerDesc("");
        setShowSaveModal(false);
        onRecordAdded();
      }
    } catch (err) {
      console.error("保存专注记录失败:", err);
    }
  };

  // 手动补登提交
  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    let duration = parseInt(manualDuration);
    let startDt = null;
    let endDt = null;

    // 如果填了起止时间，则重新计算分钟数
    if (manualStartTime && manualEndTime) {
      const [startH, startM] = manualStartTime.split(":").map(Number);
      const [endH, endM] = manualEndTime.split(":").map(Number);
      
      let diffMins = (endH * 60 + endM) - (startH * 60 + startM);
      if (diffMins <= 0) {
        setErrorMsg("结束时间必须晚于开始时间");
        return;
      }
      duration = diffMins;
      
      const todayStr = manualDate;
      startDt = `${todayStr}T${manualStartTime}:00`;
      endDt = `${todayStr}T${manualEndTime}:00`;
    }

    const payload = {
      duration_minutes: duration,
      category: manualCategory,
      description: manualDesc || `${manualCategory === "exercise" ? "体育运动" : "日常专注"}记录`,
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
        setErrorMsg(data.detail || "提交记录失败");
      }
    } catch (err) {
      setErrorMsg("与服务器连接断开，请重试");
    }
  };

  return (
    <div className="cyber-panel p-5 rounded-lg cyber-border-glow select-none">
      {/* Tab 导航 */}
      <div className="flex border-b border-cyber-blue/20 mb-4 font-mono text-xs">
        <button
          onClick={() => setActiveTab("timer")}
          className={`flex-1 py-2 text-center border-b-2 transition-all ${
            activeTab === "timer" 
              ? "border-cyber-cyan text-cyber-cyan cyber-text-glow" 
              : "border-transparent text-gray-500 hover:text-cyber-blue"
          }`}
        >
          <Clock className="inline w-3.5 h-3.5 mr-1" />
          MOSS FOCUS TIMER
        </button>
        <button
          onClick={() => setActiveTab("manual")}
          className={`flex-1 py-2 text-center border-b-2 transition-all ${
            activeTab === "manual" 
              ? "border-cyber-cyan text-cyber-cyan cyber-text-glow" 
              : "border-transparent text-gray-500 hover:text-cyber-blue"
          }`}
        >
          <Plus className="inline w-3.5 h-3.5 mr-1" />
          MANUAL LOGGING
        </button>
      </div>

      {/* 计时器面板 */}
      {activeTab === "timer" && (
        <div className="flex flex-col items-center py-6">
          <div className="font-mono text-5xl font-black text-cyber-cyan tracking-widest cyber-text-glow mb-6">
            {formatTime(seconds)}
          </div>
          
          <div className="flex gap-4 mb-5">
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
              disabled={seconds === 0}
              className={`p-3 rounded-full border transition-all ${
                seconds === 0 
                  ? "bg-gray-800 border-gray-700 text-gray-600 cursor-not-allowed" 
                  : "bg-cyber-pink/10 border-cyber-pink text-cyber-pink hover:shadow-[0_0_15px_rgba(255,0,127,0.2)]"
              }`}
            >
              <Square className="w-6 h-6 fill-current" />
            </button>
          </div>

          <div className="flex items-center gap-2 text-[10px] font-mono text-gray-500">
            <BookOpen className="w-3.5 h-3.5" />
            <span>当前模式下专注将同步反馈至 MOSS 波形</span>
          </div>
        </div>
      )}

      {/* 手动补登面板 */}
      {activeTab === "manual" && (
        <form onSubmit={handleManualSubmit} className="space-y-3 font-mono text-xs text-cyber-text">
          {errorMsg && (
            <div className="flex items-center gap-1.5 p-2 bg-cyber-red/10 border border-cyber-red/30 text-cyber-red rounded">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-500 mb-1">记录日期</label>
              <input
                type="date"
                value={manualDate}
                onChange={(e) => setManualDate(e.target.value)}
                className="w-full bg-cyber-bg border border-cyber-blue/30 rounded px-2.5 py-1.5 text-cyber-cyan outline-none focus:border-cyber-cyan"
                required
              />
            </div>
            <div>
              <label className="block text-gray-500 mb-1">专注维度</label>
              <select
                value={manualCategory}
                onChange={(e) => setManualCategory(e.target.value)}
                className="w-full bg-cyber-bg border border-cyber-blue/30 rounded px-2.5 py-1.5 text-cyber-cyan outline-none focus:border-cyber-cyan"
              >
                <option value="study">📖 学术复习 / 学习</option>
                <option value="coding">💻 代码开发 / 刷题</option>
                <option value="exercise">🏃 体育健身 / 运动</option>
                <option value="reading">📚 深度书籍阅读</option>
                <option value="other">⚙️ 其他自律事项</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-gray-500 mb-1">开始时刻</label>
              <input
                type="time"
                value={manualStartTime}
                onChange={(e) => setManualStartTime(e.target.value)}
                className="w-full bg-cyber-bg border border-cyber-blue/30 rounded px-2 py-1.5 text-cyber-cyan outline-none focus:border-cyber-cyan"
              />
            </div>
            <div>
              <label className="block text-gray-500 mb-1">结束时刻</label>
              <input
                type="time"
                value={manualEndTime}
                onChange={(e) => setManualEndTime(e.target.value)}
                className="w-full bg-cyber-bg border border-cyber-blue/30 rounded px-2 py-1.5 text-cyber-cyan outline-none focus:border-cyber-cyan"
              />
            </div>
            <div>
              <label className="block text-gray-500 mb-1">时长(分钟)</label>
              <input
                type="number"
                value={manualDuration}
                disabled={!!(manualStartTime && manualEndTime)}
                onChange={(e) => setManualDuration(e.target.value)}
                placeholder="或直接填"
                className="w-full bg-cyber-bg border border-cyber-blue/30 rounded px-2 py-1.5 text-cyber-cyan outline-none focus:border-cyber-cyan disabled:bg-gray-800 disabled:text-gray-600 disabled:border-gray-700"
                min="1"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-500 mb-1">备注说明</label>
            <input
              type="text"
              value={manualDesc}
              onChange={(e) => setManualDesc(e.target.value)}
              placeholder="例如: 复习高数第三章拉格朗日"
              className="w-full bg-cyber-bg border border-cyber-blue/30 rounded px-2.5 py-1.5 text-cyber-text outline-none focus:border-cyber-cyan"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-cyber-blue/20 hover:bg-cyber-cyan/20 border border-cyber-blue text-cyber-cyan py-2 rounded font-orbitron font-bold tracking-widest transition-all"
          >
            LOG FOCUS DATA
          </button>
        </form>
      )}

      {/* 计时器保存保存 Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-cyber-card border border-cyber-cyan/30 rounded-lg p-5 w-full max-w-sm font-mono text-xs text-cyber-text">
            <h3 className="font-orbitron font-bold text-sm text-cyber-cyan mb-3 tracking-widest border-b border-cyber-blue/20 pb-2">
              FOCUS COMPLETION
            </h3>
            <div className="mb-4">
              <p className="text-gray-400 mb-2">本次专注时长: <strong className="text-cyber-cyan">{Math.max(1, Math.round(seconds / 60))} 分钟</strong></p>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-gray-500 mb-1">分类</label>
                  <select
                    value={timerCategory}
                    onChange={(e) => setTimerCategory(e.target.value)}
                    className="w-full bg-cyber-bg border border-cyber-blue/30 rounded px-2.5 py-1.5 text-cyber-cyan outline-none"
                  >
                    <option value="study">📖 学术复习 / 学习</option>
                    <option value="coding">💻 代码开发 / 刷题</option>
                    <option value="exercise">🏃 体育健身 / 运动</option>
                    <option value="reading">📚 深度书籍阅读</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-500 mb-1">备注</label>
                  <input
                    type="text"
                    value={timerDesc}
                    onChange={(e) => setTimerDesc(e.target.value)}
                    placeholder="做了些什么？"
                    className="w-full bg-cyber-bg border border-cyber-blue/30 rounded px-2.5 py-1.5 text-cyber-text outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => { setShowSaveModal(false); setSeconds(0); }}
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
