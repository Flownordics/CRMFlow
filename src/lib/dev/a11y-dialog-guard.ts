// Development-only guard to catch missing DialogTitle/DialogDescription warnings
if (import.meta.env.DEV) {
    let raf = 0;

    function logA11y(fn: () => void) {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => fn());
    }

    const orig = console.error;
    console.error = (...args: any[]) => {
        const msg = typeof args[0] === "string" ? args[0] : "";
        if (msg.includes("`DialogContent` requires a `DialogTitle`")) {
            logA11y(() => orig("🔎 Missing DialogTitle/Description in a Dialog. Stack:", new Error().stack));
        }
        orig(...args);
    };
}
