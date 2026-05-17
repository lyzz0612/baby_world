export const audioService = {
  speak(text) {
    return new Promise((resolve, reject) => {
      if (!window.speechSynthesis) {
        console.warn('Speech synthesis not supported');
        resolve();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN';
      utterance.rate = 0.8;
      utterance.pitch = 1.2;

      utterance.onend = () => {
        setTimeout(resolve, 200);
      };

      utterance.onerror = () => {
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    });
  },

  async playAnimalSound(animalName) {
    await this.speak(`${animalName}怎么叫`);
    await this.delay(500);
  },

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};
