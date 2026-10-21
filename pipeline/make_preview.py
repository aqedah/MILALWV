#!/usr/bin/env python3
"""index.html 에서 preview.html(UX 시안 입구)을 만든다. 같은 코드·같은 자료를 쓰고 window.UX2=true 만 켠다. 운영 index.html 은 그대로.
실행: python3 pipeline/make_preview.py"""
import re, pathlib
src = pathlib.Path("index.html").read_text(encoding="utf-8")
out = src.replace("<title>", "<title>[시안] ", 1)
out = re.sub(r"<script>window\.UX2=[^<]*</script>", "<script>window.UX2=true;</script>", out, count=1)
assert "window.UX2=true" in out
pathlib.Path("preview.html").write_text(out, encoding="utf-8")
print("preview.html 생성", len(out), "bytes")
