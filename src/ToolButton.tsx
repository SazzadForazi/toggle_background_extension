import type { ToolConfig, ToolType } from "./types";

type ToolButtonProps = {
  tool: ToolConfig;
  isActive: boolean;
  onClick: (tool: ToolType) => void;
};

const ToolButton = ({ tool, isActive, onClick }: ToolButtonProps) => {
  const Icon = tool.icon;

  return (
    <button
      type="button"
      onClick={() => onClick(tool.type)}
      title={tool.label}
      className={`group flex h-11 w-11 items-center justify-center rounded-2xl border transition-all duration-200 ${
        isActive
          ? "border-accent bg-sky-500/20 text-accent shadow-glow"
          : "border-slate-800 bg-slate-900/80 text-slate-300 hover:-translate-y-0.5 hover:border-slate-600 hover:bg-slate-800 hover:text-white"
      }`}
    >
      <Icon className="h-5 w-5" strokeWidth={2.1} />
    </button>
  );
};

export default ToolButton;
