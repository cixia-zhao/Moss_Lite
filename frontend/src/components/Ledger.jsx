import React, { useState, useEffect } from "react";
import { DollarSign, Upload, Trash2, ArrowUpRight, ArrowDownRight, AlertCircle, FileText, CheckCircle } from "lucide-react";

export default function Ledger({ records, onRecordAdded, apiUrl }) {
  const [type, setType] = useState("expense"); // "expense" 或 "income"
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("餐饮");
  const [desc, setDesc] = useState("");
  const [billDate, setBillDate] = useState(new Date().toISOString().split("T")[0]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  // 当收支类型变化时，自动调整分类列表的默认值
  useEffect(() => {
    if (type === "income") {
      setCategory("收入");
    } else {
      setCategory("餐饮");
    }
  }, [type]);

  const expenseCategories = ["餐饮", "交通", "娱乐", "学习", "生活", "购物", "其他"];
  const incomeCategories = ["收入", "工资", "兼职", "理财", "零花钱"];

  // 提交手动记账记录
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!amount || parseFloat(amount) <= 0) {
      setErrorMsg("金额必须大于 0");
      return;
    }

    const payload = {
      type,
      amount: parseFloat(amount),
      category,
      description: desc || (type === "expense" ? "日常支出" : "日常收入"),
      date: billDate,
      source: "manual"
    };

    try {
      const res = await fetch(`${apiUrl}/api/records/finance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setAmount("");
        setDesc("");
        onRecordAdded();
      } else {
        setErrorMsg("保存账单失败，请重试");
      }
    } catch (err) {
      setErrorMsg("网络异常，无法连接到智脑控制台");
    }
  };

  // 处理账单 CSV 文件上传
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      setErrorMsg("仅支持导入支付宝或微信支付导出的 CSV 格式账单文件");
      return;
    }

    setIsUploading(true);
    setUploadResult(null);
    setErrorMsg("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${apiUrl}/api/bills/upload`, {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      
      if (res.ok) {
        setUploadResult(data.detail);
        onRecordAdded();
      } else {
        setErrorMsg(data.detail || "解析账单 CSV 失败");
      }
    } catch (err) {
      setErrorMsg("账单上传出现网络故障，请重新上传");
    } finally {
      setIsUploading(false);
      // 清空 file input 以便二次上传
      e.target.value = "";
    }
  };

  // 删除单条账单
  const handleDelete = async (id) => {
    if (!confirm("是否确认删除这笔账单流水？")) return;
    
    try {
      const res = await fetch(`${apiUrl}/api/records/finance/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        onRecordAdded();
      }
    } catch (err) {
      console.error("删除账单失败:", err);
    }
  };

  return (
    <div className="cyber-panel p-5 rounded-lg cyber-border-glow select-none">
      <div className="flex items-center gap-2 border-b border-cyber-blue/20 pb-3 mb-4">
        <DollarSign className="w-4 h-4 text-cyber-cyan" />
        <h3 className="font-orbitron font-bold text-sm text-cyber-cyan tracking-widest">
          LEDGER & BILL INTERFACE
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 font-mono text-xs">
        
        {/* 左半边：记账录入与CSV上传 */}
        <div className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-3 text-cyber-text">
            {errorMsg && (
              <div className="flex items-center gap-1.5 p-2 bg-cyber-red/10 border border-cyber-red/30 text-cyber-red rounded">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            
            {uploadResult && (
              <div className="flex items-center gap-1.5 p-2 bg-cyber-green/10 border border-cyber-green/30 text-cyber-green rounded">
                <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{uploadResult}</span>
              </div>
            )}

            {/* 收支类型切换 */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setType("expense")}
                className={`flex-1 py-1.5 border font-bold text-center transition-all ${
                  type === "expense"
                    ? "bg-cyber-pink/20 border-cyber-pink text-cyber-pink cyber-text-glow-pink"
                    : "border-gray-800 text-gray-500 hover:text-cyber-blue"
                }`}
              >
                支出 (EXPENSE)
              </button>
              <button
                type="button"
                onClick={() => setType("income")}
                className={`flex-1 py-1.5 border font-bold text-center transition-all ${
                  type === "income"
                    ? "bg-cyber-green/20 border-cyber-green text-cyber-green"
                    : "border-gray-800 text-gray-500 hover:text-cyber-blue"
                }`}
              >
                收入 (INCOME)
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-500 mb-1">流水金额(元)</label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-cyber-bg border border-cyber-blue/30 rounded px-2.5 py-1.5 text-cyber-cyan outline-none focus:border-cyber-cyan cyber-input-focus"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-500 mb-1">账单分类</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-cyber-bg border border-cyber-blue/30 rounded px-2.5 py-1.5 text-cyber-cyan outline-none focus:border-cyber-cyan cyber-input-focus"
                >
                  {type === "expense"
                    ? expenseCategories.map((c) => <option key={c} value={c}>{c}</option>)
                    : incomeCategories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-500 mb-1">发生日期</label>
                <input
                  type="date"
                  value={billDate}
                  onChange={(e) => setBillDate(e.target.value)}
                  className="w-full bg-cyber-bg border border-cyber-blue/30 rounded px-2.5 py-1.5 text-cyber-cyan outline-none cyber-input-focus"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-500 mb-1">说明备注</label>
                <input
                  type="text"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="如: 美团午餐"
                  className="w-full bg-cyber-bg border border-cyber-blue/30 rounded px-2.5 py-1.5 text-cyber-text outline-none focus:border-cyber-cyan cyber-input-focus"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-cyber-blue/20 border border-cyber-blue text-cyber-cyan py-2 rounded font-orbitron font-bold tracking-widest transition-all cyber-glow-btn cyber-glow-btn-cyan"
            >
              SAVE MANUAL RECORD
            </button>
          </form>

          {/* CSV 账单导入区 */}
          <div className="border border-dashed border-cyber-blue/30 bg-cyber-bg/20 rounded p-4 text-center relative hover:border-cyber-cyan/50 transition-all">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={isUploading}
            />
            {isUploading ? (
              <div className="flex flex-col items-center justify-center py-2">
                <div className="w-5 h-5 border-2 border-cyber-cyan border-t-transparent rounded-full animate-spin mb-2" />
                <span className="text-cyber-cyan font-bold animate-pulse">PARSING CSV BILL DATA...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center py-2">
                <Upload className="w-6 h-6 text-cyber-cyan/70 mb-1.5" />
                <span className="font-bold text-cyber-cyan">微信 / 支付宝账单 CSV 导入</span>
                <span className="text-xs text-gray-500 mt-1">拖拽或点击上传 CSV 文件进行智能分类解析</span>
              </div>
            )}
          </div>
        </div>

        {/* 右半边：流水列表 */}
        <div className="flex flex-col h-[270px] border border-cyber-blue/20 bg-cyber-bg/40 p-3 rounded">
          <div className="text-xs font-bold text-cyber-cyan mb-2 border-b border-cyber-blue/20 pb-1.5 tracking-wider">
            RECENT LEDGER STREAM (LATEST 15)
          </div>
          
          <div className="flex-1 overflow-y-auto pr-1 space-y-1.5">
            {records && records.length > 0 ? (
              records.slice(0, 15).map((record) => (
                <div 
                  key={record.id}
                  className="flex justify-between items-center bg-cyber-card/30 border border-cyber-blue/10 hover:border-cyber-blue/30 p-2 rounded text-xs"
                >
                  <div className="flex items-center gap-1.5">
                    {record.type === "expense" ? (
                      <ArrowDownRight className="w-3.5 h-3.5 text-cyber-pink flex-shrink-0" />
                    ) : (
                      <ArrowUpRight className="w-3.5 h-3.5 text-cyber-green flex-shrink-0" />
                    )}
                    <div className="truncate max-w-[120px] sm:max-w-[150px]">
                      <div className="text-cyber-text font-bold leading-tight">{record.description}</div>
                      <div className="text-[11px] text-gray-500 leading-tight">
                        {record.date} // <span className="text-cyber-cyan">{record.category}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${record.type === "expense" ? "text-cyber-pink" : "text-cyber-green"}`}>
                      {record.type === "expense" ? "-" : "+"}￥{record.amount.toFixed(2)}
                    </span>
                    <button 
                      onClick={() => handleDelete(record.id)}
                      className="text-gray-500 hover:text-cyber-red p-1 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-600 font-mono">
                <FileText className="w-8 h-8 mb-1 opacity-40" />
                <span>舱室内暂无账单数据流</span>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
