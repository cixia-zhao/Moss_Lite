import os
import sys
import shutil
import subprocess
import socket

def get_local_ip():
    """获取本机的局域网 IP 地址"""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # 尝试连接到一个公共地址以获取本机局域网 IP
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = "127.0.0.1"
    finally:
        s.close()
    return ip

def print_banner(local_ip):
    banner = f"""
======================================================================
███╗   ███╗ ██████╗ ███████╗███████╗   ██╗     ██╗████████╗███████╗
████╗ ████║██╔═══██╗██╔════╝██╔════╝   ██║     ██║╚══██╔══╝██╔════╝
██╔████╔██║██║   ██║███████╗███████╗   ██║     ██║   ██║   █████╗  
██║╚██╔╝██║██║   ██║╚════██║╚════██║   ██║     ██║   ██║   ██╔══╝  
██║ ╚═╝ ██║╚██████╔╝███████║███████║██╗███████╗██║   ██║   ███████╗
╚═╝     ╚═╝ ╚═════╝ ╚══════╝╚══════╝╚═╝╚══════╝╚═╝   ╚═╝   ╚══════╝
======================================================================
MOSS-Lite 正启动就绪...
----------------------------------------------------------------------
[本机电脑访问地址] : http://localhost:8000
[局域网手机访问地址] : http://{local_ip}:8000
======================================================================
    """
    print(banner)

def run():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    frontend_dir = os.path.join(root_dir, "frontend")
    backend_dir = os.path.join(root_dir, "backend")
    static_dir = os.path.join(backend_dir, "static")

    print("[MOSS-Lite] 1. 开始校验并安装 Python 后端依赖包...")
    requirements_path = os.path.join(backend_dir, "requirements.txt")
    subprocess.run([sys.executable, "-m", "pip", "install", "-r", requirements_path], check=True)

    print("[MOSS-Lite] 2. 开始校验并安装 React 前端依赖包...")
    if not os.path.exists(os.path.join(frontend_dir, "node_modules")):
        print("[MOSS-Lite] node_modules 目录不存在，正执行安装...")
        subprocess.run("npm install", shell=True, cwd=frontend_dir, check=True)
    else:
        print("[MOSS-Lite] 检测到 node_modules 目录已存在，跳过 npm install 步骤以极速启动。")

    print("[MOSS-Lite] 3. 开始编译 React 前端静态资源...")
    subprocess.run("npm run build", shell=True, cwd=frontend_dir, check=True)

    print("[MOSS-Lite] 4. 开始部署静态资源到 FastAPI 容器中...")
    dist_dir = os.path.join(frontend_dir, "dist")
    if os.path.exists(static_dir):
        shutil.rmtree(static_dir)
    shutil.copytree(dist_dir, static_dir)
    print("[MOSS-Lite] 静态资源部署完成！")

    # 获取并打印局域网 IP 信息
    local_ip = get_local_ip()
    print_banner(local_ip)

    # 启动 Uvicorn 后端服务器，监听 0.0.0.0 端口
    print("[MOSS-Lite] 5. 正在唤醒 MOSS-Lite 智脑服务器...")
    subprocess.run([
        sys.executable, "-m", "uvicorn", 
        "backend.app.main:app", 
        "--host", "0.0.0.0", 
        "--port", "8000"
    ], cwd=root_dir)

if __name__ == "__main__":
    try:
        run()
    except subprocess.CalledProcessError as e:
        print(f"\n[MOSS-Lite 启动错误]: 子进程运行失败 ({e})")
    except KeyboardInterrupt:
        print("\n[MOSS-Lite] 智脑已被手动休眠。")
