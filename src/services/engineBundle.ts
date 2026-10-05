/**
 * SnapClean AI - Core Engine DLL Bundle Entry Point
 * Bundles all core photo processing, cryptographic, deduplication, and indexing engines
 * into an isolated dynamic library module for faster application startup.
 */

export { PhotoEngine } from './photoEngine';
export type { PhotoMetadata } from './photoEngine';

export { DedupeEngine } from './dedupeEngine';
export type { DedupeGroup } from './dedupeEngine';

export { CryptoEngine } from './cryptoEngine';

export { BurstEngine } from './burstEngine';
export type { BurstGroup } from './burstEngine';

export { FunnelEngine } from './funnelEngine';

export { PeopleEngine } from './peopleEngine';

export { PhotoLibraryManager } from './PhotoLibraryManager';

export { SystemAPI } from './systemApi';

export const ENGINE_DLL_METADATA = {
  name: 'snapclean_core_engine',
  version: '2.4.0',
  architecture: 'hybrid-native-wasm-js',
  nativeLibrary: 'snapclean_core.dll',
  startupOptimized: true,
  engines: [
    'PhotoEngine',
    'DedupeEngine',
    'CryptoEngine',
    'BurstEngine',
    'FunnelEngine',
    'PeopleEngine',
    'PhotoLibraryManager'
  ]
};
