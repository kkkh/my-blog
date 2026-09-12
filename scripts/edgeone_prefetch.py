#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
EdgeOne Pages 缓存预热脚本（GitHub Actions 版）
"""

import os
import sys
import time
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import List
from urllib.request import urlopen, Request

from tencentcloud.common import credential
from tencentcloud.common.profile.client_profile import ClientProfile
from tencentcloud.common.profile.http_profile import HttpProfile
from tencentcloud.common.exception.tencent_cloud_sdk_exception import TencentCloudSDKException
from tencentcloud.teo.v20220901 import teo_client, models

def env(name, default=None, required=False):
    val = os.environ.get(name, default)
    if required and not val:
        print(f"[FATAL] 缺少必填环境变量：{name}", file=sys.stderr)
        sys.exit(1)
    return val

def env_bool(name, default):
    return os.environ.get(name, str(default)).lower() in ("1", "true", "yes", "y")

def env_int(name, default):
    try:
        return int(os.environ.get(name, str(default)))
    except ValueError:
        return default

def gh_summary(content):
    path = os.environ.get("GITHUB_STEP_SUMMARY")
    if not path: return
    try:
        with open(path, "a", encoding="utf-8") as f:
            f.write(content + "\n")
    except OSError:
        pass

def collect_from_sitemap(sitemap_url, visited=None):
    if visited is None: visited = set()
    if sitemap_url in visited: return []
    visited.add(sitemap_url)
    urls = []
    try:
        req = Request(sitemap_url, headers={"User-Agent": "edgeone-prefetch-bot/1.0"})
        with urlopen(req, timeout=30) as resp:
            content = resp.read()
    except Exception as e:
        print(f"[WARN] 读取 sitemap 失败 {sitemap_url}: {e}", file=sys.stderr)
        return urls
    try:
        root = ET.fromstring(content)
    except ET.ParseError as e:
        print(f"[WARN] 解析 sitemap 失败 {sitemap_url}: {e}", file=sys.stderr)
        return urls
    ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    for child in root.findall("sm:sitemap/sm:loc", ns):
        urls.extend(collect_from_sitemap(child.text.strip(), visited))
    for child in root.findall("sm:url/sm:loc", ns):
        urls.append(child.text.strip())
    if not urls:
        for child in root.iter():
            if child.tag.endswith("loc") and child.text:
                urls.append(child.text.strip())
    return urls

def collect_from_dist(dist_dir, origin):
    base = Path(dist_dir)
    if not base.exists():
        print(f"[WARN] DIST_DIR 不存在：{dist_dir}", file=sys.stderr)
        return []
    origin = origin.rstrip("/")
    urls = []
    for path in base.rglob("*"):
        if path.is_file():
            rel = path.relative_to(base).as_posix()
            urls.append(f"{origin}/{rel}")
    return urls

def collect_urls():
    urls = []
    raw = os.environ.get("URLS", "").strip()
    if raw:
        urls.extend(u.strip() for u in raw.split(",") if u.strip())
    urls_file = os.environ.get("URLS_FILE")
    if urls_file and Path(urls_file).exists():
        with open(urls_file, "r", encoding="utf-8") as f:
            urls.extend(line.strip() for line in f if line.strip() and not line.startswith("#"))
    sitemap_url = os.environ.get("SITEMAP_URL")
    if sitemap_url:
        urls.extend(collect_from_sitemap(sitemap_url))
    dist_dir = os.environ.get("DIST_DIR")
    site_origin = os.environ.get("SITE_ORIGIN")
    if dist_dir and site_origin:
        urls.extend(collect_from_dist(dist_dir, site_origin))
    seen, deduped = set(), []
    for u in urls:
        if u not in seen:
            seen.add(u); deduped.append(u)
    return deduped

def build_client(secret_id, secret_key, region):
    cred = credential.Credential(secret_id, secret_key)
    http_profile = HttpProfile()
    http_profile.endpoint = "teo.tencentcloudapi.com"
    http_profile.reqTimeout = 60
    client_profile = ClientProfile(httpProfile=http_profile)
    return teo_client.TeoClient(cred, region, client_profile)

def submit_prefetch(client, zone_id, urls):
    req = models.CreatePrefetchTaskRequest()
    req.ZoneId = zone_id
    req.Targets = urls
    req.EncodeUrl = True
    resp = client.CreatePrefetchTask(req)
    return resp.JobId

def describe_task(client, zone_id, job_id):
    req = models.DescribePrefetchTasksRequest()
    req.ZoneId = zone_id
    req.JobId = job_id
    resp = client.DescribePrefetchTasks(req)
    if not resp.Tasks: return {}
    t = resp.Tasks[0]
    return {"job_id": t.JobId, "status": t.Status}

def submit_with_retry(client, zone_id, batch, max_retry):
    last_err = None
    for attempt in range(1, max_retry + 1):
        try:
            return submit_prefetch(client, zone_id, batch)
        except TencentCloudSDKException as e:
            last_err = e
            print(f"[WARN] 提交失败（第 {attempt}/{max_retry} 次）：{e}", file=sys.stderr)
            time.sleep(min(2 ** attempt, 30))
    raise RuntimeError(f"重试 {max_retry} 次后仍失败：{last_err}")

def main():
    secret_id = env("TENCENTCLOUD_SECRET_ID", required=True)
    secret_key = env("TENCENTCLOUD_SECRET_KEY", required=True)
    zone_id = env("EDGEONE_ZONE_ID", required=True)
    region = env("TENCENTCLOUD_REGION", "ap-guangzhou")
    batch_size = env_int("BATCH_SIZE", 5000)
    max_retry = env_int("MAX_RETRY", 3)
    watch = env_bool("WATCH", True)
    poll_interval = env_int("POLL_INTERVAL", 10)
    poll_timeout = env_int("POLL_TIMEOUT", 900)

    urls = collect_urls()
    if not urls:
        print("[FATAL] 未收集到任何 URL", file=sys.stderr); sys.exit(1)
    print(f"[INFO] 收集到 {len(urls)} 条 URL，开始分批提交")

    client = build_client(secret_id, secret_key, region)
    job_ids = []
    failed_batches = 0

    for i in range(0, len(urls), batch_size):
        batch = urls[i:i + batch_size]
        batch_no = i // batch_size + 1
        print(f"[INFO] 提交第 {batch_no} 批，共 {len(batch)} 条 ...")
        try:
            job_id = submit_with_retry(client, zone_id, batch, max_retry)
            print(f"[INFO]   提交成功 JobId={job_id}")
            job_ids.append(job_id)
        except Exception as e:
            failed_batches += 1
            print(f"[ERROR]   第 {batch_no} 批提交失败：{e}", file=sys.stderr)
        time.sleep(0.2)

    summary = [
        "## EdgeOne 预热摘要", "",
        f"- 站点 ID：`{zone_id}`",
        f"- URL 总数：**{len(urls)}**",
        f"- 提交批次数：{len(job_ids)} 成功 / {failed_batches} 失败",
        f"- 任务 ID：{', '.join('`' + j + '`' for j in job_ids) or '无'}"
    ]
    gh_summary("\n".join(summary))

    if failed_batches:
        print(f"[ERROR] 有 {failed_batches} 批提交失败", file=sys.stderr); sys.exit(2)
    if not watch: return

    print(f"[INFO] 轮询任务状态（间隔 {poll_interval}s，超时 {poll_timeout}s）")
    pending, done, failed = set(job_ids), set(), set()
    start = time.time()
    while pending and (time.time() - start) < poll_timeout:
        time.sleep(poll_interval)
        for job_id in list(pending):
            try:
                info = describe_task(client, zone_id, job_id)
                status = info.get("status")
                print(f"[INFO]   {job_id} -> {status}")
                if status in ("success", "failed", "canceled"):
                    pending.discard(job_id)
                    (failed if status != "success" else done).add(job_id)
            except TencentCloudSDKException as e:
                print(f"[WARN] 查询 {job_id} 失败：{e}", file=sys.stderr)
    if pending: print(f"[WARN] 超时，仍有 {len(pending)} 个任务未完成", file=sys.stderr)
    print(f"[INFO] 完成：{len(done)}，失败：{len(failed)}，超时：{len(pending)}")
    if failed: sys.exit(3)

if __name__ == "__main__":
    main()
