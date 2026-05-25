/// <reference types="vite/client" />

// J14: vite.config.ts injects the package.json version at build time via
// `define`. J16 adds the build SHA + date for fresh About rows without
// bumping package.json per commit. Declared globally so any component can
// reference them without importing or threading through props.
declare const __APP_VERSION__: string
declare const __APP_BUILD_SHA__: string
declare const __APP_BUILD_DATE__: string
