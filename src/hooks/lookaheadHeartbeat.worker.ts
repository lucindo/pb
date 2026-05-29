// Background heartbeat for the session tick. Worker timers are exempt from the
// browser's 1s background-tab throttle, so this keeps the cue lookahead queue
// topped up while a desktop tab is hidden (rAF is frozen there).
setInterval(() => {
  postMessage(0)
}, 250)
