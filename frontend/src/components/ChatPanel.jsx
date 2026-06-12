import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, Send, Trash2, Cpu, BrainCircuit, Sparkles, RefreshCw } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";

export default function ChatPanel({ onStateChange, apiUrl }) {
  const { t } = useLanguage();
  const [messages, setMessages] = useState([
    {
      sender: "link",
      text: "Link 智脑网络连接已建立。我是您的自律控制舱辅助 AI。请输入指令或分享您的梦想与近况，我将保存在主记忆区。",
      timestamp: new Date().toLocaleTimeString(),
      state: "calm"
    }
  ]);
  const [inputMsg, setInputMsg] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  
  // 统一的内置确认弹窗状态
  const [confirmDialog, setConfirmDialog] = useState({
    show: false,
    title: "",
    content: "",
    onConfirm: null,
    isWarning: false
  });

  // 记忆碎片
  const [memories, setMemories] = useState([]);
  const [lastUsedMemories, setLastUsedMemories] = useState([]);
  const [isMemoriesLoading, setIsMemoriesLoading] = useState(false);

  const messagesEndRef = useRef(null);

  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  // 加载聊天历史记录
  const fetchChatHistory = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/chat/history`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          const formatted = data.map(msg => ({
            sender: msg.sender,
            text: msg.text,
            timestamp: new Date(msg.timestamp).toLocaleTimeString(),
            state: msg.state || "calm"
          }));
          setMessages(formatted);
        }
      }
    } catch (err) {
      console.error("加载聊天历史失败:", err);
    }
  };

  // 加载智脑记忆碎片
  const fetchMemories = async () => {
    setIsMemoriesLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/chat/memories`);
      if (res.ok) {
        const data = await res.json();
        setMemories(data);
      }
    } catch (err) {
      console.error("加载记忆碎片失败:", err);
    } finally {
      setIsMemoriesLoading(false);
    }
  };

  useEffect(() => {
    fetchChatHistory();
    fetchMemories();
  }, []);

  // 擦除单条记忆碎片
  const handleWipeMemory = (id, keyConcept) => {
    setConfirmDialog({
      show: true,
      title: "🔮 擦除记忆碎片",
      content: `确认要将关于《${keyConcept}》的记忆碎片从 Link 智脑深处永久抹除吗？`,
      isWarning: true,
      onConfirm: async () => {
        try {
          const res = await fetch(`${apiUrl}/api/chat/memories/${id}`, {
            method: "DELETE"
          });
          if (res.ok) {
            fetchMemories();
          }
        } catch (err) {
          console.error("擦除记忆失败:", err);
        } finally {
          setConfirmDialog(prev => ({ ...prev, show: false }));
        }
      }
    });
  };

  // 清空聊天历史记录
  const handleClearHistory = () => {
    setConfirmDialog({
      show: true,
      title: "⚠️ 清空终端日志",
      content: "确定要永久清除与 Link 的所有聊天历史数据吗？此操作无法恢复。",
      isWarning: true,
      onConfirm: async () => {
        try {
          const res = await fetch(`${apiUrl}/api/chat/history`, {
            method: "DELETE"
          });
          if (res.ok) {
            setMessages([
              {
                sender: "link",
                text: "Link 智脑网络连接已建立。我是您的自律控制舱辅助 AI。请输入指令或分享您的梦想与近况，我将保存在主记忆区。",
                timestamp: new Date().toLocaleTimeString(),
                state: "calm"
              }
            ]);
          }
        } catch (err) {
          console.error("清空历史记录失败:", err);
        } finally {
          setConfirmDialog(prev => ({ ...prev, show: false }));
        }
      }
    });
  };

  // 发送消息
  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputMsg.trim() || isThinking) return;

    const userText = inputMsg;
    setInputMsg("");
    setMessages((prev) => [
      ...prev,
      {
        sender: "user",
        text: userText,
        timestamp: new Date().toLocaleTimeString()
      }
    ]);

    setIsThinking(true);
    onStateChange("loading"); // 让球加速闪烁表示思考中

    try {
      const res = await fetch(`${apiUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText })
      });
      const data = await res.json();

      if (res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            sender: "link",
            text: data.reply,
            timestamp: new Date().toLocaleTimeString(),
            state: data.hologram_state
          }
        ]);
        onStateChange(data.hologram_state);
        setLastUsedMemories(data.memories_used || []);
        // 对话后自动重新加载记忆碎片，因为 AI 在后台提取了新记忆
        fetchMemories();
      } else {
        throw new Error(data.detail || "通讯中断");
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: "link",
          text: `【Link 系统异常】: 无法与 DeepSeek 取得联系，核心网络超时。异常: ${err.message}。请检查 API Key 设置。`,
          timestamp: new Date().toLocaleTimeString(),
          state: "glitch"
        }
      ]);
      onStateChange("glitch");
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="p-5 select-none cyber-flow-border">
      <div className="flex items-center justify-between border-b border-cyber-blue/20 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-cyber-cyan" />
          <h3 className="font-orbitron font-bold text-sm text-cyber-cyan tracking-widest">
            {t('chat.title')}
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleClearHistory}
            className="text-gray-500 hover:text-cyber-pink transition-all"
            title="清空聊天记录"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={fetchMemories}
            className="text-gray-500 hover:text-cyber-cyan transition-all"
            title="刷新记忆区"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isMemoriesLoading ? 'animate-spin text-cyber-cyan' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 font-mono text-xs">
        
        {/* 左侧和中间：对话窗口 */}
        <div className="lg:col-span-2 flex flex-col h-[600px] border border-cyber-blue/20 bg-cyber-bg/40 p-3 rounded">
          {/* 滚动消息区 */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 mb-2">
            {messages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
              >
                <div className="flex items-center gap-1.5 text-[10px] text-gray-500 mb-0.5">
                  <span>
                    {msg.sender === "user" ? "[PILOT_USER]" : "[LINK]"}
                  </span>
                  <span>//</span>
                  <span>{msg.timestamp}</span>
                </div>
                
                <div 
                  className={`p-2.5 rounded max-w-[85%] border leading-relaxed break-words ${
                    msg.sender === "user"
                      ? "bg-cyber-cyan/10 border-cyber-cyan/30 text-cyber-cyan"
                      : msg.state === "glitch"
                        ? "bg-cyber-pink/10 border-cyber-pink/30 text-cyber-pink"
                        : "bg-cyber-card/30 border-cyber-blue/20 text-cyber-text"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            
            {isThinking && (
              <div className="flex flex-col items-start">
                <div className="text-[10px] text-cyber-cyan/70 mb-0.5 animate-pulse">
                  [LINK] // {t('chat.thinking')}
                </div>
                <div className="p-2 bg-cyber-blue/5 border border-cyber-blue/20 text-cyber-blue rounded flex items-center gap-1.5 animate-pulse">
                  <div className="w-1.5 h-1.5 bg-cyber-cyan rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-cyber-cyan rounded-full animate-bounce" style={{ animationDelay: '150ms' }} style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-cyber-cyan rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 输入表单 */}
          <form onSubmit={handleSend} className="flex gap-2 border-t border-cyber-blue/10 pt-2">
            <input
              type="text"
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              placeholder={t('chat.input')}
              className="flex-1 bg-cyber-bg border border-cyber-blue/30 rounded px-3 py-1.5 text-cyber-text outline-none focus:border-cyber-cyan cyber-input-focus"
              disabled={isThinking}
            />
            <button
              type="submit"
              disabled={isThinking || !inputMsg.trim()}
              className="bg-cyber-blue/20 border border-cyber-blue text-cyber-cyan px-3 py-1.5 rounded transition-all disabled:opacity-40 disabled:cursor-not-allowed cyber-glow-btn cyber-glow-btn-cyan"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        {/* 右侧：记忆碎片面板 */}
        <div className="flex flex-col h-[600px] border border-cyber-blue/20 bg-cyber-bg/40 p-3 rounded">
          <div className="flex items-center gap-1 text-xs font-bold text-cyber-cyan mb-2 border-b border-cyber-blue/20 pb-1.5 tracking-wider">
            <BrainCircuit className="w-3.5 h-3.5 text-cyber-cyan" />
            <span>{t('chat.memoryCore')}</span>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-2">
            {memories && memories.length > 0 ? (
              memories.map((mem) => {
                const isRecentlyUsed = lastUsedMemories.includes(mem.key_concept);
                return (
                  <div 
                    key={mem.id}
                    className={`p-2 rounded text-xs border transition-all ${
                      isRecentlyUsed 
                        ? "bg-cyber-cyan/15 border-cyber-cyan/40" 
                        : "bg-cyber-card/30 border-cyber-blue/10"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-cyber-cyan font-bold flex items-center gap-1">
                        <Cpu className="w-3 h-3 text-cyber-cyan/70" />
                        {mem.key_concept}
                        {isRecentlyUsed && (
                          <span className="text-[10px] bg-cyber-cyan/20 text-cyber-cyan px-1 rounded font-bold animate-pulse">
                            ACTIVE
                          </span>
                        )}
                      </span>
                      <button
                        onClick={() => handleWipeMemory(mem.id, mem.key_concept)}
                        className="text-gray-500 hover:text-cyber-pink transition-all"
                        title={t('chat.wipeBtn')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-gray-400 leading-normal">{mem.content}</p>
                    <div className="text-[10px] text-gray-600 mt-1 flex justify-between">
                      <span>重要级: {"⭐".repeat(mem.importance_score)}</span>
                      <span>{new Date(mem.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-600">
                <Sparkles className="w-6 h-6 mb-1 opacity-30 animate-pulse" />
                <span className="text-center">{t('chat.emptyMemory')}</span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* 统一内置确认弹窗 */}
      {confirmDialog.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className={`bg-cyber-card border rounded-lg p-5 w-full max-w-sm font-mono text-xs text-cyber-text space-y-4 shadow-[0_0_15px_rgba(0,242,254,0.15)] ${
            confirmDialog.isWarning ? 'border-cyber-pink/40 cyber-glow-pink' : 'border-cyber-cyan/40 cyber-glow-cyan'
          }`}>
            <h3 className={`font-orbitron font-bold text-sm tracking-widest border-b pb-2 ${
              confirmDialog.isWarning ? 'text-cyber-pink border-cyber-pink/20' : 'text-cyber-cyan border-cyber-cyan/20'
            }`}>
              {confirmDialog.title}
            </h3>
            <p className="text-gray-300 leading-relaxed">
              {confirmDialog.content}
            </p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDialog(prev => ({ ...prev, show: false }))}
                className="flex-1 border border-gray-600 hover:bg-gray-800 text-gray-400 py-1.5 rounded"
              >
                取消
              </button>
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className={`flex-1 border py-1.5 rounded transition-all font-bold ${
                  confirmDialog.isWarning 
                    ? 'bg-cyber-pink/20 border-cyber-pink text-cyber-pink hover:bg-cyber-pink/30' 
                    : 'bg-cyber-cyan/20 border-cyber-cyan text-cyber-cyan hover:bg-cyber-cyan/30'
                }`}
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
