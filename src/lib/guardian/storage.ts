/** localStorage seguro (nunca lanza excepción, patrón de la app original). */

export const safeLocalStorage = {
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* noop */
    }
  },
  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      /* noop */
    }
  },
};

export const LS_KEYS = {
  topic: "gsos.topic",
  name: "gsos.name",
  pin: "gsos.pin",
  keyword: "gsos.keyword",
  voiceOn: "gsos.voiceOn",
  sirenOn: "gsos.sirenOn",
  sirenSecs: "gsos.sirenSecs",
  ciOn: "gsos.ciOn",
  ciIntervalMin: "gsos.ciIntervalMin",
  ciGraceMin: "gsos.ciGraceMin",
} as const;
