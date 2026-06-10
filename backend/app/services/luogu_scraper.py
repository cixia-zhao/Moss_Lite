import requests
import re
import urllib.parse
import json
from bs4 import BeautifulSoup

def scrape_luogu_solved(uid: str) -> int:
    """
    抓取洛谷用户的通过题目数量。
    洛谷的统计数据通常包含在 script 标签的 window._feInjection 全局变量中。
    """
    if not uid or not uid.strip().isdigit():
        raise ValueError("无效的洛谷 UID")

    url = f"https://www.luogu.com.cn/user/{uid.strip()}"
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.8,zh-TW;q=0.7,zh-HK;q=0.5,en-US;q=0.3,en;q=0.2",
    }

    try:
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code != 200:
            raise Exception(f"洛谷服务器返回错误代码: {response.status_code}")
        
        soup = BeautifulSoup(response.text, "html.parser")
        
        # 查找包含全局注入数据的 script 标签
        script_tag = soup.find("script", string=re.compile("window\\._feInjection"))
        if script_tag:
            script_content = script_tag.string
            # 提取 decodeURIComponent("...") 部分
            match = re.search(r'decodeURIComponent\("([^"]+)"\)', script_content)
            if match:
                encoded_json = match.group(1)
                decoded_json = urllib.parse.unquote(encoded_json)
                data = json.loads(decoded_json)
                
                # 数据路径通常是 data['currentData']['user']['passedProblemCount']
                try:
                    passed_count = data['currentData']['user']['passedProblemCount']
                    return int(passed_count)
                except KeyError:
                    pass
        
        # 备用方案：如果在 JSON 中找不到，尝试正则表达式直接匹配网页文本
        match_solved = re.search(r'"passedProblemCount":\s*(\d+)', response.text)
        if match_solved:
            return int(match_solved.group(1))

        # 再次尝试匹配 HTML 中的文本（如果结构变了）
        # 洛谷页面上可能会有类似 "通过无难度的题目: xxx" 或 "通过" 相关的文本
        raise Exception("无法解析洛谷过题数，网页结构可能已发生变化")
        
    except requests.exceptions.RequestException as e:
        raise Exception(f"网络请求失败: {str(e)}")
    except Exception as e:
        raise Exception(f"数据解析失败: {str(e)}")

# 测试验证代码
if __name__ == "__main__":
    # 使用洛谷官方或知名用户的 UID 进行本地调试 (如: 122461 或其他)
    try:
        count = scrape_luogu_solved("1000")
        print(f"UID 1000 成功抓取通过题目数: {count}")
    except Exception as ex:
        print(f"抓取测试出错: {ex}")
