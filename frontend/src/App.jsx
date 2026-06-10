import React, { useState, useEffect } from "react";
import { Cpu, RefreshCw, BarChart2, ShieldAlert, Sparkles, LogOut, Sun } from "lucide-react";

import HologramCore from "./components/HologramCore";
import FocusTimer from "./components/FocusTimer";
import Heatmap from "./components/Heatmap";
import Ledger from "./components/Ledger";
import ChatPanel from "./components/ChatPanel";
import Settings from "./components/Settings";

// 根据开发环境动态获取 API 端口地址
const API_URL = import.meta.env.DEV ? "http://localhost:8000" : "";

export default function App() {
  const [settings, setSettings] = useState({
    current_mode: "cozy",
    luogu_uid: "",
    luogu_total_solved: 0,
    deepseek_api_key: "",
    push_deer_key: "",
    bark_key: "",
    reminder_time: "22:00",
    reminder_enabled: true
  });
  const [modes, setModes] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);
  const [financeRecords, setFinanceRecords] = useState([]);
  const [stats, setStats] = useState({
    study_30days: 0,
    exercise_30days: 0,
    income_30days: 0,
    expense_30days: 0,
    luogu_30days: 0
  });

  const [hologramState, setHologramState] = useState("calm");
  const [isSyncingLuogu, setIsSyncingLuogu] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // 一键加载所有控制台数据流
  const fetchDashboardData = async () => {
    try {
      // 1. 系统设置
      const resSettings = await fetch(`${API_URL}/api/settings`);
      const dataSettings = await resSettings.json();
      setSettings(dataSettings);

      // 2. 生命模式列表
      const resModes = await fetch(`${API_URL}/api/modes`);
      const dataModes = await resModes.json();
      setModes(dataModes);

      // 3. 财务收支流水
      const resFinance = await fetch(`${API_URL}/api/records/finance`);
      const dataFinance = await resFinance.json();
      setFinanceRecords(dataFinance);

      // 4. 热力图指标数据
      const resHeatmap = await fetch(`${API_URL}/api/records/heatmap?days=70`);
      const dataHeatmap = await resHeatmap.json();
      setHeatmapData(dataHeatmap);

      // 5. 30天汇总统计
      const resStats = await fetch(`${API_URL}/api/records/stats`);
      const dataStats = await resStats.json();
      setStats(dataStats);

      setIsLoading(false);
    } catch (err) {
      console.error("加载数据舱参数流失败:", err);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // 手动同步洛谷数据
  const handleSyncLuogu = async () => {
    if (!settings.luogu_uid) {
      setSyncStatusMsg("⚠️ 请先在系统配置中绑定洛谷 UID");
      return;
    }
    setIsSyncingLuogu(true);
    setSyncStatusMsg("正在抓取洛谷数据...");
    setHologramState("loading");

    try {
      const res = await fetch(`${API_URL}/api/records/luogu/sync`, {
        method: "POST"
      });
      const data = await res.json();
      if (res.ok) {
        setSyncStatusMsg(`✅ ${data.detail}`);
        // 重新加载大盘数据
        fetchDashboardData();
        setHologramState("active");
      } else {
        setSyncStatusMsg(`❌ 同步失败: ${data.detail}`);
        setHologramState("glitch");
      }
    } catch (err) {
      setSyncStatusMsg("❌ 同步异常，网络连通失败");
      setHologramState("glitch");
    } finally {
      setIsSyncingLuogu(false);
      setTimeout(() => setSyncStatusMsg(""), 5000);
    }
  };

  // 获得当前活跃的生命模式对象
  const activeModeObj = modes.find((m) => m.name === settings.current_mode);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-cyber-bg font-mono text-cyber-cyan scanlines">
        <div className="w-12 h-12 border-4 border-cyber-cyan border-t-transparent rounded-full animate-spin mb-4" />
        <span className="animate-pulse tracking-widest text-sm">INITIALIZING MOSS-LITE COCKPIT SYSTEM...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cyber-bg hologram-grid scanlines pb-10">
      {/* 流光极夜星云背景层 */}
      <div className="cyber-mesh-bg">
        <div className="cyber-blob blob-1" />
        <div className="cyber-blob blob-2" />
        <div className="cyber-blob blob-3" />
      </div>

      {/* 顶部导航 */}
      <header className="border-b border-cyber-blue/15 bg-cyber-bg/35 backdrop-blur-md px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <Cpu className="w-6 h-6 text-cyber-cyan animate-pulse" />
          <div>
            <h1 className="font-orbitron font-black text-lg text-cyber-cyan tracking-widest cyber-text-glow">
              MOSS-LITE COCKPIT
            </h1>
            <p className="text-[11px] font-mono text-cyber-blue/70">
              TACTICAL SELF-DISCIPLINE & COGNITIVE CONTROLLER
            </p>
          </div>
        </div>

        {/* 顶部中央提示信息 */}
        {syncStatusMsg && (
          <div className="text-xs font-mono border border-cyber-cyan/30 bg-cyber-cyan/10 px-3 py-1.5 rounded animate-pulse text-cyber-cyan shadow-[0_0_10px_rgba(102,252,241,0.1)]">
            {syncStatusMsg}
          </div>
        )}

        {/* 当前人生状态状态显示 */}
        <div className="flex items-center gap-3">
          <div className="text-right font-mono text-xs">
            <div className="text-gray-500">CURRENT LIFE MODE</div>
            <div className="text-cyber-cyan font-bold tracking-wider cyber-text-glow uppercase">
              {activeModeObj?.display_name || "N/A"}
            </div>
          </div>
          <button
            onClick={fetchDashboardData}
            className="p-2 border border-cyber-blue/30 rounded bg-cyber-card/30 text-cyber-cyan hover:bg-cyber-cyan/10 hover:border-cyber-cyan transition-all"
            title="刷新数据流"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 控制舱主界面布局 */}
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-6">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* 左侧一栏：智脑核心与通信窗口 */}
          <div className="xl:col-span-1 space-y-6">
            
            {/* 智脑核心与状态面板 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-6">
              <HologramCore state={hologramState} />
              
              {/* 核心属性参数舱 */}
              <div className="cyber-panel p-5 rounded-lg cyber-border-glow font-mono text-xs text-cyber-text">
                <h3 className="font-orbitron font-bold text-cyber-cyan mb-3 border-b border-cyber-blue/20 pb-2 tracking-wider text-xs flex items-center gap-1.5">
                  <BarChart2 className="w-4 h-4 text-cyber-cyan" />
                  COGNITIVE CAPACITIES (30 DAYS)
                </h3>
                
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">学习总累计:</span>
                    <strong className="text-cyber-cyan">{stats.study_30days} min</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">体育运动量:</span>
                    <strong className="text-cyber-green">{stats.exercise_30days} min</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">洛谷累计通过:</span>
                    <strong className="text-cyber-pink">{stats.luogu_30days} 题</strong>
                  </div>
                  <div className="border-t border-cyber-blue/10 pt-2.5 flex justify-between items-center">
                    <span className="text-gray-500">账单总支出:</span>
                    <strong className="text-cyber-pink">￥{stats.expense_30days.toFixed(2)}</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">账单总收入:</span>
                    <strong className="text-cyber-green">￥{stats.income_30days.toFixed(2)}</strong>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-cyber-blue/20 flex gap-2">
                  <button
                    onClick={handleSyncLuogu}
                    disabled={isSyncingLuogu}
                    className="w-full flex items-center justify-center gap-1.5 bg-cyber-pink/20 hover:bg-cyber-pink/30 border border-cyber-pink text-cyber-pink py-2 rounded font-orbitron font-bold tracking-widest transition-all disabled:opacity-40"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncingLuogu ? "animate-spin" : ""}`} />
                    SYNC LUOGU STATS
                  </button>
                </div>
              </div>
            </div>

            {/* AI 智脑控制终端 */}
            <ChatPanel onStateChange={setHologramState} apiUrl={API_URL} />
          </div>

          {/* 右侧两栏：热力图、计时器、账单和设置 */}
          <div className="xl:col-span-2 space-y-6">
            
            {/* 多维度自律热力图 */}
            <Heatmap data={heatmapData} onRefresh={fetchDashboardData} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 专注计时面板 */}
              <FocusTimer 
                onStateChange={setHologramState} 
                onRecordAdded={fetchDashboardData} 
                apiUrl={API_URL} 
              />
              
              {/* 收支记账与导入 */}
              <Ledger 
                records={financeRecords} 
                onRecordAdded={fetchDashboardData} 
                apiUrl={API_URL} 
              />
            </div>

            {/* 全局设置与自定义生命周期模式 */}
            <Settings 
              settings={settings} 
              modes={modes} 
              onSettingsUpdated={fetchDashboardData} 
              apiUrl={API_URL} 
            />
          </div>

        </div>
      </main>

      {/* 底部声明 */}
      <footer className="mt-12 text-center text-[11px] font-mono text-gray-700">
        <p>MOSS-LITE COCKPIT SYSTEM // ALL LOCAL PROCEDURES STABILIZED // OPERATIONAL ENVIRONMENT: DEEP SPACE 9</p>
      </footer>
    </div>
  );
}
