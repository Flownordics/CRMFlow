type Listener = (msg: { title?: string; description?: string; variant?: "default" | "destructive" | "success" }) => void;
const listeners = new Set<Listener>();
export const toastBus = {
  on: (l: Listener) => (listeners.add(l), () => listeners.delete(l)),
  emit: (msg: { title?: string; description?: string; variant?: "default" | "destructive" | "success" }) =>
    listeners.forEach((l) => l(msg)),
};
