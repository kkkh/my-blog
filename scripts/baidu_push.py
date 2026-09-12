#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
百度搜索资源平台 - 普通收录 API 推送脚本
"""

import os
import sys
import time
import json
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import List
from urllib.request import urlopen, Request
from urllib.error import URLError

BAIDU_API = "https://data.zz.baidu.com/urls"

def env(name, default=None, required=False):
    val = os.environ.get(name, default)
    if required and not val:
        print(f"[FATAL] 缺少必填环境变量：{name}", file=sys.stderr); sys.exit(1)
    return val

def env_int(name, default):
    try: return int(os.environ.get(name, str(default)))
    except ValueError: return default

def gh_summary(content):
    path = os.environ.get("GITHUB_STEP_SUMMARY")
    if not path: return
    try:
        with open(path, "a", encoding="utf-8") as f: f.write(content + "\n")
    except OSError: pass

def collect_from_sitemap(sitemap_url, visited=None):
    if visited is None: visited = set()
    if sitemap_url in visited: return []
    visited.add(sitemap_url)
    urls = []
    try:
        req = Request(sitemap_url, headers={"User-Agent": "baidu-push-bot/1.0"})
        with urlopen(req, timeout=30) as resp: content = resp.read()
    except Exception as e:
        print(f"[WARN] 读取 sitemap 失败 {sitemap_url}: {e}", file=sys.stderr); return urls
    try: root = ET.fromstring(content)
    except ET.ParseError as e:
        print(f"[WARN] 解析 sitemap 失败 {sitemap_url}: {e}", file=sys.stderr); return urls
    ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    for child in root.findall("sm:sitemap/sm:loc", ns):
        urls.extend(collect_from_sitemap(child.text.strip(), visited))
    for child in root.findall("sm:url/sm:loc", ns): urls.append(child.text.strip())
    if not urls:
        for child in root.iter():
            if child.tag.endswith("loc") and child.text: urls.append(child.text.strip())
    return urls

def collect_urls():
    urls = []
    raw = os.environ.get("URLS", "").strip()
    if raw: urls.extend(u.strip() for u in raw.split(",") if u.strip())
    urls_file = os.environ.get("URLS_FILE")
    if urls_file and Path(urls_file).exists():
        with open(urls_file, "r", encoding="utf-8") as f:
            urls.extend(line.strip() for line in f if line.strip() and not line.startswith("#"))
    sitemap_url = os.environ.get("SITEMAP_URL")
    if sitemap_url: urls.extend(collect_from_sitemap(sitemap_url))
    seen, deduped = set(), []
    for u in urls:
        if u not in seen: seen.add(u); deduped.append(u)
    return deduped

def push_to_baidu(site, token, urls):
    api = f"{BAIDU_API}?site={site}&token={token}"
    body = "\n".join(urls).encode("utf-8")
    req = Request(api, data=body, headers={"Content-Type": "text/plain"}, method="POST")
    try:
        with urlopen(req, timeout=60) as resp:
            raw = resp.read().decode("utf-8")
            return json.loads(raw)
    except URLError as e: return {"error": str(e)}
    except json.JSONDecodeError: return {"error": f"响应非 JSON：{raw}"}

def main():
    site = env("BAIDU_SITE", required=True)
    token = env("BAIDU_TOKEN", required=True)
    batch_size = env_int("BAIDU_BATCH_SIZE", 2000)
    dry_run = os.environ.get("BAIDU_DRY_RUN", "false").lower() in ("1", "true", "yes")

    urls = collect_urls()
    if not urls: print("[FATAL] 未收集到任何 URL", file=sys.stderr); sys.exit(1)
    print(f"[INFO] 收集到 {len(urls)} 条 URL")

    if dry_run:
        print("[INFO] DRY_RUN=true，仅打印前 10 条：")
        for u in urls[:10]: print(f"  {u}")
        return

    total_success, total_remain = 0, None
    all_not_same, all_not_valid = [], []

    for i in range(0, len(urls), batch_size):
        batch = urls[i:i + batch_size]
        batch_no = i // batch_size + 1
        print(f"[INFO] 推送第 {batch_no} 批，共 {len(batch)} 条 ...")
        result = push_to_baidu(site, token, batch)
        print(f"[INFO]   响应：{json.dumps(result, ensure_ascii=False)}")

        if "error" in result:
            print(f"[ERROR]   推送失败：{result['error']}", file=sys.stderr); continue

        total_success += result.get("success", 0)
        if "remain" in result: total_remain = result["remain"]
        all_not_same.extend(result.get("not_same_site", []))
        all_not_valid.extend(result.get("not_valid", []))
        time.sleep(1)

    summary = [
        "## 百度普通收录推送摘要", "",
        f"- 站点：`{site}`",
        f"- URL 总数：**{len(urls)}**",
        f"- 成功推送：**{total_success}**",
        f"- 当日剩余配额：`{total_remain}`",
        f"- 非本站 URL：{len(all_not_same)} 条",
        f"- 无效 URL：{len(all_not_valid)} 条",
    ]
    gh_summary("\n".join(summary))

    if all_not_valid: print(f"[WARN] 无效 URL 共 {len(all_not_valid)} 条，示例：{all_not_valid[:5]}", file=sys.stderr)
    if all_not_same: print(f"[WARN] 非本站 URL 共 {len(all_not_same)} 条，示例：{all_not_same[:5]}", file=sys.stderr)

if __name__ == "__main__":
    main()
