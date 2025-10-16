export function MobileHeader() {
  return (
    <header
      className="sticky top-0 z-40 md:hidden bg-background/95 backdrop-blur border-b supports-[backdrop-filter]:bg-background/80"
      style={{
        paddingTop: "max(env(safe-area-inset-top, 0px), 0.75rem)",
      }}
    >
      <div className="flex items-center justify-center h-14 px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
            <div className="h-3.5 w-3.5 rotate-45 transform rounded-sm bg-white" />
          </div>
          <div>
            <h1 className="text-base font-semibold">CRMFlow</h1>
          </div>
        </div>
      </div>
    </header>
  );
}

