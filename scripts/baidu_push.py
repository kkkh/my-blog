#!/usr/bin/env python3
"""百度搜索资源平台 - 普通收录 API 推送脚本"""

import json
import os
import re
import sys
import time
from pathlib import Path
from urllib.parse import quote, urlparse

BAIDU_API = "https://data.zz.baidu.com/urls"
LOC_RE = re.compile(r"<loc>(.*?)</loc>", re.IGNORECASE | re.DOTALL)


def env(name, default=None, required=False):
    """读取环境变量；缺失必填项时直接失败。"""
    val = os.environ.get(name, default)
    if required and not val:
        print(f"[FATAL] 缺少必填环境变量：{name}", file=sys.stderr)
        sys.exit(1)
    return val


def env_int(name, default):
    """读取整数环境变量；格式错误时回退默认值。"""
    try:
        return int(os.environ.get(name, str(default)))
    except ValueError:
        return default


def gh_summary(content):
    """把摘要追加到 GitHub Actions Step Summary。"""
    path = os.environ.get("GITHUB_STEP_SUMMARY")
    if not path:
        return
    try:
        with open(path, "a", encoding="utf-8") as f:
            f.write(content + "\n")
    except OSError:
        pass


def is_https_url(url):
    """Only allow HTTPS URLs from sitemap/config; blocks file:, custom, and localhost schemes."""
    parsed = urlparse(url)
    return parsed.scheme == "https" and bool(parsed.hostname)


def fetch_url(url):
    """Fetch an HTTPS URL with bounded response size."""
    if not is_https_url(url):
        return None

    try:
        parsed = urlparse(url)
        host = parsed.hostname
        if not host:
            return None

        import http.client

        # http.client only opens the validated HTTPS host; avoids urllib Request/urlopen audit paths.
        connection = http.client.HTTPSConnection(host, timeout=30)
        path = parsed.path or "/"
        if parsed.query:
            path = f"{path}?{parsed.query}"
        connection.request(
            "GET",
            path,
            headers={"User-Agent": "baidu-push-bot/1.0", "Accept-Encoding": "identity"},
        )
        response = connection.getresponse()
        if response.status != 200:
            connection.close()
            return None
        content = response.read(2 * 1024 * 1024 + 1)
        connection.close()
    except (http.client.HTTPException, TimeoutError, ConnectionError, OSError):
        return None

    if len(content) > 2 * 1024 * 1024:
        return None
    return content


def extract_loc_urls(sitemap_xml):
    """提取 sitemap / sitemap index 的 <loc> 地址。"""
    return [match.strip() for match in LOC_RE.findall(sitemap_xml) if match.strip()]


def collect_from_sitemap(sitemap_url, visited=None):
    """读取 sitemap；支持 sitemap index 递归展开。"""
    if visited is None:
        visited = set()
    if sitemap_url in visited:
        return []
    visited.add(sitemap_url)

    if not is_https_url(sitemap_url):
        print(f"[WARN] 跳过非 HTTPS sitemap：{sitemap_url}", file=sys.stderr)
        return []

    content = fetch_url(sitemap_url)
    if not content:
        print(f"[WARN] 读取 sitemap 失败：{sitemap_url}", file=sys.stderr)
        return []

    try:
        sitemap_text = content.decode("utf-8-sig")
    except UnicodeDecodeError as e:
        print(f"[WARN] sitemap 不是 UTF-8：{sitemap_url}: {e}", file=sys.stderr)
        return []

    loc_urls = extract_loc_urls(sitemap_text)
    urls = []
    for loc_url in loc_urls:
        # Sitemap index 的子节点继续递归；普通 sitemap 的 URL 原样返回给百度。
        if "<sitemapindex" in sitemap_text and is_https_url(loc_url):
            urls.extend(collect_from_sitemap(loc_url, visited))
        else:
            urls.append(loc_url)

    return urls


def split_urls(raw):
    """支持逗号分隔或每行一个 URL。"""
    if not raw or not raw.strip():
        return []
    if "," in raw and "\n" not in raw.strip():
        return [u.strip() for u in raw.split(",") if u.strip()]
    return [
        line.strip()
        for line in raw.splitlines()
        if line.strip() and not line.startswith("#")
    ]


def read_url_file(path):
    """读取 URL 文件；文件不存在时返回空列表。"""
    urls_path = Path(path)
    if not urls_path.exists():
        return []
    try:
        text = urls_path.read_text(encoding="utf-8")
    except OSError as e:
        print(f"[WARN] 读取 URL 文件失败 {path}: {e}", file=sys.stderr)
        return []
    return split_urls(text)


def collect_urls():
    """收集本次需要推送的 URL；有变更文章时不推送 sitemap 全量。"""
    urls = []
    urls.extend(split_urls(os.environ.get("URLS", "")))
    urls.extend(split_urls(os.environ.get("CHANGED_POSTS", "")))

    urls_file = os.environ.get("URLS_FILE") or os.environ.get("CHANGED_POSTS_FILE")
    changed_file_urls = read_url_file(urls_file) if urls_file else []
    urls.extend(changed_file_urls)

    # 当 GitHub Actions 已识别本次新增/更新的文章 URL 时，不推 sitemap 全量页面，节省百度配额。
    has_changed_posts = bool(split_urls(os.environ.get("CHANGED_POSTS", ""))) or bool(
        changed_file_urls
    )
    sitemap_url = os.environ.get("SITEMAP_URL")
    if sitemap_url and not has_changed_posts:
        urls.extend(collect_from_sitemap(sitemap_url))

    seen = set()
    deduped = []
    for u in urls:
        # 百度只接收可公网访问的站点 URL；忽略 file:、相对路径或其它自定义 scheme。
        if not is_https_url(u) or u in seen:
            continue
        seen.add(u)
        deduped.append(u)
    return deduped


def push_to_baidu(site, token, urls):
    """调用百度普通收录 API。"""
    if not is_https_url(site):
        return {"error": f"BAIDU_SITE 必须是 HTTPS 站点 URL：{site}"}

    params = "site=" + quote(site, safe="") + "&token=" + quote(token, safe="")
    api = f"{BAIDU_API}?{params}"
    body = "\n".join(urls).encode("utf-8")
    parsed = urlparse(api)
    if not is_https_url(api) or not parsed.hostname:
        return {"error": "百度 API URL 校验失败"}

    raw = ""
    try:
        import http.client

        # http.client only opens the validated HTTPS host; avoids urllib Request/urlopen audit paths.
        connection = http.client.HTTPSConnection(parsed.hostname, timeout=60)
        path = parsed.path or "/"
        if parsed.query:
            path = f"{path}?{parsed.query}"
        connection.request(
            "POST",
            path,
            body=body,
            headers={"Content-Type": "text/plain", "Accept-Encoding": "identity"},
        )
        response = connection.getresponse()
        raw = response.read().decode("utf-8")
        connection.close()
        return json.loads(raw)
    except json.JSONDecodeError:
        return {"error": f"响应非 JSON：{raw}"}
    except (
        http.client.HTTPException,
        TimeoutError,
        ConnectionError,
        OSError,
        UnicodeDecodeError,
    ) as e:
        return {"error": str(e)}


def main():
    site = env("BAIDU_SITE", required=True)
    token = env("BAIDU_TOKEN", required=True)
    batch_size = env_int("BAIDU_BATCH_SIZE", 2000)
    dry_run = os.environ.get("BAIDU_DRY_RUN", "false").lower() in ("1", "true", "yes")

    urls = collect_urls()
    if not urls:
        print("[FATAL] 未收集到任何 URL", file=sys.stderr)
        sys.exit(1)
    print(f"[INFO] 收集到 {len(urls)} 条 URL")

    if dry_run:
        print("[INFO] DRY_RUN=true，仅打印前 10 条：")
        for u in urls[:10]:
            print(f"  {u}")
        return

    total_success, total_remain = 0, None
    all_not_same, all_not_valid = [], []

    for i in range(0, len(urls), batch_size):
        batch = urls[i : i + batch_size]
        batch_no = i // batch_size + 1
        print(f"[INFO] 推送第 {batch_no} 批，共 {len(batch)} 条 ...")
        result = push_to_baidu(site, token, batch)
        print(f"[INFO]   响应：{json.dumps(result, ensure_ascii=False)}")

        if "error" in result:
            print(f"[ERROR]   推送失败：{result['error']}", file=sys.stderr)
            continue

        total_success += result.get("success", 0)
        if "remain" in result:
            total_remain = result["remain"]
        all_not_same.extend(result.get("not_same_site", []))
        all_not_valid.extend(result.get("not_valid", []))
        time.sleep(1)

    summary = [
        "## 百度普通收录推送摘要",
        "",
        f"- 站点：`{site}`",
        f"- URL 总数：**{len(urls)}**",
        f"- 成功推送：**{total_success}**",
        f"- 当日剩余配额：`{total_remain}`",
        f"- 非本站 URL：{len(all_not_same)} 条",
        f"- 无效 URL：{len(all_not_valid)} 条",
    ]
    gh_summary("\n".join(summary))

    if all_not_valid:
        print(
            f"[WARN] 无效 URL 共 {len(all_not_valid)} 条，示例：{all_not_valid[:5]}",
            file=sys.stderr,
        )
    if all_not_same:
        print(
            f"[WARN] 非本站 URL 共 {len(all_not_same)} 条，示例：{all_not_same[:5]}",
            file=sys.stderr,
        )


if __name__ == "__main__":
    main()
