export const CATEGORIES = {
  farm: {
    label: '农场',
    icon: '🐔',
    color: '#FFB84D'
  },
  zoo: {
    label: '动物园',
    icon: '🦁',
    color: '#7BC876'
  },
  ocean: {
    label: '海洋馆',
    icon: '🐬',
    color: '#6ECFF6'
  }
};

// 每个动物的 sound 字段指向 public/sounds/ 下的 mp3 文件。
// 缺失的文件会被忽略（只播 TTS，不会报错）。补全后即可听到真实叫声。
export const ANIMALS = [
  // 农场动物
  { id: 'farm-1',  name: '小鸡',     category: 'farm', emoji: '🐔', sound: '/sounds/farm-1.mp3' },
  { id: 'farm-2',  name: '小狗',     category: 'farm', emoji: '🐶', sound: '/sounds/farm-2.mp3' },
  { id: 'farm-3',  name: '小猫',     category: 'farm', emoji: '🐱', sound: '/sounds/farm-3.mp3' },
  { id: 'farm-4',  name: '奶牛',     category: 'farm', emoji: '🐄', sound: '/sounds/farm-4.mp3' },
  { id: 'farm-5',  name: '绵羊',     category: 'farm', emoji: '🐑', sound: '/sounds/farm-5.mp3' },
  { id: 'farm-6',  name: '小猪',     category: 'farm', emoji: '🐷', sound: '/sounds/farm-6.mp3' },
  { id: 'farm-7',  name: '马儿',     category: 'farm', emoji: '🐎', sound: '/sounds/farm-7.mp3' },
  { id: 'farm-8',  name: '鸭子',     category: 'farm', emoji: '🦆', sound: '/sounds/farm-8.mp3' },
  { id: 'farm-9',  name: '大白鹅',   category: 'farm', emoji: '🦢', sound: '/sounds/farm-9.mp3' },
  { id: 'farm-11', name: '小毛驴',   category: 'farm', emoji: '🫏', sound: '/sounds/farm-11.mp3' },
  { id: 'farm-12', name: '山羊',     category: 'farm', emoji: '🐐', sound: '/sounds/farm-12.mp3' },
  { id: 'farm-13', name: '公鸡',     category: 'farm', emoji: '🐓', sound: '/sounds/farm-13.mp3' },
  { id: 'farm-14', name: '青蛙',     category: 'farm', emoji: '🐸', sound: '/sounds/farm-14.mp3' },
  { id: 'farm-15', name: '蜜蜂',     category: 'farm', emoji: '🐝', sound: '/sounds/farm-15.mp3' },

  // 动物园动物
  { id: 'zoo-1',  name: '狮子',     category: 'zoo', emoji: '🦁', sound: '/sounds/zoo-1.mp3' },
  { id: 'zoo-2',  name: '大象',     category: 'zoo', emoji: '🐘', sound: '/sounds/zoo-2.mp3' },
  { id: 'zoo-3',  name: '长颈鹿',   category: 'zoo', emoji: '🦒', sound: '/sounds/zoo-3.mp3' },
  { id: 'zoo-4',  name: '熊猫',     category: 'zoo', emoji: '🐼', sound: '/sounds/zoo-4.ogg' },
  { id: 'zoo-5',  name: '猴子',     category: 'zoo', emoji: '🐵', sound: '/sounds/zoo-5.mp3' },
  { id: 'zoo-6',  name: '老虎',     category: 'zoo', emoji: '🐯', sound: '/sounds/zoo-6.mp3' },
  { id: 'zoo-7',  name: '鳄鱼',     category: 'zoo', emoji: '🐊', sound: '/sounds/zoo-7.mp3' },
  { id: 'zoo-8',  name: '斑马',     category: 'zoo', emoji: '🦓', sound: '/sounds/zoo-8.mp3' },
  { id: 'zoo-9',  name: '袋鼠',     category: 'zoo', emoji: '🦘', sound: '/sounds/zoo-9.mp3' },
  { id: 'zoo-10', name: '河马',     category: 'zoo', emoji: '🦛', sound: '/sounds/zoo-10.mp3' },
  { id: 'zoo-11', name: '孔雀',     category: 'zoo', emoji: '🦚', sound: '/sounds/zoo-11.mp3' },
  { id: 'zoo-12', name: '企鹅',     category: 'zoo', emoji: '🐧', sound: '/sounds/zoo-12.mp3' },
  { id: 'zoo-13', name: '小熊',     category: 'zoo', emoji: '🐻', sound: '/sounds/zoo-13.mp3' },
  { id: 'zoo-14', name: '小狐狸',   category: 'zoo', emoji: '🦊', sound: '/sounds/zoo-14.mp3' },
  { id: 'zoo-15', name: '狼',       category: 'zoo', emoji: '🐺', sound: '/sounds/zoo-15.mp3' },
  { id: 'zoo-16', name: '鹦鹉',     category: 'zoo', emoji: '🦜', sound: '/sounds/zoo-16.mp3' },
  { id: 'zoo-17', name: '大猩猩',   category: 'zoo', emoji: '🦍', sound: '/sounds/zoo-17.mp3' },
  { id: 'zoo-18', name: '骆驼',     category: 'zoo', emoji: '🐪', sound: '/sounds/zoo-18.mp3' },
  { id: 'zoo-19', name: '松鼠',     category: 'zoo', emoji: '🐿️', sound: '/sounds/zoo-19.mp3' },
  { id: 'zoo-20', name: '恐龙',     category: 'zoo', emoji: '🦖', sound: '/sounds/zoo-20.mp3' },
  { id: 'zoo-21', name: '小鹿',     category: 'zoo', emoji: '🦌', sound: '/sounds/zoo-21.mp3' },
  { id: 'zoo-22', name: '老鹰',     category: 'zoo', emoji: '🦅', sound: '/sounds/zoo-22.mp3' },

  // 海洋馆动物
  { id: 'ocean-1',  name: '海豚',   category: 'ocean', emoji: '🐬', sound: '/sounds/ocean-1.mp3' },
  { id: 'ocean-2',  name: '鲸鱼',   category: 'ocean', emoji: '🐋', sound: '/sounds/ocean-2.mp3' },
  { id: 'ocean-13', name: '海豹',   category: 'ocean', emoji: '🦭', sound: '/sounds/ocean-13.mp3' },
  { id: 'ocean-14', name: '虎鲸',   category: 'ocean', emoji: '🐳', sound: '/sounds/ocean-14.mp3' }
];

export const getAnimalColor = (animal) =>
  CATEGORIES[animal.category]?.color ?? '#FFB84D';
