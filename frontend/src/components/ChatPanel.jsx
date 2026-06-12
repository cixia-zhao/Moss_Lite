import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, Send, Trash2, Cpu, BrainCircuit, Sparkles, RefreshCw, Edit2, Check, X } from "lucide-react";
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
  const [showMemoryModal, setShowMemoryModal] = useState(false);
  
  // 编辑记忆状态
  const [editingMemoryId, setEditingMemoryId] = useState(null);
  const [editMemoryContent, setEditMemoryContent] = useState("");

  // 编辑消息状态
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editMessageText, setEditMessageText] = useState("");

  const scrollContainerRef = useRef(null);

  // 滚动到底部
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  // 加载聊天历史记录
  const fetchChatHistory = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/chat/history`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          const formatted = data.map(msg => ({
            id: msg.id,
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

  // 保存编辑后的记忆
  const handleSaveMemory = async (id) => {
    try {
      const res = await fetch(`${apiUrl}/api/chat/memories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editMemoryContent })
      });
      if (res.ok) {
        setEditingMemoryId(null);
        fetchMemories();
      }
    } catch (err) {
      console.error("更新记忆失败:", err);
    }
  };

  // 删除单条消息及其链式回复
  const handleDeleteMessage = async (id) => {
    if (!id) return;
    setConfirmDialog({
      show: true,
      title: "🔮 删除对话日志",
      content: "确认要删除该条消息吗？如果删除的是您的提问，对应的 AI 回复也会随之删除。此操作只会清除终端显示，不影响记忆中枢。",
      isWarning: true,
      onConfirm: async () => {
        try {
          const res = await fetch(`${apiUrl}/api/chat/messages/${id}`, {
            method: "DELETE"
          });
          if (res.ok) {
            fetchChatHistory();
          }
        } catch (err) {
          console.error("删除消息失败:", err);
        } finally {
          setConfirmDialog(prev => ({ ...prev, show: false }));
        }
      }
    });
  };

  // 保存修改后的最近消息
  const handleSaveEditedMessage = async (id) => {
    if (!id || !editMessageText.trim()) return;
    setIsThinking(true);
    onStateChange("loading");
    try {
      const res = await fetch(`${apiUrl}/api/chat/messages/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: editMessageText })
      });
      const data = await res.json();
      if (res.ok) {
        setEditingMessageId(null);
        setEditMessageText("");
        fetchChatHistory();
        onStateChange(data.ai_message?.state || "active");
        fetchMemories();
      } else {
        throw new Error(data.detail || "修改失败");
      }
    } catch (err) {
      console.error("修改消息失败:", err);
    } finally {
      setIsThinking(false);
    }
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
        setMessages((prev) => {
          const updated = [...prev];
          if (updated.length > 0 && updated[updated.length - 1].sender === "user") {
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              id: data.user_message_id
            };
          }
          return [
            ...updated,
            {
              id: data.ai_message_id,
              sender: "link",
              text: data.reply,
              timestamp: new Date().toLocaleTimeString(),
              state: data.hologram_state
            }
          ];
        });
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
    <div className="p-5 select-none cyber-flow-border relative">
      <div className="flex items-center justify-between border-b border-cyber-blue/20 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-cyber-cyan" />
          <h3 className="font-orbitron font-bold text-sm text-cyber-cyan tracking-widest">
            {t('chat.title')}
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowMemoryModal(true)}
            className="flex items-center gap-1 text-cyber-cyan/80 hover:text-cyber-cyan transition-all cyber-glow-text border border-cyber-cyan/30 px-2 py-0.5 rounded bg-cyber-cyan/10"
            title="打开记忆中枢"
          >
            <BrainCircuit className="w-3.5 h-3.5" />
            <span className="text-xs font-bold">记忆中枢</span>
          </button>
          <div className="w-px h-4 bg-cyber-blue/30 mx-1"></div>
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
            title="刷新数据"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isMemoriesLoading ? 'animate-spin text-cyber-cyan' : ''}`} />
          </button>
        </div>
      </div>

      <div className="flex flex-col h-[600px] border border-cyber-blue/20 bg-cyber-bg/40 p-3 rounded font-mono text-xs">
        {/* 滚动消息区 */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto space-y-3 pr-1 mb-2 scroll-smooth"
        >
          {(() => {
            const lastUserMsgIndex = [...messages].reverse().findIndex(m => m.sender === "user");
            const lastUserMsgId = lastUserMsgIndex !== -1 ? messages[messages.length - 1 - lastUserMsgIndex].id : null;

            return messages.map((msg, idx) => {
              const isEditing = msg.id && editingMessageId === msg.id;

              return (
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
                    {msg.id && !isThinking && (
                      <div className="flex items-center gap-1.5 ml-2 opacity-40 hover:opacity-100 transition-opacity">
                        {msg.sender === "user" && msg.id === lastUserMsgId && (
                          <button 
                            type="button"
                            onClick={() => { setEditingMessageId(msg.id); setEditMessageText(msg.text); }}
                            className="text-cyber-cyan hover:text-white transition-colors p-0.5"
                            title="编辑消息"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        )}
                        <button 
                          type="button"
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="text-cyber-pink hover:text-white transition-colors p-0.5"
                          title="删除消息"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {isEditing ? (
                    <div className="flex items-center gap-2 p-1 border border-cyber-cyan/30 bg-cyber-cyan/5 rounded max-w-[85%]">
                      <textarea 
                        value={editMessageText} 
                        onChange={(e) => setEditMessageText(e.target.value)} 
                        className="bg-cyber-bg border border-cyber-cyan/50 text-cyber-text px-2 py-1 rounded outline-none w-64 md:w-80 font-mono text-xs resize-none"
                        rows={2}
                      />
                      <div className="flex flex-col gap-1">
                        <button 
                          type="button"
                          onClick={() => handleSaveEditedMessage(msg.id)} 
                          className="text-cyber-green hover:text-green-400 p-1" 
                          title="保存"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button 
                          type="button"
                          onClick={() => { setEditingMessageId(null); setEditMessageText(""); }} 
                          className="text-cyber-pink hover:text-red-400 p-1" 
                          title="取消"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
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
                  )}
                </div>
              );
            });
          })()}
          
          {isThinking && (
            <div className="flex flex-col items-start">
              <div className="text-[10px] text-cyber-cyan/70 mb-0.5 animate-pulse">
                [LINK] // {t('chat.thinking')}
              </div>
              <div className="p-2 bg-cyber-blue/5 border border-cyber-blue/20 text-cyber-blue rounded flex items-center gap-1.5 animate-pulse">
                <div className="w-1.5 h-1.5 bg-cyber-cyan rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-cyber-cyan rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-cyber-cyan rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
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

      {/* 记忆中枢弹窗 */}
      {showMemoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-cyber-card border border-cyber-cyan/40 rounded-lg w-full max-w-2xl h-[70vh] flex flex-col font-mono text-xs text-cyber-text shadow-[0_0_20px_rgba(0,242,254,0.15)] cyber-glow-cyan">
            <div className="flex justify-between items-center p-4 border-b border-cyber-cyan/20">
              <div className="flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-cyber-cyan" />
                <h3 className="font-orbitron font-bold text-base text-cyber-cyan tracking-widest">
                  LINK 记忆中枢
                </h3>
              </div>
              <button 
                onClick={() => setShowMemoryModal(false)}
                className="text-gray-500 hover:text-cyber-pink transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {memories && memories.length > 0 ? (
                memories.map((mem) => {
                  const isRecentlyUsed = lastUsedMemories.includes(mem.key_concept);
                  const isEditing = editingMemoryId === mem.id;
                  
                  return (
                    <div 
                      key={mem.id}
                      className={`p-3 rounded text-xs border transition-all ${
                        isRecentlyUsed 
                          ? "bg-cyber-cyan/15 border-cyber-cyan/40" 
                          : "bg-cyber-card/30 border-cyber-blue/20"
                      }`}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-cyber-cyan font-bold flex items-center gap-1 text-sm">
                          <Cpu className="w-4 h-4 text-cyber-cyan/70" />
                          {mem.key_concept}
                          {isRecentlyUsed && (
                            <span className="text-[10px] bg-cyber-cyan/20 text-cyber-cyan px-1.5 py-0.5 rounded font-bold animate-pulse ml-2">
                              ACTIVE
                            </span>
                          )}
                        </span>
                        <div className="flex items-center gap-2">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => handleSaveMemory(mem.id)}
                                className="text-green-500 hover:text-green-400 transition-all"
                                title="保存修改"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditingMemoryId(null)}
                                className="text-gray-500 hover:text-gray-400 transition-all"
                                title="取消"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  setEditingMemoryId(mem.id);
                                  setEditMemoryContent(mem.content);
                                }}
                                className="text-gray-500 hover:text-cyber-cyan transition-all"
                                title="编辑记忆"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleWipeMemory(mem.id, mem.key_concept)}
                                className="text-gray-500 hover:text-cyber-pink transition-all"
                                title="擦除记忆"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      
                      {isEditing ? (
                        <textarea
                          value={editMemoryContent}
                          onChange={(e) => setEditMemoryContent(e.target.value)}
                          className="w-full bg-black/40 border border-cyber-cyan/50 rounded p-2 text-cyber-text outline-none focus:border-cyber-cyan min-h-[60px] resize-y mt-1"
                        />
                      ) : (
                        <p className="text-gray-300 leading-relaxed text-sm">{mem.content}</p>
                      )}
                      
                      <div className="text-[10px] text-gray-500 mt-3 flex justify-between border-t border-cyber-blue/10 pt-2">
                        <span>重要级: {"⭐".repeat(mem.importance_score)}</span>
                        <span>记录时间: {new Date(mem.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-600">
                  <Sparkles className="w-10 h-10 mb-3 opacity-30 animate-pulse text-cyber-cyan" />
                  <span className="text-center text-sm">主脑记忆区为空。</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 统一内置确认弹窗 */}
      {confirmDialog.show && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
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
