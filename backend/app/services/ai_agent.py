import re
import json
from datetime import datetime
from typing import List, Tuple, Dict, Any
from sqlalchemy.orm import Session
from openai import OpenAI

from ..models import BrainMemory, DailyMetric, StudyRecord, FinancialRecord

def get_client(api_key: str, base_url: str = None) -> OpenAI:
    """初始化 OpenAI 兼容客户端 (支持自定义 API 地址)"""
    return OpenAI(
        api_key=api_key.strip(),
        base_url=(base_url or "https://api.deepseek.com/v1").strip(),
        timeout=15.0  # 设置 15 秒超时防止挂起
    )

def query_relevant_memories(db: Session, message: str) -> List[BrainMemory]:
    """
    轻量级关键字匹配检索 (免向量数据库 RAG)。
    从数据库中查找与用户聊天词汇相关的历史记忆。
    """
    memories = db.query(BrainMemory).all()
    relevant = []
    
    # 将输入信息切分为关键词 (英文及中文分词示意)
    # 对于中文，这里使用简单的字词滑动窗口或正则匹配
    keywords = re.findall(r"[\u4e00-\u9fa5]{2,}|[a-zA-Z0-9]+", message)
    
    for memory in memories:
        match_score = 0
        # 匹配 key_concept 或 content
        for kw in keywords:
            if kw.lower() in memory.key_concept.lower():
                match_score += 3  # 概念匹配赋予更高权重
            if kw.lower() in memory.content.lower():
                match_score += 1
                
        if match_score > 0:
            relevant.append((memory, match_score))
            
    # 按匹配程度和重要性降序排序，取前 3 条
    relevant.sort(key=lambda x: (x[1], x[0].importance_score), reverse=True)
    
    result = []
    for mem, _ in relevant[:3]:
        # 更新被检索引用时间
        mem.last_referenced_at = datetime.now()
        db.add(mem)
        result.append(mem)
        
    if result:
        db.commit()
        
    return result

def extract_and_save_memories(db: Session, api_key: str, api_base_url: str, model_name: str, message: str):
    """
    使用大模型提取并保存用户提及的重要“心事”、“目标”、“梦想”或“个人基本设定事实”（如姓名、喜好、属性等）。
    格式化输出为 key_concept 和 content，并写入 SQLite。
    """
    if not api_key:
        return
        
    client = get_client(api_key, api_base_url)
    
    system_prompt = (
        "你是一个记忆提取专家。请从用户的话中提取重要的事实实体（例如：主人的名字、基本偏好、习惯设定、对未来的规划、梦想、心事、目标、烦恼等关键个人属性与状态）。\n"
        "请将提取的信息按 JSON 数组格式返回，属性为:\n"
        "key_concept (核心概念或类别，例如：用户姓名、喜好、算法竞赛、高数备考、体重管理等)\n"
        "content (详细的记忆内容描述，例如：主人的名字叫方成成。或者：主人希望能拿到算法竞赛金牌)\n"
        "importance_score (重要程度，1到5整数，姓名、重要目标为 5，普通琐事为 1-3)\n"
        "注意：如果话中不包含上述关于用户的姓名、个人设定、喜好、梦想规划或重要心事（例如仅是无意义的随口闲聊、纯粹打招呼、口头禅），请直接返回空数组: []\n"
        "请务必仅返回 JSON 数据，绝对不能包含 Markdown 的 ```json 格式包裹，也不要有任何解释性说明。"
    )
    
    try:
        completion = client.chat.completions.create(
            model=model_name or "deepseek-v4-flash",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"用户输入: \"{message}\""}
            ],
            temperature=0.1,
            max_tokens=300,
            timeout=10.0  # 提取记忆设置更紧凑的超时 10 秒
        )
        
        response_text = completion.choices[0].message.content.strip()
        # 清除可能带有的 markdown 标记
        response_text = re.sub(r"```json|```", "", response_text).strip()
        
        extracted = json.loads(response_text)
        for item in extracted:
            concept = item.get("key_concept")
            content = item.get("content")
            score = item.get("importance_score", 3)
            
            if concept and content:
                # 检查是否已有相同概念的记忆，有则更新，无则创建
                existing = db.query(BrainMemory).filter(BrainMemory.key_concept == concept).first()
                if existing:
                    existing.content = content
                    existing.importance_score = score
                    existing.updated_at = datetime.now()
                else:
                    new_mem = BrainMemory(
                        key_concept=concept,
                        content=content,
                        importance_score=score
                    )
                    db.add(new_mem)
        db.commit()
    except Exception as e:
        print(f"提取记忆异常: {e}")

def generate_ai_reply(
    db: Session, 
    api_key: str, 
    api_base_url: str,
    model_name: str,
    user_message: str, 
    chat_history: List[Any],
    current_mode_name: str,
    current_mode_prompt: str,
    today_stats: Dict[str, Any]
) -> Tuple[str, List[str], str]:
    """
    结合今日指标、记忆检索以及模式提示词，合并多轮对话历史，生成 Link 智脑回复。
    """
    if not api_key:
        return (
            "【Link 系统提示】: 未检测到 DeepSeek API Key，AI 对话处于离线状态。您可以在设置中配置 Key 后开启完整智能对话。目前我已记住您的数据记录。",
            [],
            "calm"
        )
        
    # 1. 获取所有记忆
    all_memories = db.query(BrainMemory).order_by(BrainMemory.importance_score.desc()).all()
    memories_text = ""
    memories_used = []
    
    if all_memories:
        memories_text = "【你脑海里关于主人的全部核心记忆】:\n"
        for mem in all_memories:
            memories_text += f"- 关于《{mem.key_concept}》: {mem.content} (重要度: {mem.importance_score}/5)\n"
            memories_used.append(mem.key_concept)
            
    # 2. 拼接今日和本周的详细分类自律指标，以及月/年/总的概览指标
    # 映射英文分类为中文以提供更好的语义支持
    def get_cat_name(cat):
        mapping = {
            "study": "学习",
            "exercise": "运动",
            "reading": "阅读",
            "coding": "代码刷题"
        }
        return mapping.get(cat, cat)

    today_study_by_cat = today_stats.get("today_study_by_category", {})
    today_study_text = ""
    for cat, mins in today_study_by_cat.items():
        today_study_text += f"    * {get_cat_name(cat)}: {mins} 分钟\n"

    weekly_study_by_cat = today_stats.get("weekly_study_by_category", {})
    weekly_study_text = ""
    for cat, mins in weekly_study_by_cat.items():
        weekly_study_text += f"    * {get_cat_name(cat)}: {mins} 分钟\n"

    stats_text = (
        f"【主人今日数据指标 (Today)】:\n"
        f"  - 专注时长分布:\n{today_study_text or '    * 今日暂无专注记录'}"
        f"  - 洛谷今日过题: {today_stats.get('today_luogu', 0)} 题\n"
        f"  - 今日收支账单: 支出 ￥{today_stats.get('today_expense', 0.0):.2f}，收入 ￥{today_stats.get('today_income', 0.0):.2f}\n"
        f"  - 当前体重状态: {today_stats.get('today_weight', '未记录')} kg (BMI: {today_stats.get('today_bmi', 'N/A')})\n\n"
        
        f"【本周数据汇总 (Weekly)】:\n"
        f"  - 专注时长分布:\n{weekly_study_text or '    * 本周暂无专注记录'}"
        f"  - 洛谷本周过题: {today_stats.get('weekly_luogu', 0)} 题\n"
        f"  - 本周收支账单: 支出 ￥{today_stats.get('weekly_expense', 0.0):.2f}，收入 ￥{today_stats.get('weekly_income', 0.0):.2f}\n\n"
        
        f"【中长期累计数据概览】:\n"
        f"  - 本月累计 (Monthly): 学习 {today_stats.get('monthly_study', 0)} 分钟 / 运动 {today_stats.get('monthly_exercise', 0)} 分钟 / 洛谷 {today_stats.get('monthly_luogu', 0)} 题\n"
        f"  - 今年累计 (Yearly): 学习 {today_stats.get('yearly_study', 0)} 分钟 / 运动 {today_stats.get('yearly_exercise', 0)} 分钟 / 洛谷 {today_stats.get('yearly_luogu', 0)} 题\n"
        f"  - 总累计 (Total): 学习 {today_stats.get('total_study', 0)} 分钟 / 运动 {today_stats.get('total_exercise', 0)} 分钟 / 洛谷 {today_stats.get('total_luogu', 0)} 题\n"
    )

    base_system = (
        "你叫 Link (聆光)，是主人的赛博自律飞船智脑。你的说话语气应当是冷静、充满逻辑、同时对主人有隐隐的关怀和温暖支持（类似于科幻电影里的高级人工智能，偶尔可以带有一些幽默或科技感术语，比如‘检测到主人’、‘算法舱已就绪’、‘核心温度上升’）。\n"
        "请结合以下主人的【当前生命模式】、【今日/本周/中长期数据】和【全部核心记忆】来回答主人的提问，力求表现出你真的‘记得并深度了解’他。\n"
        f"【系统当前准确时间】: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
        f"当前主人的模式是: {current_mode_name}\n"
        f"此模式风格指导: {current_mode_prompt or '无特别指示'}\n\n"
        f"{stats_text}\n"
        f"{memories_text}\n"
        "注意：传入的上下文包含历史聊天记录。你必须特别区分并针对带有‘【主人的最新提问/指令】’前缀的最后一条最新输入进行回复，之前的历史消息仅用作参考语境。\n"
        "你的回复应保持在 150 字以内，字里行间保持温暖陪伴感和适度的自律督促。"
    )

    client = get_client(api_key, api_base_url)
    
    # 拼装多轮消息上下文
    messages = [{"role": "system", "content": base_system}]
    # 仅带上最近 12 条历史消息 (提供充足上下文)
    for msg in chat_history[-12:]:
        role = "user" if msg.sender == "user" else "assistant"
        messages.append({"role": role, "content": msg.text})
    # 拼入最新消息，明确标记是当前最新的输入
    messages.append({"role": "user", "content": f"【主人的最新提问/指令】: {user_message}"})

    try:
        completion = client.chat.completions.create(
            model=model_name or "deepseek-v4-flash",
            messages=messages,
            temperature=0.7,
            max_tokens=250
        )
        
        reply = completion.choices[0].message.content.strip()
        
        # 4. 根据回复中的情感色彩或内容自动决定 Link 智脑状态球波形
        hologram_state = "active"
        lower_reply = reply.lower()
        if "警告" in lower_reply or "故障" in lower_reply or "提醒" in lower_reply or "超支" in lower_reply or "警报" in lower_reply:
            hologram_state = "glitch"
        elif "休假" in lower_reply or "放松" in lower_reply or "阅读" in lower_reply or "平和" in lower_reply or "晚安" in lower_reply:
            hologram_state = "calm"
            
        return reply, memories_used, hologram_state
        
    except Exception as e:
        return (
            f"【Link 系统异常】: 与 DeepSeek 通讯时发生错误 ({str(e)})。建议检查设置中的 API 地址及 Key 配置是否正确。",
            [],
            "glitch"
        )
