"""DeepSeek (OpenAI-compatible) chat client.

The client always works:
    - If ``DEEPSEEK_API_KEY`` env var is provided -> real HTTP calls.
    - Otherwise -> **deterministic mock mode**. The mock produces stable,
      structurally valid output for every step of the pipeline so the E2E
      smoke tests (``run_pipeline.py all --force-mock``) pass every single run
      even on an air-gapped dev machine.
"""
from __future__ import annotations

import hashlib
import json
import re
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Type, TypeVar

_HERE = Path(__file__).resolve().parent
_PKG_ROOT = _HERE.parent
for p in (_HERE, _PKG_ROOT):
    if str(p) not in sys.path:
        sys.path.insert(0, str(p))

from config import settings  # noqa: E402
from llm.schemas import (  # noqa: E402
    ExtractedGuide, KeyFact, ProcessedGuide, QualityCheck,
    QualityReport, StepItem, GlossaryItem, GuideType,
)

T = TypeVar("T")


# ---------------------------------------------------------------- zh -> TW map
# Hand-crafted common simplified -> traditional mapping used as a fallback
# when the real DeepSeek / LLM API is not available.
_ZH_TO_TW_PAIRS: tuple = (
    ("这", "這"), ("说", "說"), ("话", "話"), ("语", "語"), ("读", "讀"),
    ("请", "請"), ("认", "認"), ("让", "讓"), ("计", "計"), ("记", "記"),
    ("议", "議"), ("评", "評"), ("证", "證"), ("释", "釋"), ("钟", "鐘"),
    ("钱", "錢"), ("钻", "鑽"), ("铁", "鐵"), ("铜", "銅"), ("银", "銀"),
    ("链", "鏈"), ("锁", "鎖"), ("镇", "鎮"), ("镜", "鏡"), ("陆", "陸"),
    ("陈", "陳"), ("阳", "陽"), ("阴", "陰"), ("队", "隊"), ("难", "難"),
    ("雾", "霧"), ("静", "靜"), ("稳", "穩"), ("穷", "窮"), ("窍", "竅"),
    ("飞", "飛"), ("饭", "飯"), ("饮", "飲"), ("饥", "飢"), ("饿", "餓"),
    ("馆", "館"), ("馋", "饞"), ("馈", "饋"), ("鱼", "魚"), ("鸟", "鳥"),
    ("鸡", "雞"), ("麦", "麥"), ("黄", "黃"), ("齐", "齊"), ("龙", "龍"),
    ("为", "為"), ("发", "發"), ("头", "頭"), ("杀", "殺"), ("条", "條"),
    ("来", "來"), ("个", "個"), ("们", "們"), ("价", "價"), ("会", "會"),
    ("传", "傳"), ("伤", "傷"), ("伦", "倫"), ("伪", "偽"), ("体", "體"),
    ("余", "餘"), ("侠", "俠"), ("侣", "侶"), ("侦", "偵"), ("侧", "側"),
    ("侨", "僑"), ("俭", "儉"), ("债", "債"), ("倾", "傾"), ("仅", "僅"),
    ("偿", "償"), ("兑", "兌"), ("党", "黨"), ("兰", "蘭"), ("关", "關"),
    ("兴", "興"), ("兽", "獸"), ("写", "寫"), ("军", "軍"), ("农", "農"),
    ("冯", "馮"), ("冲", "衝"), ("决", "決"), ("况", "況"), ("冻", "凍"),
    ("净", "淨"), ("凄", "淒"), ("凉", "涼"), ("减", "減"), ("凑", "湊"),
    ("几", "幾"), ("凤", "鳳"), ("凭", "憑"), ("凯", "凱"), ("击", "擊"),
    ("划", "劃"), ("刘", "劉"), ("则", "則"), ("刚", "剛"), ("创", "創"),
    ("别", "別"), ("剑", "劍"), ("劝", "勸"), ("办", "辦"), ("务", "務"),
    ("动", "動"), ("励", "勵"), ("劲", "勁"), ("劳", "勞"), ("勋", "勛"),
    ("匀", "勻"), ("华", "華"), ("单", "單"), ("卖", "賣"), ("卢", "盧"),
    ("卤", "鹵"), ("卫", "衛"), ("卷", "捲"), ("厂", "廠"), ("厅", "廳"),
    ("历", "歷"), ("厉", "厲"), ("压", "壓"), ("厌", "厭"), ("县", "縣"),
    ("双", "雙"), ("变", "變"), ("叠", "疊"), ("叶", "葉"), ("号", "號"),
    ("叹", "嘆"), ("后", "後"), ("吓", "嚇"), ("吕", "呂"), ("吗", "嗎"),
    ("听", "聽"), ("启", "啟"), ("吴", "吳"), ("员", "員"), ("咏", "詠"),
    ("啸", "嘯"), ("盐", "鹽"), ("监", "監"), ("盖", "蓋"), ("盘", "盤"),
    ("赛", "賽"), ("账", "帳"), ("赌", "賭"), ("赋", "賦"), ("赐", "賜"),
    ("赔", "賠"), ("质", "質"), ("贩", "販"), ("贪", "貪"), ("贫", "貧"),
    ("贬", "貶"), ("购", "購"), ("贮", "貯"), ("贯", "貫"), ("贱", "賤"),
    ("贴", "貼"), ("贵", "貴"), ("贷", "貸"), ("贸", "貿"), ("费", "費"),
    ("贺", "賀"), ("贻", "貽"), ("贼", "賊"), ("贾", "賈"), ("贿", "賄"),
    ("赁", "賃"), ("赂", "賂"), ("赃", "贓"), ("资", "資"), ("婴", "嬰"),
    ("孙", "孫"), ("学", "學"), ("孪", "孿"), ("宁", "寧"), ("宝", "寶"),
    ("实", "實"), ("宠", "寵"), ("审", "審"), ("宪", "憲"), ("宫", "宮"),
    ("宽", "寬"), ("宾", "賓"), ("寝", "寢"), ("对", "對"), ("寻", "尋"),
    ("导", "導"), ("寿", "壽"), ("将", "將"), ("专", "專"), ("尘", "塵"),
    ("尝", "嘗"), ("层", "層"), ("屿", "嶼"), ("岁", "歲"), ("岂", "豈"),
    ("岭", "嶺"), ("峡", "峽"), ("岛", "島"), ("崭", "嶄"), ("币", "幣"),
    ("帅", "帥"), ("师", "師"), ("帐", "帳"), ("帘", "簾"), ("帜", "幟"),
    ("带", "帶"), ("帧", "幀"), ("庄", "莊"), ("庆", "慶"), ("庐", "廬"),
    ("应", "應"), ("庙", "廟"), ("废", "廢"), ("广", "廣"), ("归", "歸"),
    ("当", "當"), ("录", "錄"), ("彻", "徹"), ("径", "徑"), ("忆", "憶"),
    ("忏", "懺"), ("忧", "憂"), ("怅", "悵"), ("怆", "愴"), ("怜", "憐"),
    ("怀", "懷"), ("态", "態"), ("怂", "慫"), ("爱", "愛"), ("愤", "憤"),
    ("慑", "懾"), ("户", "戶"), ("执", "執"), ("扩", "擴"), ("扫", "掃"),
    ("扬", "揚"), ("扰", "擾"), ("抚", "撫"), ("抛", "拋"), ("抢", "搶"),
    ("护", "護"), ("报", "報"), ("担", "擔"), ("拟", "擬"), ("拢", "攏"),
    ("拨", "撥"), ("拥", "擁"), ("拦", "攔"), ("择", "擇"), ("挚", "摯"),
    ("挛", "攣"), ("挞", "撻"), ("挟", "挾"), ("挠", "撓"), ("挡", "擋"),
    ("挤", "擠"), ("挥", "揮"), ("揽", "攬"), ("搀", "攙"), ("摄", "攝"),
    ("携", "攜"), ("摇", "搖"), ("摆", "擺"), ("摊", "攤"), ("撑", "撐"),
    ("敌", "敵"), ("敛", "斂"), ("数", "數"), ("斋", "齋"), ("斗", "鬥"),
    ("断", "斷"), ("渐", "漸"), ("渊", "淵"), ("渔", "漁"), ("渗", "滲"),
    ("温", "溫"), ("溅", "濺"), ("湾", "灣"), ("潮", "潮"), ("溃", "潰"),
    ("湿", "濕"), ("测", "測"), ("浑", "渾"), ("涛", "濤"), ("泽", "澤"),
    ("洁", "潔"), ("洒", "灑"), ("浓", "濃"), ("涂", "塗"), ("涌", "湧"),
    ("润", "潤"), ("涧", "澗"), ("涨", "漲"), ("淀", "澱"), ("滞", "滯"),
)
_ZH_TO_TW: Dict[str, str] = dict(_ZH_TO_TW_PAIRS)


def _to_tw_mock(text_cn: str) -> str:
    """Simplified -> traditional Chinese fallback transformer.

    Also patches a handful of well-known TW-specific terms (e.g. 程序 -> 程式)
    to mimic real localisation output.
    """
    if not text_cn:
        return ""
    chars = [_ZH_TO_TW.get(c, c) for c in text_cn]
    s = "".join(chars)
    # Known TW-specific phrases
    s = s.replace("程序", "程式").replace("软件", "軟體").replace("硬件", "硬體")
    s = s.replace("服务器", "伺服器").replace("客户端", "客戶端")
    s = s.replace("视频", "影片").replace("图片", "圖片").replace("截图", "截圖")
    s = s.replace("游戏", "遊戲").replace("版本", "版本").replace("角色", "角色")
    s = s.replace("攻略", "攻略").replace("新手", "新手").replace("入门", "入門")
    s = s.replace("圣遗物", "聖遺物").replace("深渊", "深境螺旋")
    return s


def _mock_en(text_cn: str) -> str:
    """Deterministic "English translation" mock. Not real translation, but
    structurally valid English text. Used when the pipeline runs in mock mode.
    """
    if not text_cn:
        return ""
    h = hashlib.sha1(text_cn.encode("utf-8")).hexdigest()[:8]
    # Extract any H# title if present
    if re.search(r"^#", text_cn, re.M):
        lines = text_cn.splitlines()
        out = []
        for ln in lines:
            m = re.match(r"^(#{1,6})\s*(.*)", ln)
            if m:
                hs, rest = m.group(1), m.group(2).strip()
                eng = _en_title(rest)
                out.append(f"{hs} {eng}")
                continue
            if ln.strip().startswith("|"):
                out.append(ln)  # keep table
                continue
            if not ln.strip():
                out.append("")
                continue
            out.append(f"Translated content based on section: {ln[:30]}... [{h}]")
        return "\n".join(out)
    return f"(Mock translation) Content length = {len(text_cn)} chars (hash {h}). " \
           + f"Please provide the DeepSeek API key to get real English output."


def strip_llm_markdown_wrapper(text: str) -> str:
    """Normalize raw LLM markdown output.

    Real DeepSeek calls (unlike the deterministic mock) sometimes wrap the
    guide body in a ```markdown fence or a leading/trailing '---' rule
    (frontmatter-style), even when the prompt says "output only Markdown".
    Strip that wrapper so downstream structure checks (starts with '# ')
    see the actual content.
    """
    t = text.strip()
    if t.startswith("```"):
        t = re.sub(r"^```(?:markdown|md)?\s*\n", "", t)
        t = re.sub(r"\n?```\s*$", "", t)
        t = t.strip()
    lines = t.split("\n")
    while lines and lines[0].strip() in ("---", "***", "___"):
        lines.pop(0)
    while lines and lines[-1].strip() in ("---", "***", "___"):
        lines.pop()
    return "\n".join(lines).strip()


def _en_title(user: str) -> str:
    m = re.search(r"#\s+(.+)", user)
    title = m.group(1).strip() if m else (user.strip()[:40] or "Complete Mobile Game Guide")
    return title


# ============================================================
# LLMClient (real or mock)
# ============================================================
class LLMClient:
    def __init__(self, *, force_mock: bool = False):
        self.force_mock = force_mock or settings.llm_mock_mode
        self.mock_mode = self.force_mock
        self._client: Optional[Any] = None
        if not self.mock_mode:
            try:
                from openai import OpenAI  # type: ignore
                self._client = OpenAI(
                    api_key=settings.deepseek_api_key,
                    base_url=settings.deepseek_base_url,
                    timeout=settings.llm_request_timeout,
                    max_retries=0,
                )
            except Exception as e:
                print(f"[LLM] OpenAI client init failed, falling back to mock: {e}")
                self.mock_mode = True
                self._client = None

    def chat(self, system: str, user: str, *, model: str = "v2",
             temperature: float = 0.5, response_format: Optional[Type[Any]] = None) -> str:
        """Send a chat completion. Returns raw string response."""
        if self.mock_mode:
            return self._mock_chat(system, user, model=model, response_format=response_format)
        assert self._client is not None
        # map aliases "lite" -> "v2-lite"
        model_alias = {"lite": "v2-lite"}.get(model, model)
        model_id = {
            "v2": settings.deepseek_model_v2,
            "v2-lite": settings.deepseek_model_v2_lite,
            "r1": settings.deepseek_model_reasoner,
        }.get(model_alias, settings.deepseek_model_v2)
        kwargs: Dict[str, Any] = dict(
            model=model_id,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=temperature,
            stream=False,
        )
        if response_format is not None:
            kwargs["response_format"] = {"type": "json_object"}
        last: Optional[Exception] = None
        for attempt in range(settings.llm_max_retries + 1):
            try:
                resp = self._client.chat.completions.create(**kwargs)
                text = (resp.choices[0].message.content or "").strip()
                if not text:
                    raise RuntimeError("Empty LLM response")
                return text
            except Exception as e:
                last = e
                time.sleep(1 + attempt)
        raise RuntimeError(f"LLM chat failed after retries: {last}")

    def chat_json(self, system: str, user: str, pydantic_cls: Type[T], *,
                  model: str = "v2-lite", temperature: float = 0.2) -> T:
        """Chat + parse JSON into a Pydantic model. Works in both real and mock modes."""
        import json as _json
        text = self.chat(system, user, model=model, temperature=temperature,
                         response_format=pydantic_cls)
        # Strip possible markdown fence
        text = text.strip()
        if text.startswith("```"):
            text = re.sub(r"^```(?:json)?\s*", "", text)
            text = re.sub(r"\s*```$", "", text)
        data = _json.loads(text)
        # Step 5 mock returns checks as dict; coerce to list
        if pydantic_cls is QualityReport and isinstance(data.get("checks"), dict):
            checks_list = []
            for name, payload in data["checks"].items():
                item = {"name": name, **payload} if isinstance(payload, dict) else {"name": name, "ok": True, "errors": []}
                checks_list.append(item)
            data["checks"] = checks_list
        return pydantic_cls.model_validate(data)

    # ---------------- mock outputs (deterministic per input) ----------------
    def _mock_chat(self, system: str, user: str, *, model: str,
                   response_format: Optional[Type[T]]) -> str:
        # Decide which output shape by response_format or system prompt keywords
        if response_format is not None:
            cls_name = getattr(response_format, "__name__", "")
            if cls_name == "ExtractedGuide":
                return json.dumps(self._mock_extract(user), ensure_ascii=False)
            if cls_name == "QualityReport":
                return json.dumps(self._mock_quality(user), ensure_ascii=False)
        # Heuristic: what kind of prompt?
        sys_low = (system + user).lower()
        if "rewrite" in sys_low or "改写" in system or "润色" in system:
            return self._mock_rewrite(user)
        if "繁體" in system or "台灣" in system or "zh-tw" in sys_low:
            return _to_tw_mock(user)
        if "english" in sys_low or "translate" in sys_low or "英文" in system or "英语" in system:
            return self._mock_translate_to_en(user)
        if "quality" in sys_low or "质量" in system or "检查" in system:
            return json.dumps(self._mock_quality(user), ensure_ascii=False)
        # Default: rewrite zh-CN
        return self._mock_rewrite(user)

    # --- step 1 mock ---
    def _mock_extract(self, user: str) -> Dict[str, Any]:
        gt = GuideType.OTHER
        u = user.lower()
        if "boss" in u or "打法" in user or "击杀" in user:
            gt = GuideType.BOSS
        elif "配队" in user or "队伍" in user or "team" in u:
            gt = GuideType.TEAM
        elif "抽卡" in user or "gacha" in u or "值不值得" in user:
            gt = GuideType.GACHA
        elif "新手" in user or "入门" in user or "beginner" in u:
            gt = GuideType.BEGINNER
        elif "faq" in u or "常见问题" in user:
            gt = GuideType.FAQ
        elif "强度" in user or "tier" in u:
            gt = GuideType.TIER
        elif "灵敏度" in user or "设置" in user:
            gt = GuideType.SETTINGS
        title_m = re.search(r"[《「\"]([^》」\"]{3,40})[》」\"]", user)
        title = (title_m.group(1).strip() + " 通关完全指南") if title_m else self._extract_title(user)
        return ExtractedGuide(
            gameSlug=None,
            gameNameHint=title_m.group(1).strip() if title_m else None,
            title=title,
            guideType=gt,
            tldr=f"{title} 完整攻略：包含配装、循环步骤、关键数值表与常见问题。",
            keyFacts=[
                KeyFact(field="推荐角色等级", value="80", unit="级"),
                KeyFact(field="最低所需暴击率", value=">= 45", unit="%"),
                KeyFact(field="技能等级", value="6 / 6 / 6", unit="级"),
                KeyFact(field="通关预估时长", value="约 90", unit="秒"),
            ],
            steps=[
                StepItem(order=1, title="准备与配队确认",
                         detail="确认所有角色 >= 80 级，核心主 C 技能 >= 6/6/6，辅助带好充能沙。",
                         tip="先看对手元素抗性，避免带错辅助。"),
                StepItem(order=2, title="完整循环步骤",
                         detail="辅助 E -> 副 C Q -> 主 C EQAAA。每 30 秒循环一次。元素爆发好了就开，不要刻意留存。",
                         tip="注意闪避 Boss 大招前摇。"),
                StepItem(order=3, title="虚弱 / 破盾阶段",
                         detail="Boss 进入虚弱阶段后全力输出不要留技能。如果有元素盾，用对应元素角色快速破盾。",
                         tip=None),
            ],
            faqs=[
                "Q: 没有五星主 C 怎么办？A: 用四星同元素主 C 过渡即可，关键是等级拉满。",
                "Q: 练度不够怎么办？A: 先提升角色 / 技能等级，再抠圣遗物副词条。",
            ],
            glossary=[
                GlossaryItem(term_zh_cn="玛薇卡", term_zh_tw="瑪薇卡", term_en="Mavuika",
                             note="5.2 新火五星角色"),
                GlossaryItem(term_zh_cn="茜特菈莉", term_zh_tw="茜特菈莉", term_en="Citlali",
                             note="纳塔辅助"),
            ],
            sourceLocale="zh-CN",
        ).model_dump()

    def _extract_title(self, user: str) -> str:
        m = re.search(r"标题[：:]\s*(.+)", user)
        if m: return m.group(1).strip()[:60]
        h = hashlib.sha1(user.encode("utf-8")).hexdigest()[:2]
        names = ["原神", "鸣潮", "崩坏：星穹铁道", "明日方舟", "王者荣耀",
                 "和平精英", "恋与深空", "绝区零", "第五人格", "阴阳师"]
        name = names[int(h, 16) % len(names)]
        return f"{name} 手游攻略完全指南 v{h[:2]}"

    # --- step 2 mock ---
    def _mock_rewrite(self, user: str) -> str:
        title = self._extract_title(user)
        lines: List[str] = []
        lines.append(f"# {title}")
        lines.append("")
        lines.append("## 一、💡 TL;DR 提要")
        lines.append("")
        lines.append(f"本篇攻略帮助你在约 90 秒内稳定完成对应关卡/版本内容。"
                     "包含配装、完整循环步骤、关键数值表与常见问题。"
                     "适用于大多数练度中等以上的玩家账号。")
        lines.append("")
        lines.append("## 二、✅ 准备清单（Before you start）")
        lines.append("")
        lines.append("- 核心角色等级 >= 80，关键辅助等级 >= 70")
        lines.append("- 主 C 技能 >= 6 / 6 / 6，辅助技能 >= 6 / 1 / 8")
        lines.append("- 主 C 圣遗物主词条正确：攻击沙/杯/头或对应元素/暴伤搭配")
        lines.append("- 确保武器与角色突破等级匹配")
        lines.append("")
        lines.append("## 三、⚔️ 完整步骤 (Rotation)")
        lines.append("")
        lines.append("### 步骤 1：先铺辅助减抗 / 能量")
        lines.append("")
        lines.append("先开辅助 E 减抗、挂元素。确保全队能量 > 70%，如果不满先吃球。"
                     "不建议裸开主 C 爆发，否则会亏大量伤害窗口。")
        lines.append("")
        lines.append("### 步骤 2：副 C / 增伤脱手 Q")
        lines.append("")
        lines.append("把增伤辅助 / 副 C 的 Q 全部铺好。副 C 打完一套立刻切主 C，"
                     "不要贪普攻。30 秒一轮循环。元素爆发好了就开，不要攒。")
        lines.append("")
        lines.append("### 步骤 3：主 C 输出窗口 / 破盾")
        lines.append("")
        lines.append("切主 C，EQAAA 满一套。Boss 进入虚弱阶段后全力输出，不要留技能。"
                     "如果 Boss 有元素盾，优先使用对应元素角色破盾。")
        lines.append("")
        lines.append("## 四、📊 关键数值表")
        lines.append("")
        lines.append("| 项目 | 数值 | 单位 |")
        lines.append("|------|------|------|")
        lines.append("| 推荐角色等级 | 80 级以上 | 等级 |")
        lines.append("| 最低所需暴击率 | >= 45% | % |")
        lines.append("| 建议技能等级 | 6 / 6 / 6 | 级 |")
        lines.append("| 整体通关时长 | 约 90 秒 | 秒 |")
        lines.append("")
        lines.append("## 五、小编提示")
        lines.append("")
        lines.append("我自己测了 5 次，只要严格按步骤走，即使圣遗物一般也能在 90 秒内通关。"
                     "建议新手先去打简单难度熟悉操作循环。")
        return "\n".join(lines) + "\n"

    # --- step 4 mock EN ---
    def _mock_translate_to_en(self, user: str) -> str:
        title = _en_title(user)
        lines: List[str] = []
        lines.append(f"# {title}")
        lines.append("")
        lines.append("## I. TL;DR Summary")
        lines.append("")
        lines.append("This guide walks you through everything you need: team comps,"
                     " rotation order, artifact builds and a final 90-sec clear estimate."
                     " Suitable for players with mid-tier builds.")
        lines.append("")
        lines.append("## II. Core Checklist")
        lines.append("")
        lines.append("- All 4 characters Lv. 80+, supports Lv. 70+")
        lines.append("- Main DPS talents >= 6/6/6, supports: E/Q levelled")
        lines.append("- Correct artifact main stats: DPS: CD/CR circlet + elemental DMG cup")
        lines.append("- Weapon and ascension level matches the character")
        lines.append("")
        lines.append("## III. Step-by-Step Rotation")
        lines.append("")
        lines.append("### Step 1: Prep / Debuffs / Energy")
        lines.append("")
        lines.append("Cast support E first to apply elements and debuffs. Make sure "
                     "team energy is > 70% before swapping, otherwise funnel a few particles.")
        lines.append("")
        lines.append("### Step 2: Burst Rotation")
        lines.append("")
        lines.append("Support E -> Sub-DPS Q -> Main DPS burst. Repeat every ~30 seconds. "
                     "Pop bursts on cooldown; do NOT hoard your Bursts for a 'better window'.")
        lines.append("")
        lines.append("### Step 3: Finish / Shield Break")
        lines.append("")
        lines.append("When the boss enters the vulnerable phase, unload everything. "
                     "If an elemental shield appears, swap to the matching element to crack it fast.")
        lines.append("")
        lines.append("## IV. Key Stat Table")
        lines.append("")
        lines.append("| Stat | Threshold | Unit |")
        lines.append("|------|-----------|------|")
        lines.append("| Recommended character level | 80+ | Level |")
        lines.append("| Minimum CR | >= 45% | % |")
        lines.append("| Talent level | 6 / 6 / 6 | Level |")
        lines.append("| Expected clear time | ~ 90 | sec |")
        lines.append("")
        lines.append("## V. Editor's Note")
        lines.append("")
        lines.append("I tested this rotation 5 times myself. Even with mid-tier artifacts "
                     "you should clear under 90 sec if you strictly follow the steps. "
                     "New players should practice on easy difficulty first.")
        return "\n".join(lines) + "\n"

    # --- step 5 mock ---
    def _mock_quality(self, user: str) -> Dict[str, Any]:
        score = 0.86
        return {
            "passAll": True,
            "overallScore": round(score, 3),
            "checks": {
                "keyFacts_numeric_match":   {"ok": True, "errors": []},
                "step_count_match":         {"ok": True, "errors": []},
                "structure_complete":       {"ok": True, "errors": []},
                "markdown_wellformed":      {"ok": True, "errors": []},
                "source_similarity_ok":     {"ok": True, "errors": []},
            },
            "sourceSimilarities": {"src1": 0.42, "src2": 0.37},
            "notes": "(Mock mode) All checks passed.",
        }


# ============================================================
# Singleton accessor
# ============================================================
_INSTANCE: Optional[LLMClient] = None


def get_llm_client(*, force_mock: bool = False) -> LLMClient:
    global _INSTANCE
    if _INSTANCE is None or force_mock and not _INSTANCE.force_mock:
        _INSTANCE = LLMClient(force_mock=force_mock)
    return _INSTANCE
