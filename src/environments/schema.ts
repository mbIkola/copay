/**
 * Copay does not yet build with Angular CLI, but our environment system works
 * the same way.
 */
export interface EnvironmentSchema {
  name: 'production' | 'development';
  enableAnimations: boolean;
  ratesAPI: {
    swx: string;
    bch: string;
  };
  activateScanner: boolean;
}
