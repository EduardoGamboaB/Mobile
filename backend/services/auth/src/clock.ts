/** Reloj inyectable: permite testear expiraciones (mfaToken, state SSO, TOTP). */
export interface Clock {
  now(): number;
}

export const systemClock: Clock = { now: () => Date.now() };

export class ManualClock implements Clock {
  constructor(private ms: number) {}
  now(): number {
    return this.ms;
  }
  advance(ms: number): void {
    this.ms += ms;
  }
  set(ms: number): void {
    this.ms = ms;
  }
}
