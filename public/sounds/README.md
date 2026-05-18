# 动物叫声资源

播放顺序由 `src/services/audioService.js` 控制：
**预生成 TTS "xxx怎么叫"（`tts/<id>.mp3`） → 真实叫声（`<id>.mp3/ogg`）**

构建后这些文件会被 Vite 打进 `dist/`，再由 `npx cap sync android` 拷进 APK，**离线可播**。

## 收录的 28 种动物

均有真实叫声 + 预生成的可爱 TTS。

- 农场 (11)：小鸡、小狗、小猫、奶牛、绵羊、小猪、马儿、鸭子、大白鹅、小毛驴、山羊
- 动物园 (14)：狮子、大象、长颈鹿、熊猫、猴子、老虎、鳄鱼、斑马、袋鼠、河马、孔雀、企鹅、小熊、小狐狸
- 海洋馆 (3)：海豚、鲸鱼、海豹

## 文件来源（均开源 / 公共领域）

- 农场 + 狮子大象孔雀 → [ztroop/animal-sounds](https://github.com/ztroop/animal-sounds)（MIT）
- 多数动物园动物 + 海豚 + 鲸鱼 → [orkuneyb/animal_sounds_flutter](https://github.com/orkuneyb/animal_sounds_flutter)
- 河马、海豹 → [robbalmbra1/AnimalSounds](https://github.com/robbalmbra1/AnimalSounds)
- `zoo-4.ogg`（熊猫）→ [Wikimedia Commons / Giant_panda_twittering.ogg](https://commons.wikimedia.org/wiki/File:Giant_panda_twittering.ogg)（CC-BY-SA）
- `tts/*.mp3` → Microsoft Edge 免费 TTS（`zh-CN-XiaoyiNeural`，活泼女声），由 `scripts/generate_tts.py` 生成

## 重新生成 / 调整 TTS

想换可爱声音 / 加新动物 → 改 `scripts/generate_tts.py` 顶部常量，然后：

```bash
pip install edge-tts
python scripts/generate_tts.py
npm run build
npx cap sync android
```
