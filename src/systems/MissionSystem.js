const STORAGE_KEY = 'skystriker_missions';
const WINS_KEY = 'skystriker_consecutive_wins';

const DEFAULT_MISSIONS = [
  {
    id: 'first_flight',
    name: 'First Flight',
    description: 'Complete 1 race',
    reward: 500,
    completed: false,
    progress: 0,
    maxProgress: 1
  },
  {
    id: 'speed_demon',
    name: 'Speed Demon',
    description: 'Finish in 1st place',
    reward: 1000,
    completed: false,
    progress: 0,
    maxProgress: 1
  },
  {
    id: 'survivor',
    name: 'Survivor',
    description: 'Win a race without dying',
    reward: 2000,
    completed: false,
    progress: 0,
    maxProgress: 1
  },
  {
    id: 'power_hungry',
    name: 'Power Hungry',
    description: 'Collect 10 power-ups in one race',
    reward: 1500,
    completed: false,
    progress: 0,
    maxProgress: 10
  },
  {
    id: 'the_ace',
    name: 'The Ace',
    description: 'Win 3 consecutive races',
    reward: 5000,
    completed: false,
    progress: 0,
    maxProgress: 3
  }
];

export class MissionSystem {
  constructor() {
    this.missions = [];
    this.consecutiveWins = 0;
    this.loadFromStorage();
  }

  loadFromStorage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const savedData = JSON.parse(saved);
        this.missions = DEFAULT_MISSIONS.map(def => {
          const saved = savedData.find(s => s.id === def.id);
          return saved ? { ...def, ...saved } : { ...def };
        });
      } else {
        this.missions = DEFAULT_MISSIONS.map(m => ({ ...m }));
      }
      const wins = localStorage.getItem(WINS_KEY);
      this.consecutiveWins = wins ? parseInt(wins) : 0;
    } catch (e) {
      this.missions = DEFAULT_MISSIONS.map(m => ({ ...m }));
      this.consecutiveWins = 0;
    }
  }

  saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.missions));
      localStorage.setItem(WINS_KEY, String(this.consecutiveWins));
    } catch (e) {}
  }

  checkMissions(raceStats) {
    // raceStats: { position, powerUpsCollected, died, won }
    let coinsEarned = 0;
    const newlyCompleted = [];

    this.missions.forEach(mission => {
      if (mission.completed) return;

      let justCompleted = false;

      switch (mission.id) {
        case 'first_flight':
          mission.progress = 1;
          justCompleted = true;
          break;

        case 'speed_demon':
          if (raceStats.position === 1) {
            mission.progress = 1;
            justCompleted = true;
          }
          break;

        case 'survivor':
          if (raceStats.won && !raceStats.died) {
            mission.progress = 1;
            justCompleted = true;
          }
          break;

        case 'power_hungry':
          mission.progress = Math.min(mission.maxProgress, raceStats.powerUpsCollected);
          if (mission.progress >= mission.maxProgress) {
            justCompleted = true;
          }
          break;

        case 'the_ace':
          if (raceStats.won) {
            this.consecutiveWins++;
          } else {
            this.consecutiveWins = 0;
          }
          mission.progress = Math.min(mission.maxProgress, this.consecutiveWins);
          if (mission.progress >= mission.maxProgress) {
            justCompleted = true;
          }
          break;
      }

      if (justCompleted) {
        mission.completed = true;
        coinsEarned += mission.reward;
        newlyCompleted.push(mission);
      }
    });

    this.saveToStorage();
    return { coinsEarned, newlyCompleted };
  }

  getMissions() {
    return this.missions.map(m => ({ ...m }));
  }

  resetProgress() {
    this.missions = DEFAULT_MISSIONS.map(m => ({ ...m }));
    this.consecutiveWins = 0;
    this.saveToStorage();
  }
}
