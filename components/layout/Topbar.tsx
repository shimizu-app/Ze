interface TopbarProps {
  title: string;
  code?: string;
  accountName?: string | null;
}

export function Topbar({ title, code, accountName }: TopbarProps) {
  return (
    <header className="h-14 px-6 border-b border-white/5 flex items-center justify-between bg-s1/60 backdrop-blur">
      <div>
        <h1 className="text-lg font-semibold">{title}</h1>
        {code && <div className="mono text-[10px] text-white/40">{code}</div>}
      </div>
      {accountName && (
        <div className="flex items-center gap-3">
          <div className="text-xs text-white/50">組織</div>
          <div className="text-sm font-medium">{accountName}</div>
        </div>
      )}
    </header>
  );
}
