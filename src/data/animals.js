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

export const ANIMALS = [
  // 农场动物
  { id: 'farm-1', name: '小鸡', category: 'farm', emoji: '🐔' },
  { id: 'farm-2', name: '小狗', category: 'farm', emoji: '🐶' },
  { id: 'farm-3', name: '小猫', category: 'farm', emoji: '🐱' },
  { id: 'farm-4', name: '奶牛', category: 'farm', emoji: '🐄' },
  { id: 'farm-5', name: '绵羊', category: 'farm', emoji: '🐑' },
  { id: 'farm-6', name: '小猪', category: 'farm', emoji: '🐷' },
  { id: 'farm-7', name: '马儿', category: 'farm', emoji: '🐴' },
  { id: 'farm-8', name: '鸭子', category: 'farm', emoji: '🦆' },
  { id: 'farm-9', name: '大白鹅', category: 'farm', emoji: '🦢' },
  { id: 'farm-10', name: '小兔子', category: 'farm', emoji: '🐰' },
  { id: 'farm-11', name: '小毛驴', category: 'farm', emoji: '🐴' },
  { id: 'farm-12', name: '山羊', category: 'farm', emoji: '🐐' },

  // 动物园动物
  { id: 'zoo-1', name: '狮子', category: 'zoo', emoji: '🦁' },
  { id: 'zoo-2', name: '大象', category: 'zoo', emoji: '🐘' },
  { id: 'zoo-3', name: '长颈鹿', category: 'zoo', emoji: '🦒' },
  { id: 'zoo-4', name: '熊猫', category: 'zoo', emoji: '🐼' },
  { id: 'zoo-5', name: '猴子', category: 'zoo', emoji: '🐵' },
  { id: 'zoo-6', name: '老虎', category: 'zoo', emoji: '🐯' },
  { id: 'zoo-7', name: '鳄鱼', category: 'zoo', emoji: '🐊' },
  { id: 'zoo-8', name: '斑马', category: 'zoo', emoji: '🦓' },
  { id: 'zoo-9', name: '袋鼠', category: 'zoo', emoji: '🦘' },
  { id: 'zoo-10', name: '河马', category: 'zoo', emoji: '🦛' },
  { id: 'zoo-11', name: '孔雀', category: 'zoo', emoji: '🦚' },
  { id: 'zoo-12', name: '企鹅', category: 'zoo', emoji: '🐧' },
  { id: 'zoo-13', name: '小熊', category: 'zoo', emoji: '🐻' },
  { id: 'zoo-14', name: '小狐狸', category: 'zoo', emoji: '🦊' },

  // 海洋馆动物
  { id: 'ocean-1', name: '海豚', category: 'ocean', emoji: '🐬' },
  { id: 'ocean-2', name: '鲸鱼', category: 'ocean', emoji: '🐋' },
  { id: 'ocean-3', name: '海狮', category: 'ocean', emoji: '🦭' },
  { id: 'ocean-4', name: '章鱼', category: 'ocean', emoji: '🐙' },
  { id: 'ocean-5', name: '鲨鱼', category: 'ocean', emoji: '🦈' },
  { id: 'ocean-6', name: '海龟', category: 'ocean', emoji: '🐢' },
  { id: 'ocean-7', name: '海马', category: 'ocean', emoji: '🐴' },
  { id: 'ocean-8', name: '海星', category: 'ocean', emoji: '⭐' },
  { id: 'ocean-9', name: '水母', category: 'ocean', emoji: '🪼' },
  { id: 'ocean-10', name: '螃蟹', category: 'ocean', emoji: '🦀' },
  { id: 'ocean-11', name: '龙虾', category: 'ocean', emoji: '🦞' },
  { id: 'ocean-12', name: '海象', category: 'ocean', emoji: '🦭' },
  { id: 'ocean-13', name: '海豹', category: 'ocean', emoji: '🦭' }
];

export const getAnimalsByCategory = (category) => {
  return ANIMALS.filter(animal => animal.category === category);
};
