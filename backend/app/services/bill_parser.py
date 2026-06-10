import io
import csv
import pandas as pd
from datetime import datetime
from typing import List, Dict, Any

# 简易智能分类规则库 (关键词 -> 标准分类)
CATEGORY_RULES = {
    "餐饮": ["美团", "饿了么", "麦当劳", "肯德基", "餐饮", "食品", "外卖", "饭店", "大排档", "饮料", "奶茶", "咖啡", "便利店", "超市"],
    "交通": ["滴滴", "地铁", "公交", "打车", "高德", "铁路", "12306", "单车", "加油", "出行"],
    "娱乐": ["游戏", "网易", "腾讯", "充值", "电影", "KTV", "酒吧", "网吧", "蒸汽", "Steam", "B站", "爱奇艺", "腾讯视频"],
    "学习": ["图书", "书店", "课程", "培训", "软件", "洛谷", "考试", "学习", "教材", "论文"],
    "生活": ["房租", "水电", "话费", "宽带", "物业", "医疗", "挂号", "药店", "理发", "洗剪吹"],
    "购物": ["淘宝", "天猫", "京东", "拼多多", "唯品会", "服装", "鞋帽", "数码", "手机", "电脑"]
}

def auto_categorize(counterparty: str, product_desc: str) -> str:
    """根据交易对手和商品描述自动打标签分类"""
    text = (counterparty + " " + product_desc).lower()
    
    for category, keywords in CATEGORY_RULES.items():
        for kw in keywords:
            if kw.lower() in text:
                return category
                
    return "其他"

def parse_billing_csv(file_bytes: bytes, file_name: str) -> List[Dict[str, Any]]:
    """
    解析微信或支付宝导出的账单 CSV
    返回标准化的账单记录列表
    """
    # 尝试不同编码读取文件内容
    content = ""
    for encoding in ["utf-8-sig", "gbk", "utf-8", "gb18030"]:
        try:
            content = file_bytes.decode(encoding)
            break
        except UnicodeDecodeError:
            continue
            
    if not content:
        raise ValueError("无法识别文件编码，请上传正确的 CSV 账单文件。")
        
    lines = content.splitlines()
    if not lines:
        raise ValueError("上传的文件为空。")

    # 识别是微信还是支付宝
    is_wechat = False
    is_alipay = False
    header_idx = -1
    
    for i, line in enumerate(lines[:30]):  # 扫描前 30 行定位表头和类型
        if "微信支付" in line:
            is_wechat = True
        elif "支付宝" in line:
            is_alipay = True
            
        # 根据表头字段精确定位表头所在行
        if "交易时间" in line and ("收/支" in line or "收/付款方式" in line):
            header_idx = i
            break
            
    if header_idx == -1:
        raise ValueError("未找到账单数据表头，请确认是否为微信或支付宝导出的原始账单。")

    # 取出表头及之后的数据行
    data_lines = lines[header_idx:]
    
    # 使用 csv module 读取以处理包裹的双引号
    csv_reader = csv.reader(io.StringIO("\n".join(data_lines)))
    headers = [h.strip() for h in next(csv_reader)]
    
    records = []
    
    for row in csv_reader:
        if not row or len(row) < len(headers):
            continue
        
        # 支付宝账单末尾会有大量 summary 注释，通常以 "--------" 开头
        if row[0].startswith("---") or "共" in row[0] and "笔" in row[0]:
            break
            
        # 组装数据项
        item = dict(zip(headers, [val.strip() for val in row]))
        
        try:
            raw_time = item.get("交易时间")
            if not raw_time:
                continue
                
            # 解析时间
            dt = datetime.strptime(raw_time, "%Y-%m-%d %H:%M:%S")
            date_str = dt.date()
            
            # 解析收支类型和金额
            # 微信：'金额(元)'；支付宝：'金额'
            amount_key = "金额(元)" if "金额(元)" in item else "金额"
            raw_amount = item.get(amount_key, "0").replace("¥", "").replace(",", "").strip()
            amount = float(raw_amount)
            
            raw_type = item.get("收/支", "")
            if "支出" in raw_type or "不计收支" in raw_type and amount > 0:
                record_type = "expense"
            elif "收入" in raw_type:
                record_type = "income"
            else:
                # 排除第三方/理财等不计入收支的项目
                continue
                
            # 提取交易方与描述
            counterparty = item.get("交易对方", "未知")
            # 微信：'商品'；支付宝：'商品说明'
            product_desc = item.get("商品", item.get("商品说明", ""))
            
            # 智能分类
            if record_type == "income":
                category = "收入"
            else:
                category = auto_categorize(counterparty, product_desc)
                
            records.append({
                "date": date_str,
                "type": record_type,
                "amount": amount,
                "category": category,
                "source": "csv_wechat" if is_wechat else "csv_alipay",
                "description": f"{counterparty} - {product_desc}"[:200]
            })
            
        except Exception as e:
            # 单行解析出错跳过，保证大盘数据能录入
            continue
            
    return records
