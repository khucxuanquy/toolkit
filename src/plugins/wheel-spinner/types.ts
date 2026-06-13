export interface WheelEntry {
  id: string;
  label: string;
  /** Relative weight (>= 1). Higher = larger slice / more likely. */
  weight: number;
}

export interface WheelPreset {
  id: string;
  name: string;
  entries: WheelEntry[];
  savedAt: number;
}

export interface WheelSettings {
  /** Remove the winning entry from the wheel after each spin. */
  removeWinner: boolean;
  /** Play sound effects while spinning and on win. */
  soundEnabled: boolean;
  /** Skip the spin animation and reveal the winner instantly. */
  instantResult: boolean;
}

/** Shape of an exported `.json` wheel file. */
export interface WheelExport {
  type: "offlinekit-wheel";
  version: 1;
  name: string;
  entries: WheelEntry[];
}
