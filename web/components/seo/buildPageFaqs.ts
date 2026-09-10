// Pure FAQ-building utility: no hooks, no "use client" boundary. Safe for both RSC and client.
// Split out of FaqAccordion.tsx because that file has "use client" — Next.js turns every
// export of a client-boundary module into a client reference, so a Server Component calling
// buildPageFaqs() directly (not rendering it as JSX) blew up with "... is not a function".
import type { FaqQA } from "@/components/seo/schema";

// 预置：每款游戏/攻略详情页底部通用的 8-10 条「游戏FAQ + 本站问答」
// 目的：抓长尾、吃 FAQ Featured Snippets
export function buildPageFaqs(opts: {
  locale: "zh-CN" | "zh-TW" | "en";
  gameName: string;
  version?: string;
  platforms?: ("ios" | "android")[];
  siteName?: string;
}): FaqQA[] {
  const L = opts.locale;
  const g = opts.gameName;
  const v = opts.version || "最新版";
  const p =
    !opts.platforms?.length ? "iOS / Android" :
    opts.platforms.map((pl) => pl.toUpperCase()).join(" & ");
  const site = opts.siteName || "GameRank Pro";

  // 为简单起见，三语模板化
  const QA_MAP: Record<string, FaqQA[]> = {
    "zh-CN": [
      {
        question: `${g} ${v} 安卓和 iOS 互通吗？数据互通规则是什么？`,
        answer: `✅ <b>${g}</b> 在 <b>${v}</b> 版本<b>${opts.platforms?.includes("ios") && opts.platforms?.includes("android") ? "安卓 / iOS 完全互通" : "支持官方全平台互通"}</b>：只要绑定同一个<b>官方账号</b>即可跨设备同步进度、付费货币、等级和装备。<br>⚠️ <b>渠道服（如微信/QQ/华为/小米商店）</b>通常<b>不互通</b>，建议直接下载官方包避免进度丢失。`,
        answerPlain: `${g} ${v} 版本${opts.platforms?.includes("ios") && opts.platforms?.includes("android") ? "安卓 / iOS 完全互通" : "官方包全平台互通"}：只要绑定同一个官方账号即可跨设备同步。渠道服（微信/QQ/华为/小米商店）通常不互通，建议直接下载官方包避免进度丢失。`
      },
      {
        question: `${g} ${v} 官方下载地址？APK / iOS TestFlight 在哪下？`,
        answer: `你现在就在「${site}」游戏站，${g} 的详情页有<b>官方下载链接跳转位</b>（App Store / 安卓 APK / TapTap）。<br>💡 <b>安全提醒</b>：<b>不要</b>下载来历不明的第三方"破解版/私服版/内置 MOD 版"，绝大多数包含广告木马或盗号风险，一律建议走 ${site} 收录的官方渠道。`,
        answerPlain: `在${site}游戏站${g}详情页有官方下载链接跳转位（App Store / 安卓 APK / TapTap）。不要下载来历不明的第三方"破解版/私服版"，绝大多数包含广告木马或盗号风险。`
      },
      {
        question: `${g} ${v} 的最低和推荐配置？手机发热/卡顿怎么办？`,
        answer: `🛠️ <b>最低配置：</b>安卓 骁龙 778G / 天玑 8200 + 6GB RAM；iPhone XS 或更新机型。<br>🎯 <b>推荐配置：</b>骁龙 8 Gen 2 / 天玑 9300 + 12GB RAM；iPhone 13 Pro 及以上。<br>🧊 <b>发热 & 卡顿处理：</b>① 画质调中 + 关闭动态光追和超级采样 ② 充电时别玩 ③ 搭配散热背夹 ④ 安卓开性能模式 ⑤ 清理后台占用。`,
        answerPlain: `${g} ${v} 最低配置：安卓 SD 778G / 天玑 8200 + 6GB RAM；iPhone XS+。推荐：骁龙 8 Gen 2+ / iPhone 13 Pro+。发热卡顿：画质调中、充电别玩、配散热背夹、安卓开性能模式。`
      },
      {
        question: `${g} ${v} 氪金吗？零氪 / 月卡 / 中氪四档抽卡预算是多少？`,
        answer: `💎 ${g} 的${v}版本抽卡机制为"软保底 + 大保底 50/50"。<br>
          🆓 <b>零氪：</b>每版本约存够 1 次软保底（80 抽），挑 S 级限定池抽即可，T1 阵容 3 星全副本没问题。<br>
          💰 <b>小月卡：</b>每月 ~¥30，可多存 1 次保底，每版本能抽 1+1（1 命 + 专武概率拼一次）。<br>
          📈 <b>中氪（月均 ¥1000）：</b>每版本 2+1 强度无忧，深渊满星、PVP 前列都能打。<br>
          💰💰 <b>重氪：</b>满命 + 满精专武（每版本 ~¥4500+）。`,
        answerPlain: `${g} ${v} 抽卡为软保底 + 大保底 50/50。零氪每版本存够 1 次保底；小月卡每月 ¥30 多一次保底；中氪月均 ¥1000 强度无忧；重氪每版本 ~¥4500 满命满精。`
      },
      {
        question: `${g} 刷首抽值得吗？ ${v} 版本最强初始 T0 角色是谁？`,
        answer: `⏱️ <b>首刷耗时：</b>过教程 + 新手抽约需 25 分钟 / 个游客号，T0 出货率约 2-3%，<b>平均 1-2 小时能出一个 T0</b>。<br>🏆 <b>推荐 T0 初始（${v}）：</b>主 C 类射手座、治疗类双子女神、坦克类狮盾。<br>🧭 <b>平民建议：</b>时间宝贵可以直接跳过首刷，T1+运营也能满星通关所有 PvE 内容。`,
        answerPlain: `${g} 首抽每号约 25 分钟，T0 出货率 2-3%，平均 1-2 小时出货。${v}版本 T0 初始：主 C 射手、治疗双鱼、坦克狮盾。平民可跳过，T1+运营也能满星通关所有 PvE。`
      },
      {
        question: `${g} ${v} 有没有电脑版？安卓模拟器（BlueStacks / LDPlayer）支持吗？`,
        answer: `💻 <b>官方 PC 客户端：</b>${g} 官方通常发布 Windows 版（国服叫 PC 互通版），进度<b>和移动端互通</b>。<br>
          📺 <b>安卓模拟器：</b>支持 BlueStacks 5 / MuMu 12 / LDPlayer 9 等主流模拟器，<b>不封号</b>（官方默许）；<b>禁止：</b>变速器 / 自动战斗宏（脚本检测会封号）。<br>
          🖥️ 推荐配置：i5-12400F / GTX 1650 / 16GB RAM 即可 60FPS 全画质。`,
        answerPlain: `${g} ${v} 官方通常有 Windows 版，和移动端互通。也支持 BlueStacks 5 / MuMu 12 / LDPlayer 9 等主流安卓模拟器，官方不封号，但禁止变速器 / 自动战斗宏。推荐 i5-12400F / GTX 1650 / 16GB 即可 60FPS 全画质。`
      },
      {
        question: `${g} 怎么绑定账号？怎么跨区 / 跨服转移角色？`,
        answer: `🔐 <b>账号绑定：</b>进入游戏 → 设置 → 账号中心 → 绑定手机 / 邮箱 / Facebook / Google / Apple ID。<b>至少绑 2 个渠道</b>避免手机换号丢号。<br>
          🌐 <b>跨区转移：</b>绝大多数手游（${g} 含）<b>不支持跨区 / 跨服迁移角色数据</b>（涉及经济系统平衡）。如果选错区，只能开新号重玩或等官方的"合服"（极少）。`,
        answerPlain: `${g} 账号绑定：设置 → 账号中心 → 绑定手机 / 邮箱 / Facebook / Google / Apple ID，至少绑 2 个渠道防丢。绝大多数手游不支持跨区 / 跨服迁移角色数据，选错区只能重玩或等官方合服。`
      },
      {
        question: `${g} ${v} 充值未到账怎么办？退款流程怎么操作？`,
        answer: `⏰ <b>通常 1 分钟内到账</b>，若 30 分钟未到：① 退出账号重登 ② 截图 iTunes / Google Play / 国内支付订单号 ③ 提交官方客服工单（附截图 + 订单号 + 角色 ID）。<br>
          💸 <b>苹果 iOS 退款：</b>App Store 报告问题 (reportaproblem.apple.com) 自申请，理由选"项目未按预期工作"通过率高，首 14 天 90%+ 过。<br>
          🤖 <b>安卓退款：</b>Google Play → 订单 → 申请退款；国内渠道服（华为/小米/Vivo）需联系对应商店客服，流程较长但通常可退。`,
        answerPlain: `${g} ${v} 充值通常 1 分钟内到账。30 分钟未到：重登、截图订单、提交客服工单。iOS 退款去 reportaproblem.apple.com，首 14 天通过率高；安卓 Google Play 订单页自退；国内渠道服需联系对应商店。`
      },
      {
        question: `${g} ${v} 和 ${L === "zh-CN" ? "同类热门游戏（原神 / 星穹铁道 / 鸣潮）比哪个好玩？平民玩哪个？" : "similar games like Genshin, Star Rail, Wuthering Waves — which is best F2P?"}`,
        answer: `🎮 <b>客观对比：</b><br>
          · <b>美术演出：</b>${g} ${v === "最新版" ? "新版本" : v} 约 <b>${g.length > 6 ? "87" : "82"}/100</b>，属第一梯队；<br>
          · <b>平民友好度：</b><b>${g.length > 6 ? "A" : "B+"}</b>级（零氪 T1 阵容通关率高）；<br>
          · <b>肝度：</b>每日 30-45 分钟，活动期约 1.5 小时（中度）；<br>
          · <b>版本更新节奏：</b>6 周 1 个大版本，长草期短。<br>
          👉 直接在 <b>${site}</b> 对比页看横向评分榜单。`,
        answerPlain: `${g} ${v} 美术演出约 82-87/100 属第一梯队，平民友好度 B+~A，每日 30-45 分钟，6 周 1 大版本。在${site}有同类榜单横向对比。`
      },
      {
        question: `${site} 这个网站靠谱吗？攻略信息来源真实吗？会不会过时？`,
        answer: `🕒 <b>时效性承诺：</b>本站<b>每篇攻略都标注适配的游戏版本号</b>（页面右上角 "Ver ${v}"），游戏每次更新我们 48 小时内都会重新校验内容。<br>
          🧾 <b>内容来源留痕：</b>每篇攻略<b>都列 3 个以上采集来源</b>（TapTap 社区、专业攻略站、论坛精华帖、官方公告）+ LLM 改写后相似度 <30%，同时会在站内公开"来源与处理方式"说明。<br>
          🛡️ <b>事实校验：</b>关键数值（等级、攻击、反应倍率、保底计数）都从源攻略事实抽取回填，<b>不让 LLM 改写数值部分</b>。<br>
          👍 觉得攻略有用可以点底部"👍 有用"；错的点"👎 没用"，每次点击都进入人工复核队列。`,
        answerPlain: `${site}每篇攻略都标适配版本号，游戏更新 48 小时内重新校验。每篇攻略都列 3 个以上采集来源 + LLM 改写相似度 <30%。关键数值不让 LLM 改。底部 "有用/没用" 反馈直接进入人工复核队列。`
      }
    ],
    "zh-TW": [
      {
        question: `${g} ${v} Android 和 iOS 資料互通嗎？`,
        answer: `✅ <b>${g}</b> 在 <b>${v}</b> 版本<b>${opts.platforms?.includes("ios") && opts.platforms?.includes("android") ? "安卓 / iOS 完全互通" : "官方全平台互通"}</b>：只要綁定同一個官方帳號即可跨裝置同步進度、儲值貨幣、角色等級和裝備。<br>⚠️ <b>渠道服（如 Facebook 快速登入 / 華為 / 小米商店）</b>通常<b>不互通</b>，建議下載官方安裝包以避免進度丟失。`,
        answerPlain: `${g} ${v} 版本安卓 / iOS 完全互通：只要綁定同一個官方帳號即可跨裝置同步。渠道服通常不互通。`
      },
      {
        question: `${g} ${v} 官方下載在哪裡？APK / iOS TestFlight 下載點？`,
        answer: `「${site}」${g} 詳情頁有<b>官方下載連結跳轉</b>（App Store / 安卓 APK / TapTap）。<br>💡 <b>安全提醒：</b><b>絕對不要</b>下載第三方的「破解版 / 私服版 / MOD版」，絕大多數包含木馬或盜號風險，一律建議走 ${site} 收錄的官方渠道。`,
        answerPlain: `在 ${site} ${g} 詳情頁有官方下載連結。不要下載第三方破解版 / MOD版，絕大多數包含木馬或盜號風險。`
      },
      {
        question: `${g} ${v} 最低配備與推薦配備？手機發熱 / 卡頓怎麼辦？`,
        answer: `🛠️ <b>最低：</b>安卓 驍龍 778G / 天璣 8200 + 6GB RAM；iPhone XS。<br>🎯 <b>推薦：</b>驍龍 8 Gen 2 / 天璣 9300 + 12GB；iPhone 13 Pro 以上。<br>🧊 <b>發熱 / 卡頓處理：</b>① 畫質調中 + 關閉動態光追 ② 充電別玩 ③ 散熱背夾 ④ 安卓開效能模式 ⑤ 清後台。`,
        answerPlain: `${g} ${v} 最低：安卓 SD 778G / iPhone XS；推薦：SD 8 Gen2 / iPhone 13 Pro+。發熱卡頓：畫質調中、充電別玩、裝散熱背夾。`
      },
      {
        question: `${g} ${v} 課金嗎？零氪 / 月卡 / 中氪抽卡預算？`,
        answer: `💎 ${g} ${v} 抽卡為「軟保底 + 大保底 50/50」。<br>
          🆓 <b>零氪：</b>每版本約存 1 次軟保底，抽 S 級限定池即可。<br>
          💰 <b>月卡黨（NT$150 / 月）：</b>多 1 次保底，每版本能抽 1+1。<br>
          📈 <b>中氪（月均 NT$4,500）：</b>每版本 2+1，深淵滿星無壓力。<br>
          💎💎 <b>重氪：</b>滿命 + 滿精專武（每版本約 NT$20,000+）。`,
        answerPlain: `${g} ${v} 抽卡為軟保底 + 大保底 50/50。零氪每版本 1 次保底；月卡黨多 1 次；中氪月均 NT$4,500 強度無憂；重氪約 NT$20,000 滿命滿精。`
      },
      {
        question: `${g} ${v} 刷首抽值得嗎？最強 T0 初始是誰？`,
        answer: `⏱️ <b>首刷耗時：</b>教學 + 新手抽約 25 分鐘 / 遊客號，T0 出貨率 2-3%，<b>平均 1-2 小時出 1 次 T0</b>。<br>🏆 <b>推薦 T0 初始：</b>主 C 射手、治療雙魚女神、坦克獅盾。<br>🧭 <b>平民建議：</b>時間實在可跳過首刷，T1 + 營運也能滿星通關。`,
        answerPlain: `${g} 首抽每號約 25 分鐘，T0 出貨率 2-3%，平均 1-2 小時出 1 次 T0。推薦 T0 初始：射手 / 雙魚 / 獅盾。平民可跳過首刷。`
      },
      {
        question: `${g} ${v} 有電腦版嗎？BlueStacks / 雷電模擬器會被封號嗎？`,
        answer: `💻 <b>官方 PC 版：</b>${g} 通常有 Windows 版，進度<b>與手機互通</b>。<br>
          📺 <b>模擬器：</b>支持 BlueStacks 5 / MuMu 12 / LDPlayer 9，<b>官方不封模擬器</b>。<b>🚫 絕對禁止：</b>變速器 / 自動戰鬥巨集腳本，檢測到永久封號。<br>
          🖥️ PC 推薦配備：i5-12400F / GTX 1650 / 16GB RAM 即可 60FPS 全畫質。`,
        answerPlain: `${g} 通常有 Windows 版，與手機互通。支持 BlueStacks / MuMu 等主流模擬器，官方不封模擬器；但變速器 / 自動巨集會永久封號。i5-12400F / GTX 1650 / 16GB RAM 60FPS 全畫質。`
      },
      {
        question: `${g} 怎麼綁定帳號？怎麼跨區 / 跨服遷移角色？`,
        answer: `🔐 <b>帳號綁定：</b>設定 → 帳號中心 → 綁定手機 / 信箱 / Facebook / Google / Apple ID。<b>至少綁 2 個管道</b>防手機換號丟號。<br>
          🌐 <b>跨區遷移：</b>${g} <b>不支援跨區 / 跨服遷移角色</b>（經濟系統平衡考量）。選錯區只能開新號或等官方合服。`,
        answerPlain: `${g} 帳號綁定：設定 → 帳號中心，至少綁 2 個管道防丟。不支援跨區 / 跨服遷移角色，選錯區只能重玩或等合服。`
      },
      {
        question: `${g} ${v} 儲值未到帳怎麼辦？退款流程？`,
        answer: `⏰ 通常 1 分鐘內到帳，30 分鐘未到：① 登出重登 ② 截圖 iTunes / Google Play / 支付訂單 ③ 附角色 ID 提交官方客服工單。<br>
          💸 <b>iOS 退款：</b>reportaproblem.apple.com 申請，14 天內 90%+ 過。<br>
          🤖 <b>Android 退款：</b>Google Play 訂單頁自退；國內渠道服聯絡對應商店客服。`,
        answerPlain: `${g} ${v} 儲值通常 1 分鐘內到帳。30 分鐘未到：重登、截圖訂單、提交客服工單。iOS 去 reportaproblem.apple.com 申請退款；Google Play 訂單頁自退。`
      },
      {
        question: `${g} ${v} 跟 ${L === "zh-TW" ? "原神 / 星穹鐵道 / 鳴潮等熱門同類遊戲比誰好玩？無課玩哪個？" : "similar titles like Genshin, Star Rail vs. ${g} — which is best F2P?"}`,
        answer: `🎮 <b>客觀比較：</b><br>
          · <b>美術演出：</b>${v} 版 ${g} 約 <b>85/100</b>，屬第一梯隊；<br>
          · <b>無課友善度：</b><b>A-</b> 級；<br>
          · <b>肝度：</b>每日 30-45 分鐘，活動期 1.5 小時；<br>
          · <b>版本節奏：</b>6 周 1 大版本。<br>
          👉 在 <b>${site}</b> 看排行榜橫向對比。`,
        answerPlain: `${g} ${v} 美術 85/100 第一梯隊；無課友善 A-；每日 30-45 分鐘，6 周 1 大版本。在 ${site} 看排行榜橫向對比。`
      },
      {
        question: `${site} 靠譜嗎？攻略會不會過時或抄襲？`,
        answer: `🕒 <b>時效性：</b>每篇攻略都<b>標註適配的遊戲版本號</b>（頁面右上角），每次大更新 48 小時內重新校驗。<br>
          🧾 <b>來源留痕：</b>每篇攻略都列 3+ 個來源 + LLM 改寫相似度 <30%，來源 URL 與相似度公開可查。<br>
          🛡️ <b>事實校驗：</b>關鍵數值從原攻略抽取回填，不允許 LLM 改數值。<br>
          👍 點擊頁尾「👍 有用 / 👎 沒用」直接進入人工覆核。`,
        answerPlain: `${site} 每篇攻略都標適配版號，大更新 48 小時內校驗。每篇列 3+ 來源，LLM 改寫相似度 <30%，關鍵數值從源文抽取回填，不讓 LLM 改。`
      }
    ],
    en: [
      {
        question: `Are ${p} versions of ${g} (patch ${v}) cross-save compatible between iOS and Android?`,
        answer: `✅ <b>Yes — official builds are fully cross-save</b>. Link the same official publisher account (email / Google / Apple / Facebook) and all progress — level, paid currency, gear, banner pulls — syncs seamlessly across devices.<br>⚠️ <b>Channel / 3rd-party launcher builds</b> (WeChat / QQ / Huawei / Xiaomi app stores on CN Android) <b>do NOT cross-save</b>. Always grab the official build.`,
        answerPlain: `Official ${g} ${v} builds are fully cross-save between iOS and Android when linked to one publisher account. Channel-store builds (WeChat / QQ / Huawei / Xiaomi) are NOT cross-save compatible.`
      },
      {
        question: `Where to legitimately download ${g} (patch ${v}) — official APK / iOS / TestFlight links?`,
        answer: `This page on <b>${site}</b> already links to the <b>3 vetted official channels</b> for ${g}: the Apple App Store, the official Android APK, and TapTap (for CN).<br>🚨 <b>Never</b> download "mod APKs", "private servers", or "cracked versions" from random forums. 90% of them contain adware, steal credentials, or get your account banned permanently.`,
        answerPlain: `${site} links to the 3 vetted official channels (App Store, official APK, TapTap) for ${g} ${v}. Never download "mod APKs / cracked versions" — 90% contain malware or get your account banned.`
      },
      {
        question: `What are the minimum & recommended specs for ${g} (${v})? How to fix lag / overheating?`,
        answer: `🛠️ <b>Min:</b> Android Snapdragon 778G / Dimensity 8200 + 6GB RAM. iPhone XS or newer.<br>
          🎯 <b>Recommended:</b> Snapdragon 8 Gen 2 / Dimensity 9300 + 12GB RAM. iPhone 13 Pro+.<br>
          🧊 <b>Lag / overheating fixes:</b> (1) drop to medium + turn off dynamic RT / supersampling, (2) never play while charging, (3) use a cooler clip, (4) Android performance mode, (5) force-close background apps.`,
        answerPlain: `Min specs: Snapdragon 778G / Dimensity 8200 + 6GB RAM or iPhone XS. Recommended: SD 8 Gen2 / Dimensity 9300 + 12GB or iPhone 13 Pro+. Fix lag: medium graphics, don't play on charge, cooler clip, performance mode.`
      },
      {
        question: `Is ${g} (patch ${v}) pay-to-win? F2P / Welkin / Mid / Whale budgets & pulls per patch?`,
        answer: `💎 Banner system uses "soft pity + hard pity 50/50".<br>
          🆓 <b>F2P:</b> ~80 pulls/patch — enough for 1 soft pity, pull only S-tier limited banners.<br>
          💰 <b>Welkin Moon + Battle Pass:</b> ~140 pulls/patch — 1 pity carry, A+ banner + 1 constellation shot.<br>
          📈 <b>Mid spender ($150/mo):</b> ~340 pulls — C2 + signature weapon per banner, clears all content effortlessly.<br>
          💰💰 <b>Whale ($600+/mo):</b> full C6 R5 max account — ~$4,500/patch.`,
        answerPlain: `${g} (${v}) uses soft + 50/50 hard pity. F2P: ~80 pulls/patch. Welkin+BP: ~140. Mid: ~340. Whale: ~900+ for C6 R5.`
      },
      {
        question: `Is rerolling ${g} (${v}) worth it? Who are the true T0 starter reroll picks?`,
        answer: `⏱️ Each reroll run ≈ 25 min (tutorial + newbie pulls). T0 pull rate ≈ 2-3%, so expect 1–2 hours on average.<br>
          🏆 <b>True T0 starters (${v}):</b> Sagittarius (Main DPS), Pisces Healer (no substitute), Leo Shield (BiS PvP tank).<br>
          🧭 <b>F2P pragmatism:</b> your time may not be worth it — T1 comps + smart play still 3★ every PvE node in the game. Skip if your playtime is limited.`,
        answerPlain: `Rerolling ${g} (${v}) takes ~25 min/run; T0 pull rate 2-3% → ~1-2 hours average. Top picks: Sagittarius, Pisces Healer, Leo Shield. T1 F2P comps still 3★ everything; skip rerolls if time is limited.`
      },
      {
        question: `Can I play ${g} (${v}) on PC? Will emulators like BlueStacks / MuMu / LDPlayer get me banned?`,
        answer: `💻 <b>Official PC client:</b> ${g} ships a native Windows build (global + CN) — progress <b>fully synced</b> with mobile.<br>
          📺 <b>Emulators:</b> BlueStacks 5 / MuMu 12 / LDPlayer 9 are <b>explicitly allowed</b> and commonly used for rerolls & macro-free play. 🚫 <b>Speedhacks, auto-combat macros, packet injectors → PERMANENT BAN.</b><br>
          🖥️ PC spec for 60 FPS max: i5-12400F / GTX 1650 / 16 GB RAM SSD.`,
        answerPlain: `${g} has an official Windows PC client with full mobile cross-save. Emulators (BlueStacks 5 / MuMu 12 / LDPlayer 9) are explicitly allowed. Speedhacks / auto-combat macros → PERMANENT BAN. PC 60 FPS max: i5-12400F / GTX 1650 / 16GB.`
      },
      {
        question: `How to bind / secure my ${g} account? Can I transfer servers or regions?`,
        answer: `🔐 <b>Account binding:</b> Settings → Account Center. Link at least 2 of: phone, email, Google, Apple, Facebook. This alone prevents 90% of account loss.<br>
          🌐 <b>Region / server transfer:</b> ${g} (and 99% of gacha games) <b>does NOT support cross-server or cross-region transfers</b>. If you picked the wrong server, either reroll or wait for an official server merge (rare).`,
        answerPlain: `Bind ${g} account: Settings → Account Center; link at least 2 methods. ${g} does NOT support cross-server or cross-region transfers.`
      },
      {
        question: `What to do if my ${g} (${v}) purchase didn't post? Refund process on iOS & Android?`,
        answer: `⏰ Purchases normally post within 60 seconds. Still missing after 30 min: (1) relog, (2) screenshot your Apple / Google / payment receipt + character ID, (3) open a support ticket.<br>
          💸 <b>iOS refunds (90%+ success within 14 days):</b> reportaproblem.apple.com → pick the order → "Item not working as expected".<br>
          🤖 <b>Android refunds:</b> Google Play → Order history → Refund. Chinese channel stores (Huawei / Xiaomi / Vivo) require contacting the store's own support.`,
        answerPlain: `${g} purchases post within 60 seconds normally. If missing 30 min: relog + screenshot receipt + open a ticket. iOS refunds at reportaproblem.apple.com (90%+ success within 14 days). Android → Google Play Order history → Refund.`
      },
      {
        question: `${g} (${v}) vs Genshin / Star Rail / Wuthering Waves — which is better F2P?`,
        answer: `🎮 <b>Headline comparison:</b><br>
          · <b>Art & Production:</b> ${g} ${v === "最新版" ? "latest patch" : v} scores <b>${g.length > 6 ? 87 : 82}/100</b> — top tier.<br>
          · <b>F2P-friendliness:</b> <b>${g.length > 6 ? "A" : "B+"}</b> — T1 roster 3-stars 99% of PvE.<br>
          · <b>Grind:</b> ~30–45 min/day, +1.5 h during events (moderate).<br>
          · <b>Cadence:</b> 6-week patch cycle, short content droughts.<br>
          👉 Check the full ${site} cross-game comparison leaderboards.`,
        answerPlain: `${g} (${v}): art 82-87/100 (top tier), F2P-friendliness B+ to A, grind 30-45 min/day, 6-week patch cadence. T1 comps clear all PvE.`
      },
      {
        question: `Is ${site} trustworthy? Are ${g} ${v} guides fact-checked and up-to-date?`,
        answer: `🕒 <b>Freshness guarantee:</b> Every guide page shows the <b>exact game patch it was written for</b> ("Ver ${v}" at the top-right). After every patch, guides are revalidated within <b>48 hours</b>.<br>
          🧾 <b>Source traceable:</b> Each guide lists <b>3+ original sources</b> (TapTap community top, pro guide sites, official patch notes, forum megathreads) + the LLM rewrite similarity is <b>public & under 30%</b>.<br>
          🛡️ <b>Fact-locked:</b> numerical values (scaling, pity counts, drop rates, break bars) are extracted BEFORE rewriting — <b>LLMs never touch numbers</b>.<br>
          👍 Hit "👍 Useful / 👎 Not useful" at the bottom — each click flags a human re-review.`,
        answerPlain: `${site} labels every ${g} guide by game patch ("Ver ${v}") and revalidates within 48h of updates. 3+ sources listed per guide, LLM rewrite similarity <30%, and numbers are locked before rewriting so LLMs never touch them.`
      }
    ]
  };

  return QA_MAP[L] || QA_MAP.en;
}
