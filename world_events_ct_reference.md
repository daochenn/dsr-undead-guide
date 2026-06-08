# 黑暗之魂1 世界事件标记参考

来源: `1FRDarkSoulsRemastered.CT` — Cheat Engine 脚本
注: 以下偏移是**游戏运行时内存偏移**（ProgressionFlags 基址），非存档文件偏移，需要逆向转换成 `Pattern1 + 偏移量`

## Boss击杀 (Killed)

| Boss | 内存偏移 | bit | 存档已知偏移 |
|---|---|---|---|
| Asylum Demon | +1 | 7 | P+0x54 bit7 |
| Bell Gargoyles | +3 | 4 | P+0x56 bit4 |
| Capra Demon | +F73 | 1 | P+0xFC6 bit1 |
| Ceaseless Discharge | +1 | 3 | |
| Centipede Demon | +3C73 | 2 | |
| Chaos Witch Quelaag | +2 | 6 | P+0x55 bit6 |
| Crossbreed Priscilla | +3 | 3 | P+0x56 bit3 |
| Dark Sun Gwyndolin | +4673 | 3 | |
| Dark Sun Gwyndolin (2nd) | +4342 | 4 | |
| Demon Firesage | +3F30 | 5 | |
| Dragon Slayer Ornstein & Smough | +2 | 3 | P+0x55 bit3 |
| Four Kings | +2 | 2 | P+0x55 bit2 |
| Gaping Dragon | +3 | 5 | P+0x56 bit5 |
| Gravelord Nito | +3 | 0 | P+0x56 bit0 |
| Great Grey Wolf Sif | +3 | 2 | P+0x56 bit2 |
| Gwyn, Lord of Cinder | +2 | 0 | P+0x55 bit0 |
| Iron Golem | +2 | 4 | P+0x55 bit4 |
| Moonlight Butterfly | +2173 | 3 | |
| Pinwheel | +3 | 1 | P+0x56 bit1 |
| Seath the Scaleless | +2 | 1 | P+0x55 bit1 |
| Taurus Demon | +F73 | 2 | P+0xFC6 bit2 |
| Bed of Chaos | +2 | 5 | P+0x55 bit5 |
| Manus, Father of the Abyss | +1 | 6 | |
| Knight Artorias | +2303 | 6 | |

## 篝火 (Bonfires)

### Unlock Warps (传送解锁)
| 事件 | 内存偏移 | bit |
|---|---|---|
| Unlock Warps flag 1 | +5B | 1 |
| Unlock Warps flag 2 | +5B | 5 |

### 篝火传送点 (Bonfire Warps)
| 篝火名称 | 内存偏移 | bit |
|---|---|---|
| Firelink Shrine | +1A | 7 |
| Sunlight Altar | +1A | 2 |
| Anor Londo | +1A | 4 |
| Chamber of the Princess | +1A | 0 |
| The Abyss | +1A | 3 |
| Daughter of Chaos | +1A | 5 |
| Altar of the Gravelord | +1A | 1 |
| Stone Dragon | +1A | 6 |
| Darkmoon Tomb | +19 | 7 |
| Sanctuary Garden | +19 | 6 |
| Oolacile Sanctuary | +19 | 5 |
| Oolacile | +19 | 4 |
| Chasm of the Abyss | +19 | 3 |
| Oolacile Township Dungeon | +19 | 2 |
| Depths | +19 | 1 |
| Undead Parish | +19 | 0 |
| Painted World of Ariamis | +18 | 7 |
| Tomb of Giants | +18 | 6 |
| The Duke's Archives | +18 | 5 |
| Crystal Cave | +18 | 4 |

## 雾门 (Fog Gates)
| 名称 | 内存偏移 | bit |
|---|---|---|
| Crest of Artorias 1 | +D23D | 3 |
| Crest of Artorias 2 | +1E0E | 1 |
| Fog Gate 1 Asylum | +5A08 | 5 |
| Fog Gate 2 Burg | +F08 | 5 |
| Fog Gate 3 Burg | +F08 | 4 |
| Fog Gate 4 Blighttown | +3708 | 4 |
| Fog Gate 5 New Londo | +4B08 | 5 |
| Fog Gate 6 Sen Fortress | +4108 | 5 |
| Fog Gate 7 Sen Fortress | +4108 | 4 |
| Fog Gate 8 Anor Londo | +4308 | 5 |
| Fog Gate 9 Anor Londo | +4308 | 4 |
| Fog Gate 10 Catacombs | +2808 | 5 |
| Fog Gate 11 Tomb of Giants | +2D08 | 5 |
| Fog Gate 12 Duke Archives | +5009 | 4 |

## Firelink Shrine NPC状态
| NPC | 状态 | 内存偏移 | bit |
|---|---|---|---|
| Petrus of Thorolund | Enabled | +9A | 5 |
| | Attacked | +9B | 2 |
| | Dead 1 | +9B | 1 |
| | Dead 2 | +1444 | 6 |
| Pyromancer (Laurentius) | Enabled | +9C | 3 |
| | Attacked | +9C | 2 |
| | Dead 1 | +9C | 1 |
| | Dead 2 | +1440 | 7 |
| Reah of Thorolund | (enabled) | +96 | 4 |
| Nico of Thorolund | (enabled) | +98 | 2 |
| Vince of Thorolund | (enabled) | +99 | 4 |
| Big Hat Logan | Enabled | +88 | 3 |
| | Attacked | +8F | 7 |
| | Dead 1 | +8F | 6 |
| | Dead 2 | +1441 | 5 |
| Griggs of Vinheim | Enabled | +8D | 7 |
| | Attacked | +8D | 5 |
| | Dead 1 | +8D | 4 |
| | Dead 2 | +1441 | 4 |

## 复活/消仇恨 NPC
| NPC | 说明 | 内存偏移 | bit |
|---|---|---|---|
| Blacksmith Andre | 复活相关 | +AB | 5,6,7 |
| | (其他位置) | +F42 | 4 |
| Quelaag's Sister | 复活相关 | +A1 | 7 |
| | (其他位置) | +3442 | 6 |
| | | +3983 | 7 |
| | | +3767 | 7 |
| | Disable Bonfire | +12 | 3 |
| Quelana of Izalith | Is Killed | +3442 | 4 |
| | Disable Talk | +A7 | 0 |
| | Can Talk | +A7 | 4 |
| Vamos | Set to 0 | +A9 | 1 |
| | Set to 1 (Optional) | +A9 | 7 |
| | Set to 0 | +2842 | 7 |
| Giant Blacksmith | Set to 0 | +AE | 5 |
| | Set to 1 (Optional) | +A9 | 7 |
| | Set to 0 | +4642 | 7 |
| | Set to 0 | +4988 | 3 |
| Oswald | Set to 0 | +F42 | 0 |
| | Byte 值 | +D4 | Byte |

## Misc (杂项)
| 事件 | 说明 | 内存偏移 | bit |
|---|---|---|---|
| Credits/Restart [1] | 显示制作人员并重启 | +1 | 2 |
| Credits/Restart [2] | 显示制作人员并重启 | +1 | 3 |
| Anor Londo Dark | 0=光明 1=黑暗 | +4631 | 7 |
| Lava Solidified | 岩浆凝固(击杀持续溃烂后) | +3C67 | 7 |
| Access Bottomless Box | 解锁无限箱子 | +23 | 5 |
| Repair Equipment | 可修理装备 | +1C | 3 |
| Reinforce Weapon | 可强化武器 | +1C | 5 |
| Reinforce Armor | 可强化盔甲 | +1C | 4 |
| Rite of Kindling | 获注火秘仪 | +3 | 1 |
| Elevators | 电梯相关 | +0 | 2 |

## 钟 (Bell)
| 钟 | 内存偏移 | 类型 |
|---|---|---|
| Bell#1 | +180, +1D9, +1DA, +124B, +1254 | Byte (多个位置) |
| Bell#2 | +1D1, +1D2, +240~+24A, +2C1~+2CA, +148F, +14F3, +3A1A, +441A | Byte (多个位置) |

---

## 如何使用

1. 用 Cheat Engine 打开 DSR 并附加 `ProgressionFlags` 符号
2. 在游戏中触发事件（如敲钟、击杀 Boss）
3. 对比触发前后的内存数据变化
4. 记录变化的字节 → 这就是存档中对应的偏移位置

已知对照关系示例:
- 内存偏移 +1~+3 → 存档 `Pattern1 + 0x54~0x56`（Boss击杀标志区域）
- 内存偏移 +F73 → 存档 `Pattern1 + 0xFC6`（Capra/Taurus区域）
