import requests
import re
import urllib.parse
import json
from bs4 import BeautifulSoup
import urllib3

# 禁用未校验 HTTPS 警告
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def scrape_luogu_user_profile(uid: str) -> dict:
    """
    抓取洛谷用户的做题相关数据，包括：
    - passed_count: 累计通过题目数
    - daily_counts: 最近约 90 天的历史每日过题数与最高难度，格式为 {"YYYY-MM-DD": [过题数, 最高难度]}
    - difficulty_stats: 每个难度等级（0至7）的过题数量分布，格式为 {"0": count, "1": count, ...}
    """
    if not uid or not uid.strip().isdigit():
        raise ValueError("无效的洛谷 UID")

    uid = uid.strip()
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.8,zh-TW;q=0.7,zh-HK;q=0.5,en-US;q=0.3,en;q=0.2",
    }

    # 优先采用用户本机的穿透代理（针对 SSLEOFError）
    proxies = {
        "http": "http://127.0.0.1:7897",
        "https": "http://127.0.0.1:7897"
    }

    # 1. 抓取主页，用于提取过题数 (passedProblemCount) 与 历史做题趋势 (dailyCounts)
    main_url = f"https://www.luogu.com.cn/user/{uid}"
    response = None
    try:
        response = requests.get(main_url, headers=headers, proxies=proxies, verify=False, timeout=10)
    except Exception:
        # 自动 fallback 进无代理直连
        try:
            response = requests.get(main_url, headers=headers, verify=False, timeout=10)
        except Exception as e:
            raise Exception(f"请求洛谷主页失败: {e}")

    if not response or response.status_code != 200:
        raise Exception(f"请求洛谷主页失败，状态码: {response.status_code if response else '未知'}")

    soup = BeautifulSoup(response.text, "html.parser")
    script = soup.find("script", id="lentille-context")
    
    if not script:
        raise Exception("无法解析洛谷主页，未找到 lentille-context 数据结构")

    try:
        main_data = json.loads(script.string or "{}")
    except Exception as e:
        raise Exception(f"解析个人主页 JSON 失败: {e}")

    user_info = main_data.get("data", {}).get("user", {})
    passed_count = user_info.get("passedProblemCount", 0)
    daily_counts = main_data.get("data", {}).get("dailyCounts", {})

    # 2. 抓取练习页，用于统计各难度通过数
    practice_url = f"https://www.luogu.com.cn/user/{uid}/practice"
    p_response = None
    try:
        p_response = requests.get(practice_url, headers=headers, proxies=proxies, verify=False, timeout=10)
    except Exception:
        try:
            p_response = requests.get(practice_url, headers=headers, verify=False, timeout=10)
        except Exception as e:
            raise Exception(f"请求练习页面失败: {e}")

    if not p_response or p_response.status_code != 200:
        raise Exception(f"请求练习页面失败，状态码: {p_response.status_code if p_response else '未知'}")

    p_soup = BeautifulSoup(p_response.text, "html.parser")
    p_script = p_soup.find("script", id="lentille-context")
    difficulty_stats = {str(i): 0 for i in range(8)}

    if p_script:
        try:
            p_data = json.loads(p_script.string or "{}")
            passed_list = p_data.get("data", {}).get("passed", [])
            for item in passed_list:
                diff = item.get("difficulty", 0)
                diff_str = str(diff)
                difficulty_stats[diff_str] = difficulty_stats.get(diff_str, 0) + 1
        except Exception as e:
            # 即使练习页解析异常，不中断主体，打日志即可
            print(f"解析练习页面失败，跳过难度统计: {e}")

    return {
        "passed_count": passed_count,
        "daily_counts": daily_counts,
        "difficulty_stats": difficulty_stats
    }

def scrape_luogu_solved(uid: str) -> int:
    """
    抓取洛谷用户的通过题目数量 (兼容老接口)。
    """
    profile = scrape_luogu_user_profile(uid)
    return profile["passed_count"]

if __name__ == "__main__":
    try:
        data = scrape_luogu_user_profile("2110485")
        print(f"已通过题数: {data['passed_count']}")
        print(f"最近做题趋势天数: {len(data['daily_counts'])}")
        print(f"各难度题数: {data['difficulty_stats']}")
    except Exception as ex:
        print(f"抓取测试出错: {ex}")
