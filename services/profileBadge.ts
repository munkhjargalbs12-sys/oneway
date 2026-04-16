const listeners = new Set<() => void>();

export function subscribeProfileBadge(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function emitProfileBadgeRefresh() {
  listeners.forEach((listener) => listener());
}
