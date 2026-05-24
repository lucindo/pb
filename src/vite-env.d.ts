/// <reference types="vite/client" />

// J14: vite.config.ts injects the package.json version at build time via
// `define`. Declared globally so any component can reference it without
// importing or threading through props.
declare const __APP_VERSION__: string
