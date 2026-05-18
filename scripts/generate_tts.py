"""
预生成所有动物的 TTS 朗读 mp3 文件。
使用 Microsoft Edge 的免费在线 TTS（edge-tts），无需 API key。

用法:
    pip install edge-tts
    python scripts/generate_tts.py

会把 mp3 输出到 public/sounds/tts/ 下，与 animals.js 中的 id 对齐 (例: farm-1.mp3)。
"""

import asyncio
import re
from pathlib import Path

import edge_tts

# 萌系可爱女声 (Lively, Cartoon)。如需男童音换成 zh-CN-YunxiaNeural (Cute)。
VOICE = "zh-CN-XiaoyiNeural"
# 抬高音调让声音更"萌"；语速稍慢一点便于幼儿听清。
RATE = "-8%"
PITCH = "+15Hz"

OUT_DIR = Path(__file__).resolve().parent.parent / "public" / "sounds" / "tts"

# 与 src/data/animals.js 严格对齐
ANIMALS = [
    # 农场
    ("farm-1", "小鸡"),
    ("farm-2", "小狗"),
    ("farm-3", "小猫"),
    ("farm-4", "奶牛"),
    ("farm-5", "绵羊"),
    ("farm-6", "小猪"),
    ("farm-7", "马儿"),
    ("farm-8", "鸭子"),
    ("farm-9", "大白鹅"),
    ("farm-11", "小毛驴"),
    ("farm-12", "山羊"),
    ("farm-13", "公鸡"),
    ("farm-14", "青蛙"),
    ("farm-15", "蜜蜂"),
    # 动物园
    ("zoo-1", "狮子"),
    ("zoo-2", "大象"),
    ("zoo-3", "长颈鹿"),
    ("zoo-4", "熊猫"),
    ("zoo-5", "猴子"),
    ("zoo-6", "老虎"),
    ("zoo-7", "鳄鱼"),
    ("zoo-8", "斑马"),
    ("zoo-9", "袋鼠"),
    ("zoo-10", "河马"),
    ("zoo-11", "孔雀"),
    ("zoo-12", "企鹅"),
    ("zoo-13", "小熊"),
    ("zoo-14", "小狐狸"),
    ("zoo-15", "狼"),
    ("zoo-16", "鹦鹉"),
    ("zoo-17", "大猩猩"),
    ("zoo-18", "骆驼"),
    ("zoo-19", "松鼠"),
    ("zoo-20", "恐龙"),
    ("zoo-21", "小鹿"),
    ("zoo-22", "老鹰"),
    # 海洋馆
    ("ocean-1", "海豚"),
    ("ocean-2", "鲸鱼"),
    ("ocean-13", "海豹"),
    ("ocean-14", "虎鲸"),
]


async def synth_one(animal_id: str, name: str) -> tuple[str, int]:
    text = f"{name}怎么叫"
    out = OUT_DIR / f"{animal_id}.mp3"
    communicate = edge_tts.Communicate(
        text=text,
        voice=VOICE,
        rate=RATE,
        pitch=PITCH,
    )
    await communicate.save(str(out))
    return animal_id, out.stat().st_size


async def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Voice: {VOICE}  rate={RATE}  pitch={PITCH}")
    print(f"Output: {OUT_DIR}")
    print(f"Generating {len(ANIMALS)} files...")

    # 并发上限 6，避免触发限流
    sem = asyncio.Semaphore(6)

    async def bounded(item):
        async with sem:
            try:
                aid, size = await synth_one(*item)
                print(f"  ok  {aid}.mp3  {size:>6} B  <- {item[1]}怎么叫")
            except Exception as e:
                print(f"  ERR {item[0]}: {e}")

    await asyncio.gather(*(bounded(a) for a in ANIMALS))
    print("Done.")


if __name__ == "__main__":
    asyncio.run(main())
