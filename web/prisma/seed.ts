/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ========== Utilities ==========
const LOCALES = ["zh-CN", "zh-TW", "en"] as const;
const GUIDE_TYPES = ["beginner", "team", "boss", "gacha", "faq"] as const;

type I18n<T> = { "zh-CN": T; "zh-TW": T; en: T };
type GameSeed = {
  slug: string;
  globalRank: number;
  platforms: ("ios" | "android")[];
  categories: string[];
  name: I18n<string>;
  desc: I18n<string>;
  score: number;
  iosRank: number | null;
  androidRank: number | null;
  downloads: number;
  rating: number;
  ratingCount: number;
  dev: string;
  pub: string;
  releaseDate: Date;
  appStoreId?: string;
  taptapId?: string;
  iconHue: number;
  bannerHue: number;
  trailer?: boolean;
  screenshotCount: number;
  extraVideoCount: number;
};

const CATEGORIES = ["rpg", "strategy", "casual", "shooter", "card", "simulation", "action", "puzzle", "sports", "racing"];

// ======== GAME LIBRARY (100 mobile games, multi-cat spread) ========
const GAME_LIBRARY: Array<GameSeed> = [
  // --- RPG (15) ---
  makeGame(1, ["崩壞：星穹鐵道", "崩坏：星穹铁道", "Honkai: Star Rail"], ["ios", "android"], ["rpg", "card"], 1, 1, 92, 500, 4.5, 180_000, "HoYoverse", "HoYoverse", "2023-04-26", 90, 200, true, 8, 2),
  makeGame(2, ["原神", "原神", "Genshin Impact"], ["ios", "android"], ["rpg", "action"], 2, 2, 90, 800, 4.6, 520_000, "HoYoverse", "HoYoverse", "2020-09-28", 150, 330, true, 10, 3),
  makeGame(3, ["鳴潮", "鸣潮", "Wuthering Waves"], ["ios", "android"], ["rpg", "action"], 4, 3, 88, 300, 4.3, 130_000, "Kuro Games", "Kuro Games", "2024-05-22", 45, 280, true, 8, 2),
  makeGame(4, ["絕區零", "绝区零", "Zenless Zone Zero"], ["ios", "android"], ["rpg", "action"], 3, 5, 89, 220, 4.4, 140_000, "HoYoverse", "HoYoverse", "2024-07-03", 120, 160, true, 8, 2),
  makeGame(5, ["幻塔", "幻塔", "Tower of Fantasy"], ["ios", "android"], ["rpg"], 15, 10, 80, 120, 4.0, 70_000, "Hotta Studio", "Perfect World", "2021-12-16", 200, 60, false, 6, 1),
  makeGame(6, ["陰陽師", "阴阳师", "Onmyoji"], ["ios", "android"], ["rpg", "card"], 33, 45, 75, 100, 4.2, 60_000, "NetEase", "NetEase", "2016-09-09", 330, 15, false, 5, 0),
  makeGame(7, ["FGO 命運-冠位指定", "FGO 命运-冠位指定", "Fate/Grand Order"], ["ios", "android"], ["rpg", "card"], 25, 30, 78, 85, 4.1, 120_000, "Delightworks", "Aniplex", "2016-07-30", 345, 10, false, 5, 0),
  makeGame(8, ["蔚藍檔案", "蔚蓝档案", "Blue Archive"], ["ios", "android"], ["rpg", "card"], 8, 7, 86, 150, 4.5, 90_000, "Nexon", "Nexon", "2023-08-03", 70, 45, true, 6, 1),
  makeGame(9, ["明日方舟", "明日方舟", "Arknights"], ["ios", "android"], ["rpg", "strategy", "card"], 12, 12, 83, 130, 4.4, 150_000, "Hypergryph", "Hypergryph", "2019-05-01", 270, 20, false, 6, 0),
  makeGame(10, ["崩壞3rd", "崩坏3rd", "Honkai Impact 3rd"], ["ios", "android"], ["rpg", "action"], 40, 50, 76, 110, 4.3, 80_000, "HoYoverse", "HoYoverse", "2016-10-14", 22, 90, false, 5, 0),
  makeGame(11, ["寶可夢大集結", "宝可梦大集结", "Pokemon UNITE"], ["ios", "android"], ["action", "strategy", "rpg"], 60, 38, 73, 95, 4.0, 45_000, "Timi", "The Pokemon Company", "2021-09-22", 55, 35, true, 5, 1),
  makeGame(12, ["重返未來：1999", "重返未来：1999", "Reverse: 1999"], ["ios", "android"], ["rpg", "card"], 18, 20, 82, 55, 4.3, 40_000, "Bluepoch", "Bluepoch", "2023-05-31", 100, 250, false, 5, 0),
  makeGame(13, ["潘尼爾傳奇", "潘尼尔传奇", "Panilla Saga"], ["ios", "android"], ["rpg", "card"], 80, 90, 70, 40, 4.0, 8_000, "Loongcheer", "Loongcheer", "2023-03-21", 120, 80, false, 4, 0),
  makeGame(14, ["鈴蘭之劍", "铃兰之剑", "Sword of Convallaria"], ["ios", "android"], ["rpg", "strategy"], 35, 40, 74, 35, 4.2, 18_000, "XD Games", "XD", "2024-09-25", 280, 50, true, 6, 1),
  makeGame(15, ["少女前線", "少女前线", "Girls' Frontline"], ["ios", "android"], ["rpg", "strategy", "card"], 90, 85, 68, 30, 4.4, 50_000, "MICA Team", "MICA Team", "2017-03-17", 150, 180, false, 4, 0),

  // --- Strategy (15) ---
  makeGame(16, ["部落衝突", "部落冲突", "Clash of Clans"], ["ios", "android"], ["strategy"], 9, 11, 85, 2_000, 4.7, 1_200_000, "Supercell", "Supercell", "2012-08-02", 30, 250, true, 5, 2),
  makeGame(17, ["皇室戰爭", "皇室战争", "Clash Royale"], ["ios", "android"], ["strategy", "card"], 22, 25, 81, 1_500, 4.4, 900_000, "Supercell", "Supercell", "2016-03-02", 180, 15, true, 5, 1),
  makeGame(18, ["萬國覺醒", "万国觉醒", "Rise of Kingdoms"], ["ios", "android"], ["strategy"], 11, 9, 84, 900, 4.2, 400_000, "Lilith", "Lilith", "2018-09-20", 110, 20, true, 6, 2),
  makeGame(19, ["龍與紛爭", "龙与纷争", "Call of Dragons"], ["ios", "android"], ["strategy"], 28, 28, 78, 450, 4.3, 160_000, "Farahope", "Lilith", "2023-03-28", 300, 100, true, 5, 1),
  makeGame(20, ["寒霜啟示錄", "寒霜启示录", "Whiteout Survival"], ["ios", "android"], ["strategy", "simulation"], 5, 4, 87, 700, 4.1, 200_000, "Century Games", "Century", "2023-02-28", 210, 220, false, 4, 1),
  makeGame(21, ["口袋奇兵", "口袋奇兵", "Top War: Battle Game"], ["ios", "android"], ["strategy"], 50, 60, 72, 500, 3.9, 180_000, "Rivergame", "Rivergame", "2020-03-06", 330, 330, false, 4, 1),
  makeGame(22, ["無盡城城", "无尽城城", "Infinity Kingdom"], ["ios", "android"], ["strategy"], 95, 100, 66, 80, 4.0, 22_000, "Youzu", "Youzu", "2021-02-01", 220, 180, false, 4, 0),
  makeGame(23, "全面屍控" as any, ["ios", "android"], ["strategy", "simulation"], 70, 70, 71, 600, 3.9, 220_000, "FunPlus", "KingsGroup", "2019-09-01", 250, 300, false, 4, 0),
  makeGame(24, ["劍與家園", "剑与家园", "Art of Conquest 2"], ["ios", "android"], ["strategy"], 100, 95, 65, 70, 4.1, 30_000, "Lilith", "Lilith", "2024-03-14", 290, 300, true, 4, 1),
  makeGame(25, ["英雄聯盟：激鬥峽谷", "英雄联盟：激斗峡谷", "Wild Rift"], ["ios", "android"], ["strategy", "action"], 45, 42, 74, 300, 4.2, 210_000, "Riot", "Riot", "2020-12-07", 260, 310, true, 6, 2),
  makeGame(26, ["王者榮耀", "王者荣耀", "Honor of Kings"], ["ios", "android"], ["strategy", "action"], 7, 6, 86, 3_000, 4.5, 2_500_000, "Timi", "Tencent", "2015-11-26", 350, 250, true, 6, 3),
  makeGame(27, ["王者榮耀國際版", "王者荣耀国际版", "Arena of Valor"], ["ios", "android"], ["strategy", "action"], 85, 80, 69, 250, 4.1, 90_000, "Tencent", "Level Infinite", "2017-08-10", 240, 330, true, 5, 2),
  makeGame(28, ["刀塔霸業", "刀塔霸业", "Dota Underlords"], ["ios", "android"], ["strategy", "card"], 98, 98, 63, 25, 3.8, 10_000, "Valve", "Valve", "2020-02-25", 170, 200, false, 3, 0),
  makeGame(29, ["多多自走棋", "多多自走棋", "Auto Chess"], ["ios", "android"], ["strategy", "card"], 88, 88, 67, 75, 3.9, 28_000, "Drodo", "Dragonest", "2019-04-18", 110, 10, false, 4, 0),
  makeGame(30, ["漫威：超級爭霸戰", "漫威：超级争霸战", "Marvel Contest"], ["ios", "android"], ["strategy", "action"], 65, 72, 70, 200, 4.3, 140_000, "Kabam", "Kabam", "2014-12-10", 300, 70, true, 5, 1),

  // --- Casual (15) ---
  makeGame(31, ["糖果傳奇", "糖果传奇", "Candy Crush Saga"], ["ios", "android"], ["casual", "puzzle"], 6, 8, 86, 2_500, 4.6, 2_000_000, "King", "King", "2012-04-12", 10, 300, false, 5, 0),
  makeGame(32, ["機器磚塊", "罗布乐思", "Roblox"], ["ios", "android"], ["casual", "simulation"], 13, 13, 83, 3_000, 4.4, 3_200_000, "Roblox", "Roblox", "2014-07-22", 180, 190, true, 5, 2),
  makeGame(33, ["Minecraft 當個創世神", "我的世界", "Minecraft"], ["ios", "android"], ["casual", "simulation"], 20, 22, 81, 1_800, 4.7, 2_100_000, "Mojang", "Mojang", "2009-05-17", 340, 230, true, 6, 2),
  makeGame(34, ["地鐵跑酷", "地铁跑酷", "Subway Surfers"], ["ios", "android"], ["casual", "action"], 26, 18, 78, 4_000, 4.5, 5_000_000, "SYBO", "Kiloo", "2012-05-24", 40, 50, false, 5, 1),
  makeGame(35, ["和平精英 國際版", "和平精英 国际版", "PUBG Mobile"], ["ios", "android"], ["casual", "shooter"], 16, 15, 82, 1_200, 4.2, 2_800_000, "Tencent", "Level Infinite", "2018-03-20", 300, 290, true, 8, 2),
  makeGame(36, ["糖果蘇打傳奇", "糖果苏打传奇", "Candy Crush Soda"], ["ios", "android"], ["casual", "puzzle"], 75, 75, 71, 900, 4.5, 320_000, "King", "King", "2014-11-11", 200, 250, false, 5, 0),
  makeGame(37, ["太空狼人殺", "太空狼人杀", "Among Us"], ["ios", "android"], ["casual"], 55, 55, 72, 1_000, 3.9, 1_500_000, "Innersloth", "Innersloth", "2018-11-16", 190, 150, true, 4, 1),
  makeGame(38, ["憤怒鳥2", "愤怒的小鸟2", "Angry Birds 2"], ["ios", "android"], ["casual", "puzzle"], 82, 82, 68, 500, 4.2, 400_000, "Rovio", "Rovio", "2015-07-30", 90, 280, false, 5, 1),
  makeGame(39, ["我的會說話湯姆貓2", "我的汤姆猫2", "My Talking Tom 2"], ["ios", "android"], ["casual", "simulation"], 72, 72, 70, 800, 4.3, 500_000, "Outfit7", "Outfit7", "2018-11-08", 70, 280, false, 5, 0),
  makeGame(40, ["卡通農場", "卡通农场", "Hay Day"], ["ios", "android"], ["casual", "simulation"], 62, 62, 71, 600, 4.6, 250_000, "Supercell", "Supercell", "2012-06-21", 160, 290, true, 5, 1),
  makeGame(41, ["金幣大師", "金币大师", "Coin Master"], ["ios", "android"], ["casual"], 14, 14, 82, 1_100, 4.3, 1_800_000, "Moon Active", "Moon Active", "2010-03-01", 170, 200, false, 4, 0),
  makeGame(42, ["魯多國王", "Ludo King", "Ludo King"], ["ios", "android"], ["casual", "strategy"], 68, 58, 71, 1_300, 4.1, 900_000, "Gametion", "Gametion", "2016-02-20", 140, 220, false, 4, 0),
  makeGame(43, ["夢幻水族箱", "梦幻水族箱", "Fishdom"], ["ios", "android"], ["casual", "puzzle", "simulation"], 83, 83, 68, 450, 4.4, 180_000, "Playrix", "Playrix", "2008-06-18", 80, 260, false, 5, 0),
  makeGame(44, ["夢幻花園", "梦幻花园", "Gardenscapes"], ["ios", "android"], ["casual", "puzzle", "simulation"], 48, 48, 72, 850, 4.4, 260_000, "Playrix", "Playrix", "2016-08-25", 90, 270, false, 5, 0),
  makeGame(45, ["夢幻家園", "梦幻家园", "Homescapes"], ["ios", "android"], ["casual", "puzzle", "simulation"], 58, 58, 70, 680, 4.3, 200_000, "Playrix", "Playrix", "2017-09-05", 110, 290, false, 5, 0),

  // --- Shooter (10) ---
  makeGame(46, ["決勝時刻M", "使命召唤手游", "Call of Duty Mobile"], ["ios", "android"], ["shooter", "action"], 19, 23, 80, 700, 4.3, 1_500_000, "TiMi", "Activision", "2019-10-01", 230, 320, true, 7, 2),
  makeGame(47, ["特戰英豪M", "无畏契约手游", "Valorant Mobile"], ["ios", "android"], ["shooter", "strategy"], 10, 16, 85, 420, 4.4, 450_000, "Riot", "Riot", "2024-06-28", 350, 150, true, 6, 2),
  makeGame(48, ["Apex 英雄M", "Apex 英雄手游", "Apex Legends"], ["ios", "android"], ["shooter", "action"], 42, 44, 74, 250, 4.0, 300_000, "EA", "EA", "2022-05-17", 210, 120, true, 6, 2),
  makeGame(49, ["Free Fire MAX 我要活下去", "Free Fire MAX", "Free Fire MAX"], ["ios", "android"], ["shooter", "action"], 17, 17, 81, 2_000, 4.0, 2_900_000, "Garena", "Garena", "2021-09-28", 250, 180, true, 6, 1),
  makeGame(50, ["絕地求生：未來之役", "绝地求生：未来之役", "PUBG: New State"], ["ios", "android"], ["shooter", "action"], 52, 52, 71, 350, 3.9, 200_000, "Krafton", "Krafton", "2021-11-11", 330, 180, true, 6, 1),
  makeGame(51, null as any, ["ios", "android"], ["shooter", "strategy"], 77, 77, 69, 150, 3.8, 120_000, "Valve", "Valve", "2024-01-01", 20, 40, true, 5, 1),
  makeGame(52, ["現代槍戰", "现代枪战", "Modern Strike Online"], ["ios", "android"], ["shooter"], 92, 92, 64, 120, 3.9, 70_000, "Azur", "Azur", "2016-06-15", 340, 330, false, 4, 0),
  makeGame(53, ["狙擊手3D", "狙击手3D", "Sniper 3D"], ["ios", "android"], ["shooter"], 66, 66, 70, 300, 4.1, 200_000, "Wildlife", "Wildlife", "2014-01-01", 310, 340, false, 5, 0),
  makeGame(54, ["死亡觸發2", "死亡扳机2", "Dead Trigger 2"], ["ios", "android"], ["shooter", "action"], 99, 99, 62, 100, 4.2, 80_000, "Madfinger", "Madfinger", "2013-10-23", 320, 340, true, 5, 1),
  makeGame(55, ["對峙2", "对峙2", "Standoff 2"], ["ios", "android"], ["shooter", "action"], 87, 87, 67, 180, 4.0, 150_000, "Axlebolt", "Axlebolt", "2017-12-01", 290, 330, true, 5, 1),

  // --- Card (10) ---
  makeGame(56, ["爐石戰記", "炉石传说", "Hearthstone"], ["ios", "android"], ["card", "strategy"], 54, 54, 71, 220, 4.3, 400_000, "Blizzard", "Blizzard", "2014-03-11", 340, 300, true, 5, 1),
  makeGame(57, ["遊戲王 對局遺產", "游戏王 决斗链接", "Yu-Gi-Oh! Master Duel"], ["ios", "android"], ["card", "strategy"], 30, 32, 77, 350, 4.4, 300_000, "Konami", "Konami", "2022-01-19", 280, 50, true, 5, 1),
  makeGame(58, ["闇影詩章", "暗影诗章", "Shadowverse"], ["ios", "android"], ["card", "rpg"], 67, 67, 69, 150, 4.2, 120_000, "Cygames", "Cygames", "2016-06-17", 270, 330, false, 5, 1),
  makeGame(59, ["漫威瞬戰超能", "漫威Snap", "Marvel Snap"], ["ios", "android"], ["card", "strategy"], 29, 35, 78, 180, 4.2, 180_000, "Second Dinner", "Nuverse", "2022-10-18", 130, 140, true, 5, 1),
  makeGame(60, ["符文大地傳說", "符文大地传说", "Legends of Runeterra"], ["ios", "android"], ["card", "strategy"], 74, 74, 70, 100, 4.4, 90_000, "Riot", "Riot", "2020-05-01", 170, 170, true, 5, 1),
  makeGame(61, ["部落傳說：棋兵對決", "部落传说", "Clash Mini"], ["ios", "android"], ["card", "strategy"], 89, 89, 67, 80, 4.0, 30_000, "Supercell", "Supercell", "2021-12-01", 330, 320, false, 4, 0),
  makeGame(62, ["突襲：暗影傳說", "突袭：暗影传说", "Raid Shadow Legends"], ["ios", "android"], ["card", "rpg"], 43, 43, 73, 500, 4.1, 350_000, "Plarium", "Plarium", "2018-07-29", 140, 280, true, 5, 1),
  makeGame(63, ["七騎士2", "七骑士2", "Seven Knights 2"], ["ios", "android"], ["card", "rpg"], 93, 93, 64, 60, 3.9, 20_000, "Netmarble", "Netmarble", "2020-11-10", 50, 200, true, 5, 1),
  makeGame(64, ["第七史詩", "第七史诗", "Epic Seven"], ["ios", "android"], ["card", "rpg"], 63, 63, 70, 120, 4.4, 180_000, "Smilegate", "Smilegate", "2018-11-08", 280, 250, true, 5, 1),
  makeGame(65, ["劍與遠征", "剑与远征", "AFK Arena"], ["ios", "android"], ["card", "rpg", "strategy"], 53, 53, 71, 450, 4.4, 300_000, "Lilith", "Lilith", "2019-04-09", 270, 240, false, 5, 0),

  // --- Simulation (10) ---
  makeGame(66, ["模擬市民手機版", "模拟人生手机版", "The Sims Mobile"], ["ios", "android"], ["simulation"], 56, 56, 70, 400, 4.0, 200_000, "EA Maxis", "EA", "2018-03-06", 180, 180, true, 5, 1),
  makeGame(67, ["模擬城市", "模拟城市", "SimCity BuildIt"], ["ios", "android"], ["simulation", "strategy"], 34, 34, 74, 600, 4.3, 380_000, "EA", "EA", "2014-12-16", 160, 180, true, 6, 1),
  makeGame(68, ["夢幻小鎮", "梦想城镇", "Township"], ["ios", "android"], ["simulation", "casual"], 37, 37, 72, 500, 4.4, 300_000, "Playrix", "Playrix", "2013-02-24", 30, 180, true, 6, 1),
  makeGame(69, ["小小蟻國", "小小蚁国", "The Ants"], ["ios", "android"], ["simulation", "strategy"], 27, 29, 78, 320, 4.1, 180_000, "StarUnion", "StarUnion", "2021-10-01", 60, 70, false, 5, 0),
  makeGame(70, ["王國紀元", "王国纪元", "Lords Mobile"], ["ios", "android"], ["simulation", "strategy"], 47, 45, 72, 700, 4.1, 500_000, "IGG", "IGG", "2016-02-26", 230, 250, true, 5, 1),
  makeGame(71, ["雙點之間", "两点之间", "Two Dots"], ["ios", "android"], ["puzzle", "simulation"], 78, 78, 68, 300, 4.4, 120_000, "Playdots", "Playdots", "2014-05-29", 260, 240, false, 5, 0),
  makeGame(72, ["模擬農場23", "模拟农场23", "Farming Simulator 23"], ["ios", "android"], ["simulation", "casual"], 91, 91, 65, 50, 3.9, 15_000, "Giants", "Giants", "2023-05-23", 200, 260, true, 5, 1),
  makeGame(73, ["人生模擬器", "人生模拟器", "BitLife"], ["ios", "android"], ["simulation", "casual"], 64, 64, 70, 300, 4.0, 500_000, "Candywriter", "Candywriter", "2018-09-29", 240, 220, false, 4, 0),
  makeGame(74, ["口袋城市2", "口袋城市2", "Pocket City 2"], ["ios", "android"], ["simulation"], 97, 97, 63, 30, 4.2, 8_000, "Codebrew", "Codebrew", "2022-07-25", 230, 210, false, 5, 0),
  makeGame(75, ["模擬樂園", "模拟乐园", "RollerCoaster Tycoon"], ["ios", "android"], ["simulation"], 81, 81, 67, 120, 4.0, 30_000, "Atari", "Atari", "2017-02-22", 260, 190, false, 5, 0),

  // --- Puzzle (10) ---
  makeGame(76, ["紀念碑谷2", "纪念碑谷2", "Monument Valley 2"], ["ios", "android"], ["puzzle"], 59, 59, 69, 400, 4.7, 80_000, "Ustwo", "Ustwo", "2017-06-05", 50, 30, false, 5, 0),
  makeGame(77, ["迷室", "迷室", "The Room Pocket"], ["ios", "android"], ["puzzle"], 76, 76, 69, 80, 4.8, 40_000, "Fireproof", "Fireproof", "2012-08-28", 70, 80, false, 5, 0),
  makeGame(78, ["光之鎮", "光之城", "Lumino City"], ["ios", "android"], ["puzzle", "casual"], 96, 96, 62, 20, 4.5, 5_000, "State of Play", "State of Play", "2014-12-03", 90, 100, false, 4, 0),
  makeGame(79, null as any, ["ios", "android"], ["puzzle", "casual"], 71, 71, 68, 800, 4.3, 500_000, "K19", "K19", "2014-03-20", 10, 10, false, 0, 0),
  makeGame(80, null as any, ["ios", "android"], ["puzzle", "casual"], 61, 61, 71, 500, 4.5, 250_000, "Easybrain", "Easybrain", "2018-01-01", 40, 60, false, 4, 0),
  makeGame(81, ["糖果好友傳奇", "糖果好友传奇", "Candy Crush Friends"], ["ios", "android"], ["puzzle", "casual"], 73, 73, 68, 300, 4.3, 120_000, "King", "King", "2018-10-11", 20, 50, false, 5, 0),
  makeGame(82, ["割繩子重製版", "割绳子重制版", "Cut the Rope"], ["ios", "android"], ["puzzle", "casual"], 86, 86, 66, 250, 4.5, 100_000, "ZeptoLab", "ZeptoLab", "2010-10-01", 80, 120, false, 5, 0),
  makeGame(83, ["鱷魚小頑皮", "鳄鱼小顽皮", "Where's My Water"], ["ios", "android"], ["puzzle", "casual"], 94, 94, 63, 350, 4.5, 120_000, "Disney", "Disney", "2011-09-22", 110, 150, false, 4, 0),
  makeGame(84, ["解鎖我", "解锁我", "Unblock Me"], ["ios", "android"], ["puzzle", "casual"], 84, 84, 67, 450, 4.2, 120_000, "Kiipop", "Kiipop", "2009-08-01", 120, 140, false, 4, 0),
  makeGame(85, null as any, ["ios", "android"], ["puzzle", "casual"], 79, 79, 68, 400, 4.4, 200_000, "Big Duck", "Big Duck", "2012-06-10", 130, 160, false, 4, 0),

  // --- Sports & Racing (10) ---
  makeGame(86, ["FIFA Mobile 足球世界", "FIFA Mobile", "FIFA Mobile"], ["ios", "android"], ["sports"], 24, 24, 79, 500, 4.1, 800_000, "EA Mobile", "EA", "2016-10-11", 200, 210, true, 6, 2),
  makeGame(87, ["實況足球", "实况足球", "eFootball"], ["ios", "android"], ["sports"], 39, 39, 72, 300, 3.9, 250_000, "Konami", "Konami", "2021-09-30", 210, 220, true, 6, 2),
  makeGame(88, ["NBA 2K手遊", "NBA 2K手游", "NBA 2K Mobile"], ["ios", "android"], ["sports"], 51, 51, 71, 130, 4.1, 90_000, "2K", "2K", "2018-11-19", 240, 230, true, 5, 1),
  makeGame(89, ["網球傳奇", "网球传奇", "Tennis Clash"], ["ios", "android"], ["sports"], 69, 69, 69, 200, 4.3, 120_000, "Wildlife", "Wildlife", "2019-04-15", 250, 240, false, 5, 0),
  makeGame(90, ["瑪利歐賽車巡迴賽", "马力欧卡丁车巡回赛", "Mario Kart Tour"], ["ios", "android"], ["racing", "casual"], 31, 31, 76, 250, 4.1, 300_000, "Nintendo", "Nintendo", "2019-09-25", 260, 270, true, 5, 1),
  makeGame(91, ["狂野飆車9", "狂野飙车9", "Asphalt 9: Legends"], ["ios", "android"], ["racing", "action"], 23, 26, 80, 400, 4.4, 400_000, "Gameloft", "Gameloft", "2018-07-26", 270, 280, true, 7, 3),
  makeGame(92, ["極速快感：飆車無限", "极品飞车：无限狂飙", "NFS No Limits"], ["ios", "android"], ["racing"], 57, 57, 70, 300, 4.1, 200_000, "EA", "EA", "2015-09-30", 280, 290, true, 6, 2),
  makeGame(93, ["CSR賽車2", "CSR赛车2", "CSR Racing 2"], ["ios", "android"], ["racing"], 71, 71, 68, 250, 4.3, 150_000, "Zynga", "Zynga", "2016-06-29", 290, 300, true, 6, 2),
  makeGame(94, ["Traffic Rider", "Traffic Rider"], ["ios", "android"], ["racing"], 44, 44, 72, 600, 4.3, 300_000, "Soner Kara", "Soner Kara", "2016-01-11", 300, 310, true, 5, 1),
  makeGame(95, ["Dr. Driving 2", "Dr. Driving 2"], ["ios", "android"], ["racing", "casual"], 80, 80, 68, 350, 4.2, 150_000, "SUD", "SUD", "2016-06-02", 310, 320, false, 4, 0),

  // --- Extra fillers for exactly 100 (5 more) ---
  makeGame(96, ["永恆靈魂", "永恒灵魂", "Eversoul"], ["ios", "android"], ["rpg", "card"], 49, 49, 72, 40, 4.2, 50_000, "Kakao Games", "Kakao", "2023-01-05", 320, 330, true, 5, 1),
  makeGame(97, ["龍族幻想", "龙族幻想", "Dragon Raja"], ["ios", "android"], ["rpg", "action"], 46, 46, 73, 150, 4.0, 80_000, "Archosaur", "Archosaur", "2020-02-27", 330, 340, true, 6, 2),
  makeGame(98, ["暗黑破壞神 永生不朽", "暗黑破坏神：不朽", "Diablo Immortal"], ["ios", "android"], ["rpg", "action"], 32, 33, 75, 280, 3.9, 200_000, "Blizzard", "Blizzard", "2022-06-02", 340, 350, true, 6, 2),
  makeGame(99, ["塔瑞斯世界", "塔瑞斯世界", "Tarisland"], ["ios", "android"], ["rpg"], 38, 38, 72, 60, 4.0, 40_000, "Tencent", "Level Infinite", "2024-06-18", 350, 10, true, 5, 1),
  makeGame(100, ["黑色沙漠M", "黑色沙漠M", "Black Desert Mobile"], ["ios", "android"], ["rpg", "action"], 21, 21, 81, 180, 4.1, 180_000, "Pearl Abyss", "Pearl Abyss", "2019-02-26", 355, 350, true, 5, 1),
];

// ---- helper to build a game seed ----
function makeGame(
  globalRank: number,
  names: I18n<string> | string | string[] | null,
  platforms: GameSeed["platforms"],
  categories: string[],
  iosRank: number | null,
  androidRank: number | null,
  score: number,
  downloadsM: number,
  rating: number,
  ratingCount: number,
  dev: string,
  pub: string,
  releaseDateStr: string,
  iconHue: number,
  bannerHue: number,
  trailer = false,
  screenshotCount = 5,
  extraVideoCount = 1
): GameSeed {
  // ---- Robust i18n name resolver (supports array/tuple 2/3 items, string, null, I18n object) ----
  let name: I18n<string>;
  const fallback = {
    "zh-CN": `游戏 ${globalRank}`,
    "zh-TW": `遊戲 ${globalRank}`,
    en: `Game-${globalRank}`
  };
  if (Array.isArray(names)) {
    if (names.length === 3) {
      name = { "zh-TW": String(names[0]), "zh-CN": String(names[1]), en: String(names[2]) };
    } else if (names.length === 2) {
      // treat as [Common-Name, EN]
      name = { "zh-CN": String(names[0]), "zh-TW": String(names[0]), en: String(names[1]) };
    } else if (names.length === 1) {
      name = { "zh-CN": String(names[0]), "zh-TW": String(names[0]), en: String(names[0]) };
    } else {
      name = fallback;
    }
  } else if (typeof names === "string") {
    name = { "zh-CN": names, "zh-TW": names, en: names };
  } else if (names && typeof names === "object" && ("zh-CN" in names || "en" in names)) {
    // I18n object
    name = {
      "zh-CN": String(names["zh-CN"] || names.en || fallback["zh-CN"]),
      "zh-TW": String(names["zh-TW"] || names["zh-CN"] || names.en || fallback["zh-TW"]),
      en: String(names.en || names["zh-CN"] || fallback.en)
    };
  } else {
    name = fallback;
  }
  // Safety: en must exist (for slug)
  if (!name.en || name.en.trim().length === 0) name.en = fallback.en;
  const catWord = {
    rpg: ["角色扮演", "角色扮演", "RPG"],
    strategy: ["策略", "策略", "Strategy"],
    casual: ["休闲", "休閒", "Casual"],
    shooter: ["射击", "射擊", "Shooter"],
    card: ["卡牌", "卡牌", "Card"],
    simulation: ["模拟经营", "模擬經營", "Simulation"],
    action: ["动作", "動作", "Action"],
    puzzle: ["解谜", "解謎", "Puzzle"],
    sports: ["体育", "體育", "Sports"],
    racing: ["竞速", "競速", "Racing"]
  } as any;
  const catNames = categories.map((c) => catWord[c] || { "zh-CN": c, "zh-TW": c, en: c });
  const catsCN = catNames.map((c) => Array.isArray(c) ? c[1] : c["zh-CN"]).join("、");
  const catsTW = catNames.map((c) => Array.isArray(c) ? c[0] : c["zh-TW"]).join("、");
  const catsEN = catNames.map((c) => Array.isArray(c) ? c[2] : c.en).join(", ");
  return {
    globalRank,
    slug: toSlug(name.en),
    platforms,
    categories,
    name,
    desc: {
      "zh-CN": `${name["zh-CN"]} 是一款 ${catsCN} 手游，由 ${dev} 开发、${pub} 发行。本作主打高清画面与沉浸式剧情，${platforms.includes("ios") ? "支持 iPhone / iPad" : ""}${platforms.includes("android") ? (platforms.includes("ios") ? "以及" : "支持") + " 安卓全机型" : ""}。在「${t("site.name")}」你可以查看最新版${globalRank <= 20 ? "全球热度 TOP " + globalRank + " " : ""}${catsCN}排行榜、最新版本号适配攻略、抽卡推荐、配队攻略、Boss 打法等。`,
      "zh-TW": `${name["zh-TW"]} 是一款 ${catsTW} 手遊，由 ${dev} 開發、${pub} 發行。本作主打高畫質與沉浸式劇情，${platforms.includes("ios") ? "支援 iPhone / iPad" : ""}${platforms.includes("android") ? (platforms.includes("ios") ? "以及" : "支援") + " 安卓全機型" : ""}。在「${t("site.name")}」你可以查看最新版${globalRank <= 20 ? "全球熱度 TOP " + globalRank + " " : ""}${catsTW}排行榜、最新版號適配攻略、抽卡推薦、配隊攻略、Boss 打法等。`,
      en: `${name.en} is a ${catsEN} mobile video game developed by ${dev} and published by ${pub}. Featuring${globalRank <= 20 ? " global-top-" + globalRank + " popularity and" : ""} high-fidelity visuals and immersive storytelling, it runs on ${platforms.join(" + ").toUpperCase()}. GameRank.pro aggregates cross-platform rankings, tier lists, ${categories.join(", ")} meta builds, team comps, boss guides and patch-adapted walkthroughs for the latest game version.`
    },
    score,
    iosRank,
    androidRank,
    downloads: downloadsM * 1_000_000,
    rating,
    ratingCount,
    dev,
    pub,
    releaseDate: new Date(releaseDateStr),
    iconHue,
    bannerHue,
    trailer,
    screenshotCount,
    extraVideoCount
  };

  function t(_path: string) {
    return "GameRank.pro";
  }
}

function toSlug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || `game-${Math.random().toString(36).slice(2, 8)}`;
}

// ======== Content factories ========
function buildGuidePair(
  game: GameSeed,
  idx: number,
  locale: "zh-CN" | "zh-TW" | "en"
): { title: string; tldr: string; keyFacts: any[]; content: string } {
  const gameName = game.name[locale];
  const type = GUIDE_TYPES[idx];
  const typeNameMap = {
    "zh-CN": ["新手入门", "最强配队", "Boss 打法", "抽卡规划", "常见问题 FAQ"],
    "zh-TW": ["新手入門", "最強配隊", "Boss 攻略", "抽卡建議", "常見問題 FAQ"],
    en: ["Beginner Tips", "Best Team Comps", "Boss Strategy", "Gacha Planner", "FAQ"]
  } as const;
  const typeName = typeNameMap[locale][idx];

  const version = `${(idx % 4) + 1}.${(idx * 3) % 10}.${(idx * 7 + 1) % 50}`;

  const tldrs: Record<string, I18n<string>> = {
    beginner: {
      "zh-CN": `这篇《${gameName}》新手入门攻略整理了 ${typeName} 必须掌握的 7 件事：首抽推荐、初始 5 星角色 T0 榜、资源分配优先级、7 天升级路线、每日任务效率、商店选购与体力购买建议。适用于版本 ${version}。`,
      "zh-TW": `這篇《${gameName}》新手入門攻略整理了 ${typeName} 必須掌握的 7 件事：首抽推薦、初始 5 星角色 T0 榜、資源分配優先級、7 天升級路線、每日任務效率、商店選購與體力購買建議。適用於版本 ${version}。`,
      en: `This ${gameName} Beginner Guide covers everything you need in Patch ${version}: top 7 starter priorities, T0 Reroll Tier List, 7-day progression roadmap, stamina efficiency, daily mission order, resource cap timing and cash-shop value tiers.`
    },
    team: {
      "zh-CN": `${gameName} 版本 ${version} 的 5 套「版本答案」配队完整推荐，含火/水/风/雷/物理五大体系的主 C、副 C、奶盾、反应辅配置要点，附每队对单/对群/生存/长线四项能力雷达图对比与适用场景。`,
      "zh-TW": `${gameName} 版本 ${version} 的 5 套「版本答案」配隊完整推薦，含火/水/風/雷/物理五大體系的主 C、副 C、奶盾、反應輔配置要點，附每隊對單/對群/生存/長線四項能力雷達圖比對與適用場景。`,
      en: `Top 5 meta team builds for ${gameName} Patch ${version}, ranked. Includes Fire / Water / Wind / Thunder / Physical archetypes with Main-DPS / Sub-DPS / Support / Sustain slot-by-slot recommendations. Single-target, AoE, Survivability and Long-run capability radar charts compared per comp.`
    },
    boss: {
      "zh-CN": `${gameName} 高难度「${`混沌深淵第${(idx + 2) * 3}層`}」Boss 完整打法详解：机制阶段拆解（Phase 1-3）、破盾窗口、攻击模式与闪躲顺序、技能释放时机、容错角色推荐与极限输出循环。版本 ${version} 适配。`,
      "zh-TW": `${gameName} 高難度「${`混沌深淵第${(idx + 2) * 3}層`}」Boss 完整打法詳解：機制階段拆解（Phase 1-3）、破盾窗口、攻擊模式與閃躲順序、技能釋放時機、容錯角色推薦與極限輸出循環。版本 ${version} 適配。`,
      en: `Complete ${gameName} Boss Guide for "Abyss Floor ${(idx + 2) * 3}" (Patch ${version}). Phase 1/2/3 mechanic break-downs, shield-break windows, iframe dodging timelines, skill rotation windows, tank-and-spank safety roster and optimized DPS rotations.`
    },
    gacha: {
      "zh-CN": `${gameName} 版本 ${version} 抽卡&氪金规划：下一期限定池、常驻池、武器池推荐优先级；大小月卡、通行证性价比；0 氪 / 月卡党 / 中氪 / 重氪四档抽卡预算分配方案；垫刀历史记录表模板与「欧/非」概率计算器。`,
      "zh-TW": `${gameName} 版本 ${version} 抽卡&課金規劃：下一期限定池、常駐池、武器池推薦優先級；大小月卡、通行證性價比；0 氪 / 月卡黨 / 中氪 / 重氪四檔抽卡預算分配方案；墊刀歷史記錄表模板與「歐/非」概率計算器。`,
      en: `${gameName} Gacha Planner (Patch ${version}). Next limited banner, standard banner and weapon banner ROI priorities. Battle-Pass / Premium-Pass / Welkin Moon value analysis. Four budget tiers: F2P / Light / Mid / Whale — with exact pull-count per banner, pity-carry table template, and probabilistic pulls calculator.`
    },
    faq: {
      "zh-CN": `${gameName} 新手 30 个最常见问题 FAQ（版本 ${version} 最新整理）：数据互通/跨平台、国际服/国服区别、账号绑定、退款流程、PVP/PVE 强度差异、手机发热优化、模拟器推荐、最低/推荐配置一览、无法进入游戏故障排查、首抽刷取是否值得等。`,
      "zh-TW": `${gameName} 新手 30 個最常見問題 FAQ（版本 ${version} 最新整理）：資料互通/跨平台、國際服/國服差異、帳號綁定、退款流程、PVP/PVE 強度差異、手機發熱優化、模擬器推薦、最低/推薦配備一覽、無法進入遊戲故障排除、首抽刷取是否值得等。`,
      en: `Top 30 Most Asked Questions about ${gameName} (Updated Patch ${version}). Cross-save & cross-platform, global vs CN servers, account linking & refund flows, PvP vs PvE meta delta, overheating optimization on Android/iOS, emulator recommendations, minimum & recommended specs, crash troubleshooting, and "is rerolling worth it".`
    }
  };
  const tldr = tldrs[type][locale];

  const keyFacts = buildKeyFacts(type, game, version, locale);

  const content = buildGuideMarkdown(type, game, version, locale, typeName, tldr, keyFacts);

  return { title: `【${typeName}】${gameName} ${version} ${typeName}完整攻略`, tldr, keyFacts, content };
}

function buildKeyFacts(type: string, g: GameSeed, ver: string, locale: "zh-CN" | "zh-TW" | "en") {
  const fieldsCN = {
    beginner: [
      ["推荐新手池", "常驻池 #12", ""],
      ["起步难度", "中等", "★×3"],
      ["首抽保底", "90 抽", ""],
      ["预计满级需时间", "7~14 天", " (月卡党)"],
      ["每日上线建议时长", "30~45 分钟", ""]
    ],
    team: [
      ["阵容体系数", "5 套", ""],
      ["T0 主 C 数量", `${4 + (g.categories.length % 3)}`, "名"],
      ["零氪可组阵容", "3 套", ""],
      ["版本强势期", `≥ ${ver}`, ""],
      ["每养成成本中位数", "≈ 6800 资源", ""],
      ["对单 DPS 上限", "2,810/s", " (+ 反应 45%)"]
    ],
    boss: [
      ["推荐战力门槛", `${260_000 + g.globalRank * 1000}`, ""],
      ["推荐属性克制", "火 / 雷", ""],
      ["机制阶段数", "3 阶段", " Phase I/II/III"],
      ["预计通关时长", "6:30", " (150 秒/阶段)"],
      ["容错率", "低", ""],
      ["掉落关键素材", "限定武器突破石", " ×3"]
    ],
    gacha: [
      ["下一卡池开放时间", `2026-${(parseInt(ver) % 12) + 1}-10`, ""],
      ["UP 角色", "限定五星 ×2", ""],
      ["限定池概率", "5★ 基础 0.6%", " 软保底 74 抽"],
      ["月卡党每版本抽数", "≈ 140 抽", ""],
      ["预计总预算（中氪）", "≈ ¥2,680", ""],
      ["性价比评级", "S 级", " (强烈建议抽)"]
    ],
    faq: [
      ["数据互通（ios/android）", "✅ 支持", ""],
      ["跨平台 PVP", "✅ 支持", ""],
      ["中文语言包", `✅ ${locale}`, " 完整本地化"],
      ["最低内存要求", "4 GB RAM", ""],
      ["推荐存储", "≥ 20 GB", " 预留 30GB"],
      ["账号绑定上限", "5 台设备", ""]
    ]
  } as Record<string, [string, string, string][]>;
  return fieldsCN[type].map(([field, value, unit]) => ({ field, value, unit }));
}

function buildGuideMarkdown(
  type: string,
  game: GameSeed,
  version: string,
  locale: "zh-CN" | "zh-TW" | "en",
  _typeName: string,
  tldr: string,
  keyFacts: any[]
) {
  const g = game.name[locale];
  const L = locale;
  const h2 = (s: I18n<string>) => `## ${s[L]}\n\n`;
  const h3 = (s: I18n<string>) => `### ${s[L]}\n\n`;
  const lines: string[] = [];
  void tldr;
  lines.push(`# ${g} · 版本 ${version} ${L === "en" ? "Full Guide" : L === "zh-TW" ? "完整攻略" : "完整攻略"}\n\n`);

  if (type === "beginner") {
    lines.push(h2({ "zh-CN": "一、开局选什么服务器", "zh-TW": "一、開局選什麼伺服器", en: "1. Which Server to Start On" }));
    lines.push(L === "en" ? `For new players, pick **Server 1 - ** if you want competitive ranking. If you just want a chill PvE experience, fresh servers 7-10 give you newbie-event currency parity.\n\n` :
      L === "zh-TW" ? `新手建議：想衝排名的玩家請選擇 **1 服**（最活躍，公會戰獎金池最大）；單純 PvE 休閒體驗的話，建議選擇開服 14 天內的新服（通常是 7-10 號伺服器），享有新手衝等活動的貨幣平權。\n\n` :
      `新手建议：想冲排名的玩家请选择 **1 服**（最活跃，公会战奖金池最大）；单纯 PvE 休闲体验的话，建议选择开服 14 天内的新服（通常是 7-10 号服务器），享有新手冲等活动的货币平权。\n\n`);
    lines.push(h2({ "zh-CN": "二、首抽推荐（T0 Tier List）", "zh-TW": "二、首抽推薦（T0 排行榜）", en: "2. Reroll Tier List (T0 Picks)" }));
    lines.push(renderTable(
      L,
      [{ key: "tier", label: { "zh-CN": "级别", "zh-TW": "級別", en: "Tier" } },
       { key: "role", label: { "zh-CN": "角色/职业", "zh-TW": "角色/職業", en: "Role" } },
       { key: "pve", label: { "zh-CN": "PvE 强度", "zh-TW": "PvE 強度", en: "PvE" } },
       { key: "pvp", label: { "zh-CN": "PVP 强度", "zh-TW": "PVP 強度", en: "PvP" } },
       { key: "note", label: { "zh-CN": "备注", "zh-TW": "備註", en: "Notes" } }],
      [
        { tier: "T0", role: L === "en" ? "Sagittarius" : "射手座 (A)", pve: "S", pvp: "S+", note: L === "en" ? "Must pull banner-1" : L === "zh-TW" ? "首池必抽" : "首池必抽" },
        { tier: "T0", role: L === "en" ? "Pisces Healer" : "雙魚座 奶", pve: "S+", pvp: "A", note: L === "en" ? "No substitute" : "无可替代" },
        { tier: "T0.5", role: L === "en" ? "Leo Shield" : "獅子座 坦", pve: "A+", pvp: "S", note: L === "en" ? "PvP BiS" : "PVP 最強" },
        { tier: "T1", role: L === "en" ? "Aquarius Sub-DPS" : "寶瓶座 副 C", pve: "A", pvp: "A", note: L === "en" ? "F2P friendly" : "平民友好" },
        { tier: "T1", role: L === "en" ? "Aries Burst" : "白羊座 爆發", pve: "A", pvp: "B+", note: L === "en" ? "Good early" : "過渡好用" }
      ]
    ));
    lines.push(h2({ "zh-CN": "三、资源分配优先级", "zh-TW": "三、資源分配優先級", en: "3. Resource Priority Pyramid" }));
    lines.push(bullets(L, [
      { "zh-CN": "EXP Potion → 主 C 先拉满，副 C 跟到 80%，奶盾 60%。", "zh-TW": "EXP Potion → 主 C 先拉滿，副 C 跟到 80%，奶盾 60%。", en: "XP Potions → Main DPS first, sub-DPS 80%, Sustain 60%." },
      { "zh-CN": "进阶石 → 只给能进 T0/T1 阵容的角色，别浪费给低星仓管。", "zh-TW": "進階石 → 只給能進 T0/T1 陣容的角色，別浪費給低星倉管。", en: "Ascension Stones → only T0/T1 roster. No hoarding on 3*s." },
      { "zh-CN": "体力药水 → 前 14 天全刷突破本，第 15 天开始切日常。", "zh-TW": "體力藥水 → 前 14 天全刷突破本，第 15 天開始切日常。", en: "Stamina refills → pre-patch rush 14 days, then dailies only." },
      { "zh-CN": "钻石 → 抽卡 70% / 礼包 20% / 体力 10%，不建议抽常驻。", "zh-TW": "鑽石 → 抽卡 70% / 禮包 20% / 體力 10%，不建議抽常駐。", en: "Diamonds → 70% banners / 20% event shop / 10% refill. Avoid standard banner." }
    ]));
    lines.push(h2({ "zh-CN": "四、每日效率路线", "zh-TW": "四、每日效率路線", en: "4. Daily Efficiency Order" }));
    lines.push(numbered(L, [
      { "zh-CN": "12:00 / 18:00 签到领体力 + 邮件扫荡券", "zh-TW": "12:00 / 18:00 簽到領體力 + 郵件掃蕩券", en: "12:00 / 18:00 Login stamina + mail sweep tickets" },
      { "zh-CN": "公会祈祷 / 公会副本（产出关键突破币）", "zh-TW": "公會祈禱 / 公會副本（產出關鍵突破幣）", en: "Guild prayer + guild raids (key ascension currency)" },
      { "zh-CN": "主 C 突破材料本（扫荡 6 次）", "zh-TW": "主 C 突破材料本（掃蕩 6 次）", en: "Main-DPS ascension dungeon × 6 sweeps" },
      { "zh-CN": "活动副本（限时任务，奖励倍率 150%）", "zh-TW": "活動副本（限時任務，獎勵倍率 150%）", en: "Event dungeon (timed, 1.5x reward)" },
      { "zh-CN": "日常、周常一键领取", "zh-TW": "日常、週常一鍵領取", en: "Daily / weekly claim-all" },
      { "zh-CN": "公会战 + 竞技场（结算前 30 分钟再打）", "zh-TW": "公會戰 + 競技場（結算前 30 分鐘再打）", en: "Guild Battle + Arena (play 30 min before reset for rank sniping)" }
    ]));
    lines.push(h2({ "zh-CN": "五、七天升级路线图", "zh-TW": "五、七天升級路線圖", en: "5. Day 1–7 Progression Roadmap" }));
    lines.push(renderTable(L, [
      { key: "day", label: { "zh-CN": "天数", "zh-TW": "天數", en: "Day" } },
      { key: "goal", label: { "zh-CN": "目标等级", "zh-TW": "目標等級", en: "Level" } },
      { key: "unlock", label: { "zh-CN": "解锁系统", "zh-TW": "解鎖系統", en: "Unlocks" } },
      { key: "action", label: { "zh-CN": "核心任务", "zh-TW": "核心任務", en: "Focus" } }
    ], [
      { day: "D1", goal: "Lv. 25", unlock: L === "en" ? "Gacha & Guild" : L === "zh-TW" ? "抽卡&公會" : "抽卡&公会", action: L === "en" ? "Reroll 3x if needed" : "必要时刷 3 次首抽" },
      { day: "D2", goal: "Lv. 32", unlock: L === "en" ? "PvP Arena" : "競技場", action: L === "en" ? "Clear Main Ch. 3" : "通关主线第 3 章" },
      { day: "D3", goal: "Lv. 38", unlock: L === "en" ? "Gear Dungeon" : "裝備副本", action: L === "en" ? "First gear refresh" : "第一次刷装备" },
      { day: "D4", goal: "Lv. 45", unlock: L === "en" ? "Talent Tree" : "天賦樹", action: L === "en" ? "T0 main DPS T4 gear" : "主 C 刷 T4 套" },
      { day: "D5", goal: "Lv. 52", unlock: L === "en" ? "Abyss mode" : "深淵", action: L === "en" ? "Abyss F1-15 clear" : "深渊 F1-15 通关" },
      { day: "D6", goal: "Lv. 58", unlock: L === "en" ? "Guild Raid" : "公會遠征", action: L === "en" ? "Guild first clear" : "首通公會本" },
      { day: "D7", goal: "Lv. 65", unlock: L === "en" ? "End-game Raid" : "遠征", action: L === "en" ? "T0 roster ready" : "T0 阵容成型" }
    ]));
  }

  if (type === "team") {
    lines.push(h2({ "zh-CN": "一、版本五大 T0 配队", "zh-TW": "一、版本五大 T0 配隊", en: "1. Top 5 Meta Comps (Patch " + version + ")" }));
    lines.push(renderTable(L, [
      { key: "name", label: { "zh-CN": "体系名", "zh-TW": "體系名", en: "Comp" } },
      { key: "m", label: { "zh-CN": "主 C", "zh-TW": "主 C", en: "Main-DPS" } },
      { key: "s", label: { "zh-CN": "副 C", "zh-TW": "副 C", en: "Sub-DPS" } },
      { key: "b", label: { "zh-CN": "辅助/奶", "zh-TW": "輔助/奶", en: "Support" } },
      { key: "st", label: { "zh-CN": "对单", "zh-TW": "對單", en: "ST" } },
      { key: "ae", label: { "zh-CN": "对群", "zh-TW": "對群", en: "AoE" } },
      { key: "sur", label: { "zh-CN": "生存", "zh-TW": "生存", en: "Surv" } },
      { key: "use", label: { "zh-CN": "适用场景", "zh-TW": "適用場景", en: "Best for" } }
    ], [
      { name: L === "en" ? "🔥 Fire Burst" : L === "zh-TW" ? "🔥 火爆發" : "🔥 火爆发", m: "Leo Burst", s: "Sagittarius", b: "Aquarius Support", st: "S+", ae: "A", sur: "B+", use: L === "en" ? "Boss, Abyss" : "Boss / 深淵" },
      { name: L === "en" ? "💧 Water DoT" : "💧 水 DoT", m: "Pisces Poison", s: "Cancer Sub", b: "Libra Shield", st: "S", ae: "S+", sur: "A", use: L === "en" ? "Arena AoE" : "PVP / 對群" },
      { name: L === "en" ? "🌪️ Wind Crit" : "🌪️ 風暴爆擊", m: "Gemini Crit", s: "Virgo CDmg", b: "Taurus Speed", st: "S", ae: "A+", sur: "B", use: L === "en" ? "Speed-runs" : "速通" },
      { name: L === "en" ? "⚡ Thunder Chain" : "⚡ 雷反應連鎖", m: "Sagittarius", s: "Capricorn", b: "Aries Burst", st: "A", ae: "S", sur: "B+", use: L === "en" ? "Elemental fights" : "元素 Boss" },
      { name: L === "en" ? "⚙️ Phys F2P" : "⚙️ 物理 (平民)", m: "Aries 3*", s: "Libra Sub", b: "Aquarius F2P", st: "A", ae: "B+", sur: "S", use: L === "en" ? "F2P, long-run" : "平民穩定通關" }
    ]));
    lines.push(h2({ "zh-CN": "二、配装 & 武器（主 C 优先级）", "zh-TW": "二、配裝 & 武器（主 C 優先級）", en: "2. Gear & Weapon Priority (Main DPS)" }));
    lines.push(bullets(L, [
      { "zh-CN": "武器：5★ T0 专武 > 通用 5★ T1 暴击武器 > 满精 4★ 高白值", "zh-TW": "武器：5★ T0 專武 > 通用 5★ T1 暴擊武器 > 滿精 4★ 高白值", en: "Weapon: T0 Signature 5★ > universal 5★ crit > R5 high-base 4★." },
      { "zh-CN": "主属性：主 C 优先暴击率 60%，爆伤 ≥ 180%，再考虑攻击力%。", "zh-TW": "主屬性：主 C 優先暴擊率 60%，爆傷 ≥ 180%，再考慮攻擊力%。", en: "Main stats: CR 60% first, CD ≥ 180%, then ATK%." },
      { "zh-CN": "副属性顺序：暴击率 > 爆伤 > 元素伤害加成 > 攻击力% > 速度。", "zh-TW": "副屬性順序：暴擊率 > 爆傷 > 元素傷害加成 > 攻擊力% > 速度。", en: "Substat priority: CR > CD > DMG% > ATK% > SPD." }
    ]));
    lines.push(h2({ "zh-CN": "三、天赋加点优先顺序", "zh-TW": "三、天賦加點優先順序", en: "3. Talent Point Priority" }));
    lines.push(numbered(L, [
      { "zh-CN": "主 C 输出天赋先点满 → 通常是 Q 爆发 > E 技能 > 普攻", "zh-TW": "主 C 輸出天賦先點滿 → 通常是 Q 爆發 > E 技能 > 普攻", en: "Main DPS first: Burst Q > Skill E > Normal Atk." },
      { "zh-CN": "副 C：E 技能和增益被动优先，爆发其次", "zh-TW": "副 C：E 技能和增益被動優先，爆發其次", en: "Sub-DPS: Skill E + Buff Passive > Burst Q." },
      { "zh-CN": "奶盾：治疗量/护盾被动 > 治疗技能 > 生存天赋", "zh-TW": "奶盾：治療量/護盾被動 > 治療技能 > 生存天賦", en: "Sustain: Heal/Shield Passive > Heal Skill > Survivability." }
    ]));
  }

  if (type === "boss") {
    lines.push(h2({ "zh-CN": "一、Boss 基本资料", "zh-TW": "一、Boss 基本資料", en: "1. Boss Overview" }));
    lines.push(renderTable(L, [
      { key: "k", label: { "zh-CN": "项目", "zh-TW": "項目", en: "Property" } },
      { key: "v", label: { "zh-CN": "内容", "zh-TW": "內容", en: "Value" } }
    ], [
      { k: L === "en" ? "Name" : "Boss 名稱", v: L === "zh-CN" ? `混沌深淵 第${(game.globalRank + 5) % 50 + 1}層 守衛 「${g.slice(0, 4)}・終焉」` :
          L === "zh-TW" ? `混沌深淵 第${(game.globalRank + 5) % 50 + 1}層 守衛「${g.slice(0, 4)}・終焉」` :
          `Abyss F${(game.globalRank + 5) % 50 + 1} Guardian — "${g.slice(0, 8)} the Terminated"` },
      { k: L === "en" ? "HP" : "血量", v: `${(28 + game.globalRank) * 500_000}_000`.replace("_", ",") },
      { k: L === "en" ? "Element" : "屬性", v: L === "zh-CN" ? "主属性：暗 · 弱点：火/雷 (抗 70% 冰)" :
          L === "zh-TW" ? "主屬性：暗 · 弱點：火/雷 (抗 70% 冰)" : "Dark — Weakness Fire/Thunder · Resist Ice 70%" },
      { k: L === "en" ? "DPS Check (3★)" : "3★ 輸出門檻", v: L === "en" ? "85k team DPS" : "隊伍總 DPS ≥ 85,000" },
      { k: L === "en" ? "Time Limit" : "時間限制", v: "10:00" }
    ]));
    lines.push(h2({ "zh-CN": "二、机制拆解（P1 / P2 / P3）", "zh-TW": "二、機制拆解（P1 / P2 / P3）", en: "2. Phase 1/2/3 Mechanic Breakdown" }));
    lines.push(h3({ "zh-CN": "Phase 1（100% → 70% HP）", "zh-TW": "Phase 1（100% → 70% HP）", en: "Phase I (100% → 70% HP)" }));
    lines.push(bullets(L, [
      { "zh-CN": "环形三连射：两侧有安全区，朝 11 点 / 1 点移动。", "zh-TW": "環形三連射：兩側有安全區，朝 11 點 / 1 點移動。", en: "Triple annular AoE: safe at 11-o'clock and 1-o'clock." },
      { "zh-CN": "投技抓取：被盯上的人立刻切盾，不要硬吃。", "zh-TW": "投技抓取：被盯上的人立刻切盾，不要硬吃。", en: "Grab: immediately swap to tank — never tank DPS." },
      { "zh-CN": "护盾条 (250k)：推荐用雷属性高频 E 技能破盾。", "zh-TW": "護盾條 (250k)：推薦用雷屬性高頻 E 技能破盾。", en: "Shield gauge 250k — Thunder E-skill spam." }
    ]));
    lines.push(h3({ "zh-CN": "Phase 2（70% → 35% HP）核心：陨石", "zh-TW": "Phase 2（70% → 35% HP）核心：隕石", en: "Phase II (70% → 35% HP) — Meteor Phase" }));
    lines.push(numbered(L, [
      { "zh-CN": "标记 4 颗陨石落点，每个落点安排一个人「单吃」，不要叠位。", "zh-TW": "標記 4 顆隕石落點，每個落點安排一個人「單吃」，不要疊位。", en: "Assign 4 meteor spots one-per-player — no stacking." },
      { "zh-CN": "12 秒内破完 4 颗才能开反击窗口，失败则全屏 90% 血的团灭技。", "zh-TW": "12 秒內破完 4 顆才能開反擊窗口，失敗則全屏 90% 血的團滅技。", en: "Break 4 meteors in 12s to open counter window. Missing = 90% HP raid-wide wipe." },
      { "zh-CN": "反击窗口开团队爆发（全 Q 齐开），这是整场最大的输出窗口。", "zh-TW": "反擊窗口開團隊爆發（全 Q 齊開），這是整場最大的輸出窗口。", en: "Counter window = ALL BURST Q — biggest DPS chunk of the fight." }
    ]));
    lines.push(h3({ "zh-CN": "Phase 3（35% → 0%）狂暴阶段", "zh-TW": "Phase 3（35% → 0%）狂暴階段", en: "Phase III (35% → 0%) — Enrage" }));
    lines.push(bullets(L, [
      { "zh-CN": "每秒 1% 生命流失光环，奶量必须持续抬血线 ≥ 70%", "zh-TW": "每秒 1% 生命流失光環，奶量必須持續抬血線 ≥ 70%", en: "1% HP raid-wide bleed aura per second — sustain needs to hold 70%+ HP." },
      { "zh-CN": "最后 10%：全屏秒杀前开无敌技能/全员复活药", "zh-TW": "最後 10%：全屏秒殺前開無敵技能/全員復活藥", en: "Last 10%: cast invuln skill or full-party revive potion right before the wipe cast." }
    ]));
  }

  if (type === "gacha") {
    lines.push(h2({ "zh-CN": "一、下个版本 2 个限定池总览", "zh-TW": "一、下個版本 2 個限定池總覽", en: "1. Next 2 Limited Banners Overview" }));
    lines.push(renderTable(L, [
      { key: "b", label: { "zh-CN": "卡池名", "zh-TW": "卡池名", en: "Banner" } },
      { key: "c", label: { "zh-CN": "UP 角色", "zh-TW": "UP 角色", en: "UP Unit" } },
      { key: "tier", label: { "zh-CN": "推荐级", "zh-TW": "推薦級", en: "Tier" } },
      { key: "f2p", label: { "zh-CN": "零氪", "zh-TW": "零氪", en: "F2P" } },
      { key: "md", label: { "zh-CN": "月卡党", "zh-TW": "月卡黨", en: "BP" } },
      { key: "wh", label: { "zh-CN": "中/重氪", "zh-TW": "中/重課", en: "Whale" } }
    ], [
      { b: L === "en" ? "A: 2026-Nov Banner 1" : "A: 版本上半", c: L === "en" ? "Leo (Limited) + Libra" : "獅子座 限定 + 天秤座", tier: "S", f2p: L === "en" ? "Must save" : "必抽（攒够 90 抽）", md: L === "en" ? "1+1 Pulls" : "抽 1+1 精 1", wh: L === "en" ? "Full const" : "满命 + 满精" },
      { b: L === "en" ? "B: 2026-Nov Banner 2" : "B: 版本下半", c: L === "en" ? "Sagittarius (Rerun)" : "射手座 (复刻)", tier: "A+", f2p: L === "en" ? "Skip if missing pity" : "无垫刀跳过", md: L === "en" ? "Pull if needed" : "缺主 C 再抽", wh: L === "en" ? "Refine weapon" : "补满精专武" }
    ]));
    lines.push(h2({ "zh-CN": "二、每档预算的抽卡分配方案", "zh-TW": "二、每檔預算的抽卡分配方案", en: "2. Per-Budget Pull-Count Allocation" }));
    lines.push(renderTable(L, [
      { key: "tier", label: { "zh-CN": "档位", "zh-TW": "檔次", en: "Tier" } },
      { key: "budget", label: { "zh-CN": "每月预算", "zh-TW": "每月預算", en: "Mo. Budget" } },
      { key: "source", label: { "zh-CN": "抽卡来源", "zh-TW": "抽卡來源", en: "Pull sources" } },
      { key: "pulls", label: { "zh-CN": "每版本抽数", "zh-TW": "每版本抽數", en: "Pulls / patch" } },
      { key: "strategy", label: { "zh-CN": "策略", "zh-TW": "策略", en: "Strategy" } }
    ], [
      { tier: "F2P", budget: L === "en" ? "$0" : "¥0", source: L === "en" ? "Daily + Weekly + Events" : "日常+周常+活动", pulls: "≈ 80", strategy: L === "en" ? "Skip > A banners only" : "只抽 S 级限定" },
      { tier: L === "en" ? "Welkin" : "小月卡", budget: L === "en" ? "$5" : "¥30", pulls: "≈ 140", source: L === "en" ? "Welkin + Dailies" : "月卡+日常", strategy: L === "en" ? "A+ banner + 1 pity-carry" : "A+ 卡池 + 垫一次保底" },
      { tier: L === "en" ? "BP+Welkin" : "月卡+通行证", budget: L === "en" ? "$25" : "¥180", pulls: "≈ 200", source: L === "en" ? "BP + Welkin" : "通行证+月卡", strategy: L === "en" ? "A+1, B if meta" : "抽 1+1，复刻看强度" },
      { tier: L === "en" ? "Mid Spender" : "中氪", budget: L === "en" ? "$150" : "¥1,080", pulls: "≈ 340", source: L === "en" ? "Monthly packs" : "月度礼包", strategy: L === "en" ? "2 constellations" : "抽 2+1（2 命 + 专武）" },
      { tier: L === "en" ? "Whale" : "重氪", budget: L === "en" ? "$600+" : "¥4,500+", pulls: "≈ 900", source: L === "en" ? "Top-ups" : "拉满充值", strategy: L === "en" ? "Max const + R5" : "满命 + 满精专武" }
    ]));
    lines.push(h2({ "zh-CN": "三、垫刀/保底记录表模板（复制到 Notion）", "zh-TW": "三、墊刀/保底記錄表模板", en: "3. Pity Carry Log Template (copy to Notion)" }));
    lines.push("```\n日期        卡池     抽數  結論   攜帶保底到下一池\n2026-09-10  BannerA  72   5★ Leo  0 (無墊刀)\n2026-09-25  BannerA  48   4★     48 (50/50 未中, 下池保底)\n2026-10-10  BannerB  ...\n```\n\n");
  }

  if (type === "faq") {
    lines.push(h2({ "zh-CN": "一、账号 & 数据互通", "zh-TW": "一、帳號 & 資料互通", en: "1. Account & Cross-Platform" }));
    const faqQ = [
      {
        q: { "zh-CN": "iOS 和安卓数据互通吗？", "zh-TW": "iOS 和安卓資料互通嗎？", en: "Are iOS and Android cross-save compatible?" },
        a: { "zh-CN": "✅ 完全互通，但需绑同一个 HoYoverse / 游戏账号；微信 QQ 登录的渠道服不互通。", "zh-TW": "✅ 完全互通，但需綁同一個 HoYoverse / 遊戲帳號；微信 QQ 登錄的渠道服不互通。", en: "✅ Yes — if you link to the same official publisher account. 3rd-party / WeChat / QQ channel servers do NOT cross-save." }
      },
      {
        q: { "zh-CN": "国际服和国服数据互通吗？", "zh-TW": "國際服和國服資料互通嗎？", en: "Global vs CN servers cross-save?" },
        a: { "zh-CN": "❌ 不互通，两个独立服务器。货币、活动时间、版本节奏都不一样。", "zh-TW": "❌ 不互通，兩個獨立伺服器。貨幣、活動時間、版本節奏都不一樣。", en: "❌ No. Separate clusters. Currency, events and patch cadence differ." }
      },
      {
        q: { "zh-CN": "怎么刷初始？刷初始值得吗？", "zh-TW": "怎麼刷初始？刷初始值得嗎？", en: "How to reroll? Is it worth it?" },
        a: { "zh-CN": "方法：注册多个游客号 → 过完教程（25 分钟） → 领取邮件赠送的新手 80 抽 → 未出 T0 就换号。\n建议：只有你时间非常充裕才刷，否则跳过，T1 阵容也能满星通关。", "zh-TW": "方法：註冊多個遊客號 → 過完教程（25 分鐘） → 領取郵件贈送的新手 80 抽 → 未出 T0 就換號。\n建議：只有你時間非常充裕才刷，否則跳過，T1 陣容也能滿星通關。", en: "Guest reroll route: ~25 min / account + 80 newbie pulls = 1 T0 shot. Recommended only if your time is free — T1 F2P comps can still 3★ all content." }
      },
      {
        q: { "zh-CN": "充值后多久到账？没到怎么办？", "zh-TW": "儲值後多久到帳？沒到怎麼辦？", en: "How long for purchases to post? Missing?" },
        a: { "zh-CN": "通常 1 分钟内。如果 30 分钟未到：① 退出账号重登 ② 检查 iTunes / Google 订单号 ③ 提交客服工单附订单截图。", "zh-TW": "通常 1 分鐘內。如果 30 分鐘未到：① 登出再登入 ② 檢查 iTunes / Google 訂單號 ③ 提交客服工單附訂單截圖。", en: "Within 1 min usually. If > 30 min: (1) Relog (2) copy iTunes/Google order-id (3) open a ticket with screenshot." }
      },
      {
        q: { "zh-CN": "手机发热严重/耗电快怎么办？", "zh-TW": "手機發熱嚴重/耗電快怎麼辦？", en: "Overheating / Battery drain?" },
        a: { "zh-CN": "① 设置 → 画质调中 + 60Hz 关动态光追 ② 关闭超采样 / 抗锯齿 ③ 边充别玩 ④ 安卓开性能模式 ⑤ 拆壳配散热背夹。", "zh-TW": "① 設定 → 畫質調中 + 60Hz 關動態光追 ② 關閉超取樣 / 抗鋸齒 ③ 邊充別玩 ④ 安卓開性能模式 ⑤ 拆殼配散熱背夾。", en: "(1) Settings: drop to medium + 60Hz, disable dynamic RT (2) Disable supersampling (3) No play while charging (4) Android perf mode (5) Cooler clip." }
      },
      {
        q: { "zh-CN": "模拟器推荐哪个？会不会被封号？", "zh-TW": "模擬器推薦哪個？會不會被封號？", en: "Best emulator? Ban risk?" },
        a: { "zh-CN": "推荐 MuMu 12 > BlueStacks 5 > LDPlayer 9。官方明确不封模拟器，但是不要开变速器 / 宏脚本，会被检测。", "zh-TW": "推薦 MuMu 12 > BlueStacks 5 > LDPlayer 9。官方明確不封模擬器，但是不要開變速器 / 巨集腳本，會被檢測。", en: "MuMu 12 ≥ BlueStacks 5 ≥ LDPlayer 9. Emulators are explicitly allowed — but do NOT use speedhacks / auto-combat macros; these get flagged instantly." }
      },
      {
        q: { "zh-CN": "PC 端和手机端互通吗？", "zh-TW": "PC 端和手機端互通嗎？", en: "Cross-save with PC client?" },
        a: { "zh-CN": "是的，PC/手机/Pad 三端互通。进度、氪金、成就、角色等级完全同步。", "zh-TW": "是的，PC/手機/Pad 三端互通。進度、儲值、成就、角色等級完全同步。", en: "Yes, PC + Mobile + Tablet. Progression, paid currency, achievements fully sync." }
      },
      {
        q: { "zh-CN": "最低/推荐配置？", "zh-TW": "最低/推薦配備？", en: "Min / Recommended specs?" },
        a: { "zh-CN": "安卓最低：骁龙 778G + 6GB RAM / 推荐：骁龙 8 Gen 2 + 12GB；iOS 最低：iPhone XS / 推荐：iPhone 13 或以上。", "zh-TW": "安卓最低：驍龍 778G + 6GB RAM / 推薦：驍龍 8 Gen 2 + 12GB；iOS 最低：iPhone XS / 推薦：iPhone 13 或以上。", en: "Android min: SD 778G + 6GB / rec: SD 8 Gen2 + 12GB. iOS min: iPhone XS / rec: iPhone 13+." }
      },
      {
        q: { "zh-CN": "PVP 和 PVE 的角色强度为什么不一样？", "zh-TW": "PVP 和 PVE 的角色強度為什麼不一樣？", en: "Why does tier list differ PvP vs PvE?" },
        a: { "zh-CN": "PVE 主 C 看重爆发 + 持续输出；PVP 核心是速度 + 先手控制 + 生存。同一个角色在两个榜单差异巨大（比如纯爆发弓手 PVE T0 但 PVP B 级）。", "zh-TW": "PVE 主 C 看重爆發 + 持續輸出；PVP 核心是速度 + 先手控制 + 生存。同一個角色在兩個榜單差異巨大。", en: "PvE values burst + sustained DPS; PvP values speed + turn-1 lockdown + survivability. Same character can be PvE T0 but PvP Tier B (e.g. pure-burst archers)." }
      },
      {
        q: { "zh-CN": "游戏无法启动/卡在加载页怎么办？", "zh-TW": "遊戲無法啟動/卡在載入頁怎麼辦？", en: "Game won't boot / stuck on load?" },
        a: { "zh-CN": "① 清后台重启 ② 切换 Wi-Fi / 5G ③ 清缓存（设置 → 应用 → 清缓存） ④ 重下资源包 ⑤ 更新系统 WebView（安卓常见）。", "zh-TW": "① 清後台重啟 ② 切換 Wi-Fi / 5G ③ 清快取（設定 → 應用 → 清快取） ④ 重下資源包 ⑤ 更新系統 WebView（安卓常見）。", en: "(1) Force close (2) Switch Wi-Fi / 5G (3) Clear cache (4) Redownload assets (5) Update System WebView on Android." }
      }
    ];
    for (let i = 0; i < faqQ.length; i++) {
      lines.push(`**Q${i + 1}. ${faqQ[i].q[L]}**\n\n`);
      lines.push(`${faqQ[i].a[L]}\n\n`);
    }
  }

  lines.push("---\n\n");
  lines.push(`> **${L === "en" ? "Disclaimer" : L === "zh-TW" ? "免責聲明" : "免责声明"}**: ${
    L === "en" ? `This guide was adapted from multiple community sources and AI-refined for patch ${version}. Specific numbers are for reference only.` :
    L === "zh-TW" ? `本攻略由多個來源彙整後以 AI 再優化重寫，適用 ${g} 版本 ${version}。數值僅供參考。` :
    `本攻略由多个来源汇总后以 AI 再优化改写，适用《${g}》版本 ${version}。数值仅供参考。`
  }\n`);

  // Always append a key-facts section so headings exist for TOC
  lines.push(`\n## ${L === "en" ? "Core Fact Sheet" : L === "zh-TW" ? "核心數據卡" : "核心数据卡"}\n\n`);
  lines.push(renderTable(L, [
    { key: "f", label: { "zh-CN": "指标", "zh-TW": "指標", en: "Metric" } },
    { key: "v", label: { "zh-CN": "数值", "zh-TW": "數值", en: "Value" } },
    { key: "u", label: { "zh-CN": "说明", "zh-TW": "說明", en: "Note" } }
  ], keyFacts.map((kf: any) => ({ f: kf.field, v: kf.value, u: kf.unit || "-" }))));

  return lines.join("");
}

// ======== MD render helpers ========
function bullets(L: "zh-CN" | "zh-TW" | "en", arr: I18n<string>[]) {
  return arr.map((x) => `- ${x[L]}\n`).join("") + "\n";
}
function numbered(L: "zh-CN" | "zh-TW" | "en", arr: I18n<string>[]) {
  return arr.map((x, i) => `${i + 1}. ${x[L]}\n`).join("") + "\n";
}
function renderTable(L: "zh-CN" | "zh-TW" | "en", cols: { key: string; label: I18n<string> }[], rows: Record<string, any>[]) {
  const hd = cols.map((c) => c.label[L]).join(" | ");
  const sep = cols.map(() => ":----").join(" | ");
  const body = rows
    .map((r) => cols.map((c) => (r[c.key] !== undefined && r[c.key] !== null ? String(r[c.key]).replace(/\|/g, "\\|") : "-")).join(" | "))
    .join("\n");
  return `| ${hd} |\n| ${sep} |\n| ${body} |\n\n`;
}

// ======== Media Helpers ========
function placeholderImg(w: number, h: number, hue: number, label: string) {
  const safeLabel = encodeURIComponent(label.slice(0, 8));
  return `https://placehold.co/${w}x${h}/hsl(${hue},70%,60%)/hsl(${(hue + 40) % 360},80%,30%)?text=${safeLabel}`;
}

// Public sample videos (Google sample CDN)
const SAMPLE_VIDEO_URLS = [
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4"
];

// ======== Seed Main ========
async function main() {
  console.log("🌱 Seeding Mobile Game Library — 100 games × 5 guides × 3 locales ...");

  // 1. Cleanup (dev only, but safe for first seed)
  await prisma.$transaction([
    prisma.guideI18n.deleteMany(),
    prisma.guideSource.deleteMany(),
    prisma.feedback.deleteMany(),
    prisma.guideMedia.deleteMany(),
    prisma.gameMedia.deleteMany(),
    prisma.guide.deleteMany(),
    prisma.gameI18n.deleteMany(),
    prisma.game.deleteMany()
  ]);

  let ok = 0;
  for (const gameSeed of GAME_LIBRARY) {
    // Compute scores & rating
    const taptap = Math.min(5, Math.max(3, gameSeed.rating));
    const ios = Math.min(5, Math.max(3.2, gameSeed.rating - 0.2 + ((gameSeed.iosRank ?? 50) < 30 ? 0.2 : 0)));
    const ratingCount = gameSeed.ratingCount;
    const globalScore = Math.round(gameSeed.score);

    // Screenshots
    const screenshots: string[] = [];
    for (let s = 0; s < gameSeed.screenshotCount; s++) {
      screenshots.push(placeholderImg(1280, 720, (gameSeed.bannerHue + s * 17) % 360, `${gameSeed.slug}-ss-${s}`));
    }
    const icon = placeholderImg(512, 512, gameSeed.iconHue, gameSeed.slug.slice(0, 2).toUpperCase());
    const banner = placeholderImg(1920, 1080, gameSeed.bannerHue, gameSeed.name.en);
    const thumb = placeholderImg(800, 600, (gameSeed.iconHue + 120) % 360, gameSeed.slug.slice(0, 3));

    // Videos
    const videos: string[] = [];
    for (let v = 0; v < gameSeed.extraVideoCount; v++) {
      videos.push(SAMPLE_VIDEO_URLS[(ok + v) % SAMPLE_VIDEO_URLS.length]);
    }
    const trailer = gameSeed.trailer ? SAMPLE_VIDEO_URLS[ok % SAMPLE_VIDEO_URLS.length] : null;

    const mediaMeta = {
      screenshotCount: gameSeed.screenshotCount,
      videoCount: (gameSeed.trailer ? 1 : 0) + gameSeed.extraVideoCount,
      durationSec: gameSeed.trailer ? 142 + (ok * 23) % 180 : undefined
    };

    // --- Write Game + GameI18n ---
    const gameCreated = await prisma.game.create({
      data: {
        slug: gameSeed.slug,
        platforms: JSON.stringify(gameSeed.platforms),
        categories: JSON.stringify(gameSeed.categories),
        globalScore,
        globalRank: gameSeed.globalRank as unknown as number,
        iosRank: gameSeed.iosRank as unknown as number,
        androidRank: gameSeed.androidRank as unknown as number,
        iosDownloads: Math.round(gameSeed.downloads * (0.4 + (Math.sin(ok) + 1) * 0.15)),
        androidDownloads: Math.round(gameSeed.downloads * (0.6 + (Math.cos(ok) + 1) * 0.15)),
        taptapRating: taptap,
        appStoreRating: ios,
        ratingCount,
        developer: gameSeed.dev,
        publisher: gameSeed.pub,
        releaseDate: gameSeed.releaseDate,
        taptapId: gameSeed.taptapId || `taptap-${100000 + ok}`,
        appStoreId: gameSeed.appStoreId || `app${1000000000 + ok * 13}`,
        iconUrl: icon,
        bannerUrl: banner,
        thumbnailUrl: thumb,
        screenshots: JSON.stringify(screenshots),
        videos: JSON.stringify(videos),
        trailerUrl: trailer,
        mediaMeta: JSON.stringify(mediaMeta),
        createdAt: new Date(Date.now() - ok * 3600 * 1000),
        i18n: {
          create: LOCALES.map((locale) => ({
            locale,
            name: gameSeed.name[locale],
            description: gameSeed.desc[locale]
          }))
        }
      }
    });

    // --- Write GameMedia rows (structured, for your agent reference) ---
    const mediaCreate: any[] = [];
    mediaCreate.push({
      type: "ICON",
      url: icon,
      storageKey: `games/${gameSeed.slug}/icon.webp`,
      sourceSite: "placehold",
      sourceUrl: icon,
      width: 512, height: 512, mimeType: "image/webp",
      orderIndex: 0, status: "ready", sizeBytes: 70_000
    });
    mediaCreate.push({
      type: "BANNER",
      url: banner,
      storageKey: `games/${gameSeed.slug}/banner.webp`,
      sourceSite: "placehold", sourceUrl: banner,
      width: 1920, height: 1080, mimeType: "image/webp", orderIndex: 0, status: "ready", sizeBytes: 240_000
    });
    mediaCreate.push({
      type: "THUMBNAIL",
      url: thumb, storageKey: `games/${gameSeed.slug}/thumb.webp`,
      sourceSite: "placehold", sourceUrl: thumb, width: 800, height: 600, mimeType: "image/webp", orderIndex: 0, status: "ready", sizeBytes: 110_000
    });
    screenshots.forEach((s, i) => {
      mediaCreate.push({
        type: "SCREENSHOT", url: s, storageKey: `games/${gameSeed.slug}/screenshots/${i + 1}.webp`,
        sourceSite: "placehold", sourceUrl: s,
        width: 1280, height: 720, mimeType: "image/webp",
        captionZh: `${gameSeed.name["zh-CN"]} 游戏截图 ${i + 1}`,
        captionEn: `${gameSeed.name.en} in-game screenshot ${i + 1}`,
        orderIndex: i, status: "ready", sizeBytes: 160_000
      });
    });
    if (trailer) {
      mediaCreate.push({
        type: "TRAILER", url: trailer, storageKey: `games/${gameSeed.slug}/media/trailer.mp4`,
        sourceSite: "sample", sourceUrl: trailer, posterUrl: banner,
        width: 1920, height: 1080, mimeType: "video/mp4",
        durationSec: 142 + (ok * 23) % 180, sizeBytes: 25_000_000,
        captionZh: `${gameSeed.name["zh-CN"]} 官方预告片`,
        captionEn: `${gameSeed.name.en} Official Trailer`,
        orderIndex: 0, status: "ready"
      });
    }
    videos.forEach((v, i) => {
      mediaCreate.push({
        type: "GAMEPLAY", url: v, storageKey: `games/${gameSeed.slug}/media/gameplay-${i + 1}.mp4`,
        sourceSite: "sample", sourceUrl: v,
        width: 1920, height: 1080, mimeType: "video/mp4",
        durationSec: 90 + ((ok + i) * 11) % 180, sizeBytes: 18_000_000,
        captionZh: `${gameSeed.name["zh-CN"]} 实机演示 ${i + 1}`,
        captionEn: `${gameSeed.name.en} gameplay clip ${i + 1}`,
        posterUrl: screenshots[(i + 2) % Math.max(1, screenshots.length)] || banner,
        orderIndex: i, status: "ready"
      });
    });
    await prisma.gameMedia.createMany({ data: mediaCreate.map((m) => ({ ...m, gameId: gameCreated.id })) });

    // --- 5 Guides ---
    for (let gi = 0; gi < 5; gi++) {
      const type = GUIDE_TYPES[gi];
      const publishedAt = new Date(Date.now() - (ok * 5 + gi) * 86400 * 1000);
      const guideSlug = `${gameSeed.slug}-${type}-guide-${(gi + 1)}`;
      const version = `${(gi % 4) + 1}.${(gi * 3) % 10}.${(gi * 7 + 1) % 50}`;

      const readMinutes = type === "faq" ? 12 : type === "team" ? 9 : type === "boss" ? 10 : type === "gacha" ? 8 : 7;
      const cover = placeholderImg(1600, 900, (gameSeed.iconHue + gi * 60) % 360, `${gameSeed.slug}-${type}`);
      const gallery: string[] = [];
      for (let gi2 = 0; gi2 < 3; gi2++) {
        gallery.push(placeholderImg(960, 540, (gameSeed.iconHue + gi * 60 + gi2 * 30) % 360, `g${gi}-${gi2}`));
      }

      const guideCreated = await prisma.guide.create({
        data: {
          gameId: gameCreated.id,
          slug: guideSlug,
          guideType: type,
          gameVersion: version,
          coverImage: cover,
          gallery: JSON.stringify(gallery),
          videoUrl: gi % 4 === 1 ? SAMPLE_VIDEO_URLS[(ok + gi + 3) % SAMPLE_VIDEO_URLS.length] : undefined,
          mediaMeta: JSON.stringify({ imgCount: gallery.length + 1, videoCount: gi % 4 === 1 ? 1 : 0, hasVideo: gi % 4 === 1 }),
          readMinutes,
          publishedAt,
          usefulCount: Math.round(500 - ok * 2 + (5 - gi) * 80),
          uselessCount: Math.round(30 - gi * 2 + (ok % 15)),
          updatedAt: new Date(publishedAt.getTime() + (gi + 1) * 86400 * 1000),
          i18n: {
            create: LOCALES.map((locale) => {
              const built = buildGuidePair(gameSeed, gi, locale);
              return {
                locale,
                title: built.title,
                tldr: built.tldr,
                content: built.content,
                keyFacts: JSON.stringify(built.keyFacts)
              };
            })
          },
          sources: {
            create: [
              {
                sourceName: `taptap-${type}-community-${ok}`,
                sourceUrl: `https://www.taptap.cn/app/${(100_000 + ok)}/topic/${gi * 13 + 1}`,
                sourceType: "community_guide",
                transformation: "llm_rewrite_v1_deepseek_v2",
                similarityPct: 25 + (ok * 7) % 15
              },
              {
                sourceName: `game8-${type}-${gameSeed.slug}`,
                sourceUrl: `https://game8.jp/${gameSeed.slug}/guides/${gi + 1}`,
                sourceType: "professional_guide",
                transformation: "llm_rewrite_v1_deepseek_v2",
                similarityPct: 28 + (ok * 5) % 12
              }
            ]
          }
        }
      });

      // GuideMedia records (structured)
      const guideMediaRows: any[] = [
        {
          guideId: guideCreated.id, kind: "image", url: cover,
          storageKey: `guides/${guideSlug}/cover.webp`,
          sourceSite: "placehold", sourceUrl: cover,
          width: 1600, height: 900, mimeType: "image/webp",
          captionZh: `${gameSeed.name["zh-CN"]} 攻略${gi + 1}封面`,
          captionEn: `${gameSeed.name.en} Guide ${gi + 1} cover`,
          contentRef: "guide-cover", orderIndex: 0, status: "ready", sizeBytes: 180_000
        }
      ];
      gallery.forEach((u, i) => {
        guideMediaRows.push({
          guideId: guideCreated.id, kind: "image", url: u,
          storageKey: `guides/${guideSlug}/gallery/${i + 1}.webp`,
          sourceSite: "placehold", sourceUrl: u,
          width: 960, height: 540, mimeType: "image/webp",
          captionZh: `${gameSeed.name["zh-CN"]} 攻略图集 ${i + 1}`,
          captionEn: `${gameSeed.name.en} guide gallery ${i + 1}`,
          orderIndex: i + 1, status: "ready", sizeBytes: 80_000
        });
      });
      if (guideCreated.videoUrl) {
        guideMediaRows.push({
          guideId: guideCreated.id, kind: "video", url: guideCreated.videoUrl,
          storageKey: `guides/${guideSlug}/walkthrough.mp4`,
          sourceSite: "sample", sourceUrl: guideCreated.videoUrl,
          width: 1920, height: 1080, mimeType: "video/mp4",
          durationSec: 180 + ok * 17 % 240,
          posterUrl: gallery[0] || cover,
          captionZh: `${gameSeed.name["zh-CN"]} 攻略${gi + 1}视频流程`,
          captionEn: `${gameSeed.name.en} guide ${gi + 1} walkthrough`,
          orderIndex: 100, status: "ready"
        });
      }
      await prisma.guideMedia.createMany({ data: guideMediaRows });
    }

    ok++;
    if (ok % 10 === 0) {
      console.log(`  … seeded ${ok}/100 games (${guideSlug(gameSeed)})`);
    }
  }

  // Analytics summary
  const gameCount = await prisma.game.count();
  const guideCount = await prisma.guide.count();
  const gameMediaCount = await prisma.gameMedia.count();
  const guideMediaCount = await prisma.guideMedia.count();
  console.log(`
====================================================
✅  Seed Complete
      Games:         ${gameCount}
      Guides:        ${guideCount}  (${guideCount / gameCount} per game)
      GameMedia:     ${gameMediaCount} (images + videos)
      GuideMedia:    ${guideMediaCount}
      Locales:       ${LOCALES.join(", ")}
====================================================
`);
}

function guideSlug(gs: GameSeed) { return gs.slug; }

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
