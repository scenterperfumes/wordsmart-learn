export const OPEN_CARDS = 10;
export const WORD_BATCH = 50;
export const SYNC_INTERVAL = 120000;
export const TRIAL_SECONDS = 300;
export const bonusForScore = (score: number) => score >= 15 ? 1 : 0;
export const packageMonths = (base: number, earned: boolean) => base + (earned ? 1 : 0);
export const isMastered = (word: string, mastered: Record<string, unknown>) => Object.hasOwn(mastered, word);
export class ActionLimiter {
  timestamps: number[] = [];
  blockedUntil = 0;
  record(now: number) {
    if (now < this.blockedUntil) return false;
    this.timestamps = this.timestamps.filter(t => now - t < 5000);
    this.timestamps.push(now);
    if (this.timestamps.length >= 20) { this.blockedUntil = now + 10000; this.timestamps = []; return false; }
    return true;
  }
}