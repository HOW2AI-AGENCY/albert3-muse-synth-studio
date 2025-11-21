const ImmediatePriority = 5;
const UserBlockingPriority = 4;
const NormalPriority = 3;
const LowPriority = 2;
const IdlePriority = 1;

let currentPriority = NormalPriority;

function now() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

function shouldYield() {
  return false;
}

function scheduleCallback(priority, callback) {
  currentPriority = priority ?? NormalPriority;
  const id = setTimeout(() => {
    try {
      callback({
        timeRemaining: () => 5,
        didTimeout: false,
      });
    } finally {
      currentPriority = NormalPriority;
    }
  }, 0);
  return id;
}

function cancelCallback(id) {
  clearTimeout(id);
}

function getCurrentPriorityLevel() {
  return currentPriority;
}

export {
  ImmediatePriority as unstable_ImmediatePriority,
  UserBlockingPriority as unstable_UserBlockingPriority,
  NormalPriority as unstable_NormalPriority,
  LowPriority as unstable_LowPriority,
  IdlePriority as unstable_IdlePriority,
  scheduleCallback as unstable_scheduleCallback,
  cancelCallback as unstable_cancelCallback,
  shouldYield as unstable_shouldYield,
  now as unstable_now,
  getCurrentPriorityLevel as unstable_getCurrentPriorityLevel,
};