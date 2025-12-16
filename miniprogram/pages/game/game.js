// pages/game/game.js
Page({
  data: {
    levels: [
      { id: 1, name: '第1关', size: 3, pairs: 4, label: '3×3' },
      { id: 2, name: '第2关', size: 4, pairs: 8, label: '4×4' },
      { id: 3, name: '第3关', size: 5, pairs: 12, label: '5×5' },
      { id: 4, name: '第4关', size: 6, pairs: 18, label: '6×6' }
    ],
    unlockedLevels: [1],
    currentLevel: null,
    cards: [],
    matchedPairs: 0,
    isPlaying: false,
    flippedIndices: [],
    showWin: false,
    emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🐣']
  },

  onLoad() {
    const unlocked = wx.getStorageSync('gameUnlockedLevels') || [1];
    this.setData({ unlockedLevels: unlocked });
  },

  selectLevel(e) {
    const levelId = e.currentTarget.dataset.id;
    if (!this.data.unlockedLevels.includes(levelId)) return;

    const level = this.data.levels.find(l => l.id === levelId);
    this.startLevel(level);
  },

  startLevel(level) {
    const cards = this.generateCards(level.pairs);
    this.setData({
      currentLevel: level,
      cards: cards,
      matchedPairs: 0,
      isPlaying: true,
      flippedIndices: [],
      showWin: false
    });
  },

  generateCards(pairsCount) {
    let selectedEmojis = this.data.emojis.slice(0, pairsCount);
    let cards = [];
    selectedEmojis.forEach((emoji, index) => {
      cards.push({ id: index * 2, content: emoji, flipped: false, matched: false });
      cards.push({ id: index * 2 + 1, content: emoji, flipped: false, matched: false });
    });
    
    // Shuffle
    for (let i = cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    return cards;
  },

  onCardTap(e) {
    const index = e.currentTarget.dataset.index;
    const cards = this.data.cards;
    const flippedIndices = this.data.flippedIndices;

    if (cards[index].flipped || cards[index].matched || flippedIndices.length >= 2) return;

    // Flip card
    cards[index].flipped = true;
    flippedIndices.push(index);
    this.setData({ cards, flippedIndices });

    if (flippedIndices.length === 2) {
      setTimeout(() => {
        this.checkMatch();
      }, 800);
    }
  },

  checkMatch() {
    const { cards, flippedIndices, matchedPairs, currentLevel } = this.data;
    const idx1 = flippedIndices[0];
    const idx2 = flippedIndices[1];
    const card1 = cards[idx1];
    const card2 = cards[idx2];

    let newMatchedPairs = matchedPairs;

    if (card1.content === card2.content) {
      card1.matched = true;
      card2.matched = true;
      newMatchedPairs++;
    } else {
      card1.flipped = false;
      card2.flipped = false;
    }

    this.setData({
      cards,
      flippedIndices: [],
      matchedPairs: newMatchedPairs
    });

    if (newMatchedPairs === currentLevel.pairs) {
      this.handleWin();
    }
  },

  handleWin() {
    this.setData({ showWin: true });
    
    // Unlock next level
    const nextLevelId = this.data.currentLevel.id + 1;
    let unlocked = this.data.unlockedLevels;
    if (!unlocked.includes(nextLevelId) && nextLevelId <= 4) {
      unlocked.push(nextLevelId);
      wx.setStorageSync('gameUnlockedLevels', unlocked);
      this.setData({ unlockedLevels: unlocked });
    }
  },

  backToLevels() {
    this.setData({ isPlaying: false, showWin: false });
  },
  
  nextLevel() {
      const nextId = this.data.currentLevel.id + 1;
      const nextLevel = this.data.levels.find(l => l.id === nextId);
      if (nextLevel) {
          this.startLevel(nextLevel);
      } else {
          wx.showToast({ title: '已通关所有关卡！', icon: 'success' });
          this.backToLevels();
      }
  },

  restart() {
      this.startLevel(this.data.currentLevel);
  }
});

