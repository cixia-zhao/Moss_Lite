import requests
from typing import Optional

def send_bark_notification(device_key: str, title: str, body: str) -> bool:
    """发送 Bark 推送通知 (针对 iOS 设备)"""
    if not device_key:
        return False
        
    # Bark 支持通过 URL 传参，或者 POST JSON
    url = f"https://api.day.app/{device_key.strip()}"
    payload = {
        "title": title,
        "body": body,
        "sound": "calypso",
        "icon": "https://img.icons8.com/isometric/512/processor.png"  # Link风格图标
    }
    
    try:
        response = requests.post(url, json=payload, timeout=8)
        return response.status_code == 200
    except Exception as e:
        print(f"Bark 推送异常: {e}")
        return False

def send_pushdeer_notification(pushkey: str, title: str, body: str) -> bool:
    """发送 PushDeer 推送通知 (针对微信/全平台)"""
    if not pushkey:
        return False
        
    url = "https://api2.pushdeer.com/message/push"
    params = {
        "pushkey": pushkey.strip(),
        "text": title,
        "desp": body,
        "type": "markdown"  # 支持 markdown 渲染
    }
    
    try:
        response = requests.get(url, params=params, timeout=8)
        if response.status_code == 200:
            res_json = response.json()
            return res_json.get("content", {}).get("result") == "success"
        return False
    except Exception as e:
        print(f"PushDeer 推送异常: {e}")
        return False

def send_notification(
    title: str, 
    body: str, 
    bark_key: Optional[str] = None, 
    push_deer_key: Optional[str] = None
) -> dict:
    """
    统一发送通道入口。
    根据配置的 key，自动分发到已绑定的推送平台。
    """
    results = {"bark": False, "pushdeer": False}
    
    if bark_key and bark_key.strip():
        results["bark"] = send_bark_notification(bark_key, title, body)
        
    if push_deer_key and push_deer_key.strip():
        results["pushdeer"] = send_pushdeer_notification(push_deer_key, title, body)
        
    return results
