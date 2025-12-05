type ToastAction = {
  label: string;
  onClick: () => void;
};

type ToastMessage = { 
  title?: string; 
  description?: string; 
  variant?: "default" | "destructive" | "success";
  action?: ToastAction;
};

type Listener = (msg: ToastMessage) => void;
const listeners = new Set<Listener>();
export const toastBus = {
  on: (l: Listener) => (listeners.add(l), () => listeners.delete(l)),
  emit: (msg: ToastMessage) =>
    listeners.forEach((l) => l(msg)),
};
