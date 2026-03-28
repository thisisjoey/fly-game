const COINS_KEY = 'skystriker_coins';
const PURCHASED_KEY = 'skystriker_purchased';
const SELECTED_JET_KEY = 'skystriker_selected_jet';

const JETS = [
  { id: 'storm_eagle', name: 'Storm Eagle', description: 'Default interceptor. Balanced stats.', price: 0, color: 0x00ccff },
  { id: 'neon_phantom', name: 'Neon Phantom', description: 'Stealth racer. Higher top speed.', price: 5000, color: 0xff00aa },
  { id: 'dark_matter', name: 'Dark Matter', description: 'Heavy bruiser. Extra shields.', price: 15000, color: 0x8800ff },
  { id: 'solar_wind', name: 'Solar Wind', description: 'Elite racer. Maximum performance.', price: 25000, color: 0xffcc00 }
];

const UPGRADES = [
  { id: 'speed_1', name: 'Speed I', description: '+10 base speed', price: 2000, category: 'upgrade' },
  { id: 'shield_1', name: 'Shield I', description: 'Start with a shield each race', price: 3000, category: 'upgrade' },
  { id: 'boost_1', name: 'Boost Power I', description: 'Boost multiplier increased to 2x', price: 2500, category: 'upgrade' }
];

export class StoreSystem {
  constructor() {
    this.coins = 1000000;
    this.purchased = new Set(['storm_eagle']);
    this.selectedJet = 'storm_eagle';
    this.loadFromStorage();
  }

  loadFromStorage() {
    try {
      const coins = localStorage.getItem(COINS_KEY);
      if (coins !== null) {
        this.coins = parseInt(coins);
        if (isNaN(this.coins)) this.coins = 1000000;
      }

      const purchased = localStorage.getItem(PURCHASED_KEY);
      if (purchased) {
        const arr = JSON.parse(purchased);
        this.purchased = new Set(arr);
        this.purchased.add('storm_eagle'); // always owned
      }

      const jet = localStorage.getItem(SELECTED_JET_KEY);
      if (jet && this.purchased.has(jet)) {
        this.selectedJet = jet;
      }
    } catch (e) {
      this.coins = 1000000;
      this.purchased = new Set(['storm_eagle']);
      this.selectedJet = 'storm_eagle';
    }
  }

  saveToStorage() {
    try {
      localStorage.setItem(COINS_KEY, String(this.coins));
      localStorage.setItem(PURCHASED_KEY, JSON.stringify([...this.purchased]));
      localStorage.setItem(SELECTED_JET_KEY, this.selectedJet);
    } catch (e) {}
  }

  getCoins() {
    return this.coins;
  }

  addCoins(amount) {
    this.coins += amount;
    this.saveToStorage();
  }

  buyItem(id) {
    if (this.purchased.has(id)) return { success: false, reason: 'Already owned' };

    const item = [...JETS, ...UPGRADES].find(i => i.id === id);
    if (!item) return { success: false, reason: 'Item not found' };
    if (this.coins < item.price) return { success: false, reason: 'Not enough coins' };

    this.coins -= item.price;
    this.purchased.add(id);
    this.saveToStorage();
    return { success: true };
  }

  selectJet(id) {
    if (!this.purchased.has(id)) return false;
    this.selectedJet = id;
    this.saveToStorage();
    return true;
  }

  getSelectedJetColor() {
    const jet = JETS.find(j => j.id === this.selectedJet);
    return jet ? jet.color : 0x00ccff;
  }

  getJets() {
    return JETS.map(j => ({
      ...j,
      purchased: this.purchased.has(j.id),
      selected: this.selectedJet === j.id
    }));
  }

  getUpgrades() {
    return UPGRADES.map(u => ({
      ...u,
      purchased: this.purchased.has(u.id)
    }));
  }

  isPurchased(id) {
    return this.purchased.has(id);
  }

  getPurchasedUpgrades() {
    return UPGRADES.filter(u => this.purchased.has(u.id)).map(u => u.id);
  }
}
