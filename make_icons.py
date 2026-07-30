"""生成 PWA 图标（192 / 512 / 180）

editorial 风格：暖米底 + 橙色几何符号，无阴影无渐变。
改配色或符号后重新跑一次：
    python3 make_icons.py
"""
from pathlib import Path

from PIL import Image, ImageDraw

CREAM = (239, 234, 224)   # #EFEAE0 暖米
ORANGE = (205, 111, 71)   # #CD6F47 橙，唯一彩色强调


def make(size: int, out: Path) -> None:
    """画一个 ⊞ 符号：圆角方框 + 十字分隔，四个象限。

    用几何绘制而不是字体渲染，避免不同机器字体缺失导致符号画不出来。
    """
    # 4 倍超采样再缩小，边缘更干净
    ss = 4
    s = size * ss
    img = Image.new("RGB", (s, s), CREAM)
    d = ImageDraw.Draw(img)

    inset = s * 0.26          # 图形四周留白
    stroke = max(1, int(s * 0.055))
    box = [inset, inset, s - inset, s - inset]

    d.rounded_rectangle(box, radius=int(s * 0.055), outline=ORANGE, width=stroke)

    mid = s / 2
    half = stroke / 2
    # 竖线与横线，构成 ⊞ 的四个象限
    d.rectangle([mid - half, inset, mid + half, s - inset], fill=ORANGE)
    d.rectangle([inset, mid - half, s - inset, mid + half], fill=ORANGE)

    img = img.resize((size, size), Image.LANCZOS)
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out, "PNG")
    print(f"  {out.name}  {size}x{size}")


if __name__ == "__main__":
    icons = Path(__file__).parent / "icons"
    print("生成图标：")
    for sz in (192, 512, 180):
        make(sz, icons / f"icon-{sz}.png")
    print("完成")
