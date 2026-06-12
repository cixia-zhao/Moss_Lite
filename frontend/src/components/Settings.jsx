import React, { useState, useEffect } from "react";
import { Settings as SettingsIcon, Sliders, Bell, User, Cpu, AlertTriangle, Plus, Trash } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";

export default function Settings({ settings, modes, onSettingsUpdated, apiUrl }) {
  const { t } = useLanguage();
  // 系统设置表单状态
  const [currentMode, setCurrentMode] = useState(settings.current_mode || "cozy");
  const [luoguUid, setLuoguUid] = useState(settings.luogu_uid || "");
  const [luoguTotalSolved, setLuoguTotalSolved] = useState(settings.luogu_total_solved || 0);
  const [deepseekKey, setDeepseekKey] = useState(settings.deepseek_api_key || "");
  const [deepseekBase, setDeepseekBase] = useState(settings.deepseek_api_base || "https://api.deepseek.com/v1");
  const [deepseekModel, setDeepseekModel] = useState(settings.deepseek_model || "deepseek-v4-flash");
  const [pushDeerKey, setPushDeerKey] = useState(settings.push_deer_key || "");
  const [barkKey, setBarkKey] = useState(settings.bark_key || "");
  const [reminderTime, setReminderTime] = useState(settings.reminder_time || "22:00");
  const [reminderEnabled, setReminderEnabled] = useState(settings.reminder_enabled ?? true);
  
  // 新建/编辑模式表单状态
  const [showModeModal, setShowModeModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, modeId: null, modeName: "" });
  const [modeName, setModeName] = useState("");
  const [modeDisplayName, setModeDisplayName] = useState("");
  const [modeDesc, setModeDesc] = useState("");
  const [targetStudy, setTargetStudy] = useState(60);
  const [targetExercise, setTargetExercise] = useState(15);
  const [targetLuogu, setTargetLuogu] = useState(0);
  const [allowReminders, setAllowReminders] = useState(true);
  const [modeAiPrompt, setModeAiPrompt] = useState("");
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [editingModeId, setEditingModeId] = useState(null);
  
  const [infoMsg, setInfoMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // 同步外部传入的 settings 变化
  useEffect(() => {
    setCurrentMode(settings.current_mode || "cozy");
    setLuoguUid(settings.luogu_uid || "");
    setLuoguTotalSolved(settings.luogu_total_solved || 0);
    setDeepseekKey(settings.deepseek_api_key || "");
    setPushDeerKey(settings.push_deer_key || "");
    setBarkKey(settings.bark_key || "");
    setReminderTime(settings.reminder_time || "22:00");
    setReminderEnabled(settings.reminder_enabled ?? true);
    setDeepseekBase(settings.deepseek_api_base || "https://api.deepseek.com/v1");
    setDeepseekModel(settings.deepseek_model || "deepseek-v4-flash");
  }, [settings]);

  // 保存系统设置
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setInfoMsg("");
    setErrorMsg("");

    const payload = {
      current_mode: currentMode,
      luogu_uid: luoguUid || null,
      luogu_total_solved: parseInt(luoguTotalSolved) || 0,
      deepseek_api_key: deepseekKey || null,
      push_deer_key: pushDeerKey || null,
      bark_key: barkKey || null,
      reminder_time: reminderTime,
      reminder_enabled: reminderEnabled,
      deepseek_api_base: deepseekBase || "https://api.deepseek.com/v1",
      deepseek_model: deepseekModel || "deepseek-v4-flash"
    };

    try {
      const res = await fetch(`${apiUrl}/api/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setInfoMsg("系统控制台设置保存成功！已同步至底层数据库。");
        onSettingsUpdated();
      } else {
        setErrorMsg("保存设置失败，请检查数据格式。");
      }
    } catch (err) {
      setErrorMsg("网络异常，无法保存系统配置。");
    }
  };

  // 编辑生命模式
  const handleEditMode = (modeObj) => {
    setIsEditingMode(true);
    setEditingModeId(modeObj.id);
    setModeName(modeObj.name);
    setModeDisplayName(modeObj.display_name);
    setModeDesc(modeObj.description || "");
    setTargetStudy(modeObj.target_study_minutes);
    setTargetExercise(modeObj.target_exercise_minutes);
    setTargetLuogu(modeObj.target_luogu_solved);
    setAllowReminders(modeObj.allow_reminders);
    setModeAiPrompt(modeObj.ai_system_prompt || "");
    setErrorMsg("");
    setShowModeModal(true);
  };

  // 创建或修改生命模式表单提交
  const handleSubmitMode = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!isEditingMode && !/^[a-z0-9_]+$/.test(modeName)) {
      setErrorMsg("模式标识符必须由小写英文字母、数字或下划线组成");
      return;
    }

    const payload = {
      display_name: modeDisplayName,
      description: modeDesc,
      target_study_minutes: parseInt(targetStudy) || 0,
      target_exercise_minutes: parseInt(targetExercise) || 0,
      target_luogu_solved: parseInt(targetLuogu) || 0,
      allow_reminders: allowReminders,
      ai_system_prompt: modeAiPrompt
    };

    if (!isEditingMode) {
      payload.name = modeName;
    }

    try {
      const url = isEditingMode 
        ? `${apiUrl}/api/modes/${editingModeId}`
        : `${apiUrl}/api/modes`;
      const method = isEditingMode ? "PUT" : "POST";

      const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setShowModeModal(false);
        setIsEditingMode(false);
        setEditingModeId(null);
        setModeName("");
        setModeDisplayName("");
        setModeDesc("");
        setModeAiPrompt("");
        onSettingsUpdated(); // 重新加载模式列表
      } else {
        const errData = await res.json();
        setErrorMsg(errData.detail || (isEditingMode ? "修改模式失败，请确认参数是否合规" : "创建模式失败，请确保标识符唯一"));
      }
    } catch (err) {
      setErrorMsg(isEditingMode ? "修改模式失败，网络通讯异常" : "创建模式失败，网络通讯异常");
    }
  };

  // 触发删除自定义模式确认
  const handleDeleteMode = (id, name) => {
    setDeleteConfirm({ show: true, modeId: id, modeName: name });
  };

  // 执行真正的删除模式操作
  const confirmDeleteMode = async () => {
    const { modeId } = deleteConfirm;
    if (!modeId) return;
    try {
      const res = await fetch(`${apiUrl}/api/modes/${modeId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        onSettingsUpdated();
      } else {
        const errData = await res.json();
        setErrorMsg(errData.detail || "删除失败");
      }
    } catch (err) {
      console.error("删除模式异常:", err);
      setErrorMsg("删除失败，网络通讯异常");
    } finally {
      setDeleteConfirm({ show: false, modeId: null, modeName: "" });
    }
  };

  return (
    <div className="cyber-panel p-5 rounded-lg cyber-border-glow select-none">
      <div className="flex items-center gap-2 border-b border-cyber-blue/20 pb-3 mb-4">
        <SettingsIcon className="w-4 h-4 text-cyber-cyan" />
        <h3 className="font-orbitron font-bold text-sm text-cyber-cyan tracking-widest">
          {t('settings.title')}
        </h3>
      </div>

      {infoMsg && (
        <div className="mb-4 text-xs font-mono p-2 bg-cyber-green/10 border border-cyber-green/30 text-cyber-green rounded">
          {infoMsg}
        </div>
      )}
      {errorMsg && (
        <div className="mb-4 text-xs font-mono p-2 bg-cyber-red/10 border border-cyber-red/30 text-cyber-red rounded flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-xs text-cyber-text">
        
        {/* 左半侧：基础设置与通道绑定 */}
        <div className="space-y-4">
          <div className="bg-cyber-bg/40 border border-cyber-blue/10 p-3 rounded space-y-3">
            <h4 className="text-xs font-bold text-cyber-cyan tracking-wider flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5" />
              {t('settings.lifeMode')}
            </h4>
            
            <div>
              <label className="block text-gray-500 mb-1">{t('settings.currentPeriod')}</label>
              <select
                value={currentMode}
                onChange={(e) => setCurrentMode(e.target.value)}
                className="w-full bg-cyber-bg border border-cyber-blue/30 rounded px-2.5 py-1.5 text-cyber-cyan outline-none focus:border-cyber-cyan"
              >
                {modes.map((m) => {
                  const cleanOptName = m.display_name?.replace(/模式$/, "").replace(/\s*Mode$/i, "");
                  return (
                    <option key={m.id} value={m.name}>
                      {cleanOptName} ({m.target_study_minutes}m学 | {m.target_exercise_minutes}m运 | {m.target_luogu_solved}题)
                    </option>
                  );
                })}
              </select>
              <p className="text-xs text-gray-500 mt-1">{t('settings.modeHint')}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-gray-500 mb-1">{t('settings.uid')}</label>
                <input
                  type="text"
                  value={luoguUid}
                  onChange={(e) => setLuoguUid(e.target.value)}
                  placeholder="如: 1000"
                  className="w-full bg-cyber-bg border border-cyber-blue/30 rounded px-2.5 py-1.5 text-cyber-cyan outline-none cyber-input-focus"
                />
              </div>
              <div>
                <label className="block text-gray-500 mb-1">{t('settings.solved')}</label>
                <input
                  type="number"
                  value={luoguTotalSolved}
                  disabled
                  className="w-full bg-cyber-bg/50 border border-cyber-blue/30 rounded px-2.5 py-1.5 text-gray-500 cursor-not-allowed outline-none"
                />
              </div>
            </div>
          </div>

          <div className="bg-cyber-bg/40 border border-cyber-blue/10 p-3 rounded space-y-3">
            <h4 className="text-xs font-bold text-cyber-cyan tracking-wider flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5" />
              {t('settings.aiKey')}
            </h4>
            <div>
              <label className="block text-gray-500 mb-1">{t('settings.deepseek')}</label>
              <input
                type="password"
                value={deepseekKey}
                onChange={(e) => setDeepseekKey(e.target.value)}
                placeholder="sk-..."
                className="w-full bg-cyber-bg border border-cyber-blue/30 rounded px-2.5 py-1.5 text-cyber-cyan outline-none focus:border-cyber-cyan cyber-input-focus"
              />
              <p className="text-[11px] text-gray-600 mt-1">{t('settings.deepseekHint')}</p>
            </div>
            <div>
              <label className="block text-gray-500 mb-1">API 接口地址 (Base URL)</label>
              <input
                type="text"
                value={deepseekBase}
                onChange={(e) => setDeepseekBase(e.target.value)}
                placeholder="默认: https://api.deepseek.com/v1"
                className="w-full bg-cyber-bg border border-cyber-blue/30 rounded px-2.5 py-1.5 text-cyber-cyan outline-none focus:border-cyber-cyan cyber-input-focus"
              />
            </div>
            <div>
              <label className="block text-gray-500 mb-1">对话模型名称 (Model)</label>
              <input
                type="text"
                value={deepseekModel}
                onChange={(e) => setDeepseekModel(e.target.value)}
                placeholder="默认: deepseek-v4-flash"
                className="w-full bg-cyber-bg border border-cyber-blue/30 rounded px-2.5 py-1.5 text-cyber-cyan outline-none focus:border-cyber-cyan cyber-input-focus"
              />
            </div>
          </div>
        </div>

        {/* 右半侧：推送与提醒管理 */}
        <div className="space-y-4">
          <div className="bg-cyber-bg/40 border border-cyber-blue/10 p-3 rounded space-y-3">
            <h4 className="text-xs font-bold text-cyber-cyan tracking-wider flex items-center gap-1">
              <Bell className="w-3.5 h-3.5" />
              {t('settings.push')}
            </h4>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-500 mb-1">{t('settings.pushTime')}</label>
                <input
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  className="w-full bg-cyber-bg border border-cyber-blue/30 rounded px-2 py-1.5 text-cyber-cyan outline-none"
                  required
                />
              </div>
              <div className="flex flex-col justify-end">
                <label className="flex items-center gap-2 cursor-pointer py-2">
                  <input
                    type="checkbox"
                    checked={reminderEnabled}
                    onChange={(e) => setReminderEnabled(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-700 bg-cyber-bg text-cyber-cyan focus:ring-0"
                  />
                  <span className="text-gray-400">{t('settings.dailyPush')}</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <div>
                <label className="block text-gray-500 mb-1">{t('settings.barkKey')}</label>
                <input
                  type="text"
                  value={barkKey}
                  onChange={(e) => setBarkKey(e.target.value)}
                  placeholder={t('settings.barkKey')}
                  className="w-full bg-cyber-bg border border-cyber-blue/30 rounded px-2.5 py-1.5 text-cyber-text outline-none"
                />
              </div>
              <div>
                <label className="block text-gray-500 mb-1">{t('settings.pushDeerKey')}</label>
                <input
                  type="text"
                  value={pushDeerKey}
                  onChange={(e) => setPushDeerKey(e.target.value)}
                  placeholder="PDK..."
                  className="w-full bg-cyber-bg border border-cyber-blue/30 rounded px-2.5 py-1.5 text-cyber-text outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="w-full bg-cyber-cyan/20 border border-cyber-cyan text-cyber-cyan py-2 rounded font-orbitron font-bold text-[11px] sm:text-xs tracking-wider transition-all cyber-glow-btn cyber-glow-btn-cyan"
            >
              {t('settings.saveConfig')}
            </button>
          </div>
        </div>
      </form>

      {/* 自定义模式列表管理区 */}
      <div className="mt-5 pt-4 border-t border-cyber-blue/20">
        <div className="flex justify-between items-center mb-3">
          <h4 className="font-orbitron font-bold text-xs text-cyber-cyan tracking-wider">
            {t('settings.registry')}
          </h4>
          <button
            type="button"
            onClick={() => {
              setIsEditingMode(false);
              setEditingModeId(null);
              setModeName("");
              setModeDisplayName("");
              setModeDesc("");
              setTargetStudy(60);
              setTargetExercise(15);
              setTargetLuogu(0);
              setAllowReminders(true);
              setModeAiPrompt("");
              setErrorMsg("");
              setShowModeModal(true);
            }}
            className="p-1 border border-cyber-cyan/30 rounded bg-cyber-card/30 text-cyber-cyan hover:bg-cyber-cyan/10 hover:border-cyber-cyan transition-all flex items-center justify-center"
            title={t('settings.createCustom')}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {modes.map((m) => {
            const isBuiltin = ["cozy", "finals", "sprint", "holiday", "reading"].includes(m.name);
            const cleanName = m.display_name.replace(/模式$/, "").replace(/\s*Mode$/i, "");
            return (
              <div 
                key={m.id}
                onClick={() => handleEditMode(m)}
                className="bg-cyber-card/30 border border-cyber-blue/10 p-2.5 rounded font-mono text-xs flex flex-col justify-between cursor-pointer hover:border-cyber-cyan/40 hover:bg-cyber-card/50 transition-all"
              >
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-cyber-text">{cleanName}</span>
                    <span className="text-[10px] bg-cyber-blue/10 text-cyber-blue px-1 rounded">
                      {isBuiltin ? "SYSTEM" : "CUSTOM"}
                    </span>
                  </div>
                  <p className="text-gray-500 mb-2 leading-snug">{m.description || "无介绍"}</p>
                </div>
                
                <div className="flex justify-between items-center border-t border-cyber-blue/10 pt-2 mt-1">
                  <span className="text-[11px] text-cyber-cyan">
                    🎯 {m.target_study_minutes}m学 | {m.target_exercise_minutes}m运 | {m.target_luogu_solved}题
                  </span>
                  {!isBuiltin && (
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteMode(m.id, m.display_name);
                      }}
                      className="text-gray-500 hover:text-cyber-pink p-0.5"
                      title="删除自定义模式"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 创建/编辑生命模式弹出框 Modal */}
      {showModeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <form onSubmit={handleSubmitMode} className="bg-cyber-card border border-cyber-cyan/30 rounded-lg p-5 w-full max-w-md font-mono text-xs text-cyber-text space-y-3">
            <h3 className="font-orbitron font-bold text-sm text-cyber-cyan mb-2 tracking-widest border-b border-cyber-blue/20 pb-2">
              {isEditingMode ? "编辑生命状态" : t('settings.createTitle')}
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-500 mb-1">{t('settings.modeId')}</label>
                <input
                  type="text"
                  value={modeName}
                  onChange={(e) => setModeName(e.target.value)}
                  disabled={isEditingMode}
                  placeholder="如: code_sprint"
                  className={`w-full bg-cyber-bg border border-cyber-blue/30 rounded px-2 py-1 text-cyber-cyan outline-none ${
                    isEditingMode ? "opacity-50 cursor-not-allowed text-gray-500" : "cyber-input-focus"
                  }`}
                  required
                />
              </div>
              <div>
                <label className="block text-gray-500 mb-1">{t('settings.modeName')}</label>
                <input
                  type="text"
                  value={modeDisplayName}
                  onChange={(e) => setModeDisplayName(e.target.value)}
                  placeholder="如: 代码狂飙模式"
                  className="w-full bg-cyber-bg border border-cyber-blue/30 rounded px-2 py-1 text-cyber-cyan outline-none cyber-input-focus"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-500 mb-1">{t('settings.desc')}</label>
              <input
                type="text"
                value={modeDesc}
                onChange={(e) => setModeDesc(e.target.value)}
                placeholder="简述该时期的生活重点"
                className="w-full bg-cyber-bg border border-cyber-blue/30 rounded px-2 py-1 text-cyber-text outline-none cyber-input-focus"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-gray-500 mb-1">{t('settings.targetStudy')}</label>
                <input
                  type="number"
                  value={targetStudy}
                  onChange={(e) => setTargetStudy(e.target.value)}
                  className="w-full bg-cyber-bg border border-cyber-blue/30 rounded px-2 py-1 text-cyber-cyan outline-none"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-gray-500 mb-1">{t('settings.targetExercise')}</label>
                <input
                  type="number"
                  value={targetExercise}
                  onChange={(e) => setTargetExercise(e.target.value)}
                  className="w-full bg-cyber-bg border border-cyber-blue/30 rounded px-2 py-1 text-cyber-cyan outline-none"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-gray-500 mb-1">{t('settings.targetLuogu')}</label>
                <input
                  type="number"
                  value={targetLuogu}
                  onChange={(e) => setTargetLuogu(e.target.value)}
                  className="w-full bg-cyber-bg border border-cyber-blue/30 rounded px-2 py-1 text-cyber-cyan outline-none"
                  min="0"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 py-1">
              <input
                type="checkbox"
                checked={allowReminders}
                onChange={(e) => setAllowReminders(e.target.checked)}
                className="w-3.5 h-3.5"
              />
              <label className="text-gray-400">{t('settings.allowPush')}</label>
            </div>

            <div>
              <label className="block text-gray-500 mb-1">{t('settings.aiPrompt')}</label>
              <textarea
                value={modeAiPrompt}
                onChange={(e) => setModeAiPrompt(e.target.value)}
                placeholder="例如: 用极为冷酷但包含期待的教官语气说话。对洛谷过题数极其严苛。"
                rows="3"
                className="w-full bg-cyber-bg border border-cyber-blue/30 rounded px-2.5 py-1.5 text-cyber-text outline-none focus:border-cyber-cyan"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowModeModal(false)}
                className="flex-1 border border-gray-600 hover:bg-gray-800 text-gray-400 py-1.5 rounded"
              >
                {t('settings.cancel')}
              </button>
              <button
                type="submit"
                className="flex-1 bg-cyber-pink/20 border border-cyber-pink text-cyber-pink hover:bg-cyber-pink/30 py-1.5 rounded transition-all font-bold"
              >
                {isEditingMode ? "保存修改" : t('settings.create')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 内置的自定义删除生命模式确认弹窗 */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-cyber-card border border-cyber-pink/40 rounded-lg p-5 w-full max-w-sm font-mono text-xs text-cyber-text space-y-4 shadow-[0_0_15px_rgba(236,72,153,0.15)] cyber-glow-pink">
            <h3 className="font-orbitron font-bold text-sm text-cyber-pink mb-2 tracking-widest border-b border-cyber-pink/20 pb-2">
              ⚠️ 确认擦除
            </h3>
            <p className="text-gray-300 leading-relaxed">
              您确定要删除自定义的生命模式 <span className="text-cyber-pink font-bold">【{deleteConfirm.modeName}】</span> 吗？此操作将永远抹除该模式定义。
            </p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirm({ show: false, modeId: null, modeName: "" })}
                className="flex-1 border border-gray-600 hover:bg-gray-800 text-gray-400 py-1.5 rounded"
              >
                取消
              </button>
              <button
                type="button"
                onClick={confirmDeleteMode}
                className="flex-1 bg-cyber-pink/20 border border-cyber-pink text-cyber-pink hover:bg-cyber-pink/30 py-1.5 rounded transition-all font-bold"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
