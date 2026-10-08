/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface Window {
  /** Safari < 14.1 */
  webkitAudioContext?: typeof AudioContext
}
