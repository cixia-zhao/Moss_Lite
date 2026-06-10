import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, Send, Trash2, Cpu, BrainCircuit, Sparkles, RefreshCw } from "lucide-react";

export default function ChatPanel({ onStateChange, apiUrl }) {
  const [messages, setMessages] = useState([
    {
      sender: "moss",
      text: "MOSS-Lite 智脑网络连接已建立。我是您的自律控制舱辅助 AI。请输入指令或分享您的梦想与近况，我将保存在主记忆区。",
      timestamp: new Date().toLocaleTimeString(),
      state: "calm"
    }
  ]);
  const [inputMsg, setInputMsg] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  
  // 记忆碎片
  const [memories, setMemories] = useState([]);
  const [lastUsedMemories, setLastUsedMemories] = useState([]);
  const [isMemoriesLoading, setIsMemoriesLoading] = useState(false);

  const messagesEndRef = useRef(null);

  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

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
    fetchMemories();
  }, []);

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
      const res = await fetch(`${apiUrl}/api/chat/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText })
      });
      const data = await res.json();

      if (res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            sender: "moss",
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
          sender: "moss",
          text: `【MOSS 系统异常】: 无法与 DeepSeek 取得联系，核心网络超时。异常: ${err.message}。请检查 API Key 设置。`,
          timestamp: new Date().toLocaleTimeString(),
          state: "glitch"
        }
      ]);
      onStateChange("glitch");
    } finally {
      setIsThinking(false);
    }
  };

  // 擦除单条记忆碎片
  const handleWipeMemory = async (id) => {
    if (!confirm("是否确认从 MOSS-Lite 智脑记忆区中擦除这片数据？")) return;
    try {
      const res = await fetch(`${apiUrl}/api/chat/memories/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        fetchMemories();
      }
    } catch (err) {
      console.error("擦除记忆失败:", err);
    }
  };

  return (
    <div className="p-5 select-none cyber-flow-border">
      <div className="flex items-center justify-between border-b border-cyber-blue/20 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-cyber-cyan" />
          <h3 className="font-orbitron font-bold text-sm text-cyber-cyan tracking-widest">
            MOSS-LITE COMM TERMINAL
          </h3>
        </div>
        <button 
          onClick={fetchMemories}
          className="text-gray-500 hover:text-cyber-cyan transition-all"
          title="刷新记忆区"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isMemoriesLoading ? 'animate-spin text-cyber-cyan' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 font-mono text-xs">
        
        {/* 左侧和中间：对话窗口 */}
        <div className="lg:col-span-2 flex flex-col h-[300px] border border-cyber-blue/20 bg-cyber-bg/40 p-3 rounded">
          {/* 滚动消息区 */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 mb-2">
            {messages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
              >
                <div className="flex items-center gap-1.5 text-[10px] text-gray-500 mb-0.5">
                  <span>
                    {msg.sender === "user" ? "[PILOT_USER]" : "[MOSS-LITE]"}
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
                  [MOSS-LITE] // THINKING...
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
              placeholder="发送消息，MOSS将更新实体记忆库..."
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
        <div className="flex flex-col h-[300px] border border-cyber-blue/20 bg-cyber-bg/40 p-3 rounded">
          <div className="flex items-center gap-1 text-xs font-bold text-cyber-cyan mb-2 border-b border-cyber-blue/20 pb-1.5 tracking-wider">
            <BrainCircuit className="w-3.5 h-3.5 text-cyber-cyan" />
            <span>MOSS ACTIVE MEMORY CORE</span>
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
                        onClick={() => handleWipeMemory(mem.id)}
                        className="text-gray-500 hover:text-cyber-pink transition-all"
                        title="擦除本条记忆"
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
                <span className="text-center">记忆区空白。闲聊分享您的心事和目标后，智脑将自动提取并关联。</span>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
