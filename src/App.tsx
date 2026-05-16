import { MoonStar, SunMedium } from "lucide-react";
import { useEffect } from "react";
import DrawingCanvas from "./DrawingCanvas";
import DrawingToolbar from "./DrawingToolbar";
import { useDrawingStore } from "./useDrawingStore";

const AnalysisBackdrop = ({ light }: { light: boolean }) => (
  <div
    className={`absolute inset-0 overflow-hidden rounded-[2rem] border ${
      light
        ? "border-slate-300 bg-slate-100"
        : "border-slate-800 bg-slate-950"
    }`}
  >
    <div
      className={`absolute inset-0 ${
        light
          ? "bg-[linear-gradient(to_right,rgba(71,85,105,0.11)_1px,transparent_1px),linear-gradient(to_bottom,rgba(71,85,105,0.11)_1px,transparent_1px)]"
          : "bg-[linear-gradient(to_right,rgba(51,65,85,0.28)_1px,transparent_1px),linear-gradient(to_bottom,rgba(51,65,85,0.28)_1px,transparent_1px)]"
      } bg-[size:56px_56px]`}
    />
    <div
      className={`absolute inset-0 ${
        light
          ? "bg-[radial-gradient(circle_at_18%_18%,rgba(56,189,248,0.12),transparent_24%),radial-gradient(circle_at_82%_28%,rgba(34,197,94,0.12),transparent_22%),radial-gradient(circle_at_72%_74%,rgba(239,68,68,0.10),transparent_20%)]"
          : "bg-[radial-gradient(circle_at_18%_18%,rgba(56,189,248,0.15),transparent_24%),radial-gradient(circle_at_82%_28%,rgba(34,197,94,0.11),transparent_22%),radial-gradient(circle_at_72%_74%,rgba(239,68,68,0.11),transparent_20%)]"
      }`}
    />
    <div className="absolute inset-x-0 top-24 flex justify-center px-6">
      <div
        className={`max-w-2xl rounded-[2rem] border px-6 py-5 text-center shadow-xl backdrop-blur-xl ${
          light
            ? "border-slate-300/80 bg-white/70 text-slate-700"
            : "border-slate-700/80 bg-slate-950/45 text-slate-300"
        }`}
      >
        <div className={`text-xs font-semibold uppercase tracking-[0.34em] ${light ? "text-slate-500" : "text-slate-400"}`}>
          Clean Analysis Mode
        </div>
        <h2 className={`mt-3 text-2xl font-semibold ${light ? "text-slate-900" : "text-white"}`}>
          No candle chart, just a neutral drawing surface
        </h2>
        <p className="mt-3 text-sm leading-6">
          Open this page, keep the left toolbar visible, and use it as your explanation board for screenshots, browser content, or market examples.
        </p>
      </div>
    </div>
    <div className="absolute inset-x-8 top-8 flex items-center justify-between text-xs font-medium uppercase tracking-[0.28em]">
      <span className={light ? "text-slate-500" : "text-slate-400"}>Analysis Workspace</span>
      <span className={light ? "text-slate-500" : "text-slate-500"}>Floating Draw Overlay</span>
    </div>
  </div>
);

function App() {
  const { backgroundMode, toggleBackgroundMode, hydrate, objects, selectedObjectId, activeTool } = useDrawingStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const isLight = backgroundMode === "light";

  return (
    <main
      className={`min-h-screen transition-colors duration-300 ${
        isLight ? "bg-slate-200 text-slate-950" : "bg-slate-950 text-slate-100"
      }`}
    >
      <div className="mx-auto flex min-h-screen max-w-[1700px] flex-col p-4 sm:p-5 lg:p-6">
        <header className="mb-4 flex flex-col gap-4 rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className={`text-xs font-semibold uppercase tracking-[0.35em] ${isLight ? "text-slate-500" : "text-slate-400"}`}>
              Trading Overlay Suite
            </p>
            <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">Floating browser drawing tool for explanation and analysis</h1>
            <p className={`mt-2 max-w-3xl text-sm ${isLight ? "text-slate-600" : "text-slate-300"}`}>
              Run the app, keep the left toggle open, and use the canvas as a clean markup layer for support, resistance, zones, notes, and explanation.
            </p>
          </div>

          <button
            type="button"
            onClick={toggleBackgroundMode}
            className={`inline-flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
              isLight
                ? "border-slate-300 bg-white text-slate-800 hover:border-sky-400 hover:text-sky-700"
                : "border-slate-700 bg-slate-900/90 text-slate-100 hover:border-sky-400 hover:text-sky-300"
            }`}
          >
            {isLight ? <MoonStar className="h-4 w-4" /> : <SunMedium className="h-4 w-4" />}
            Toggle Background Color
          </button>
        </header>

        <section
          className={`relative min-h-[calc(100vh-11rem)] flex-1 overflow-hidden rounded-[2.25rem] border ${
            isLight ? "border-slate-300/80" : "border-slate-800/80"
          }`}
        >
          <AnalysisBackdrop light={isLight} />

          <div className="absolute bottom-5 right-5 z-30 rounded-3xl border border-white/10 bg-slate-950/70 px-4 py-3 text-xs shadow-xl backdrop-blur">
            <div className="flex gap-5">
              <div>
                <div className="text-slate-400">Objects</div>
                <div className="mt-1 text-sm font-semibold text-white">{objects.length}</div>
              </div>
              <div>
                <div className="text-slate-400">Active Tool</div>
                <div className="mt-1 text-sm font-semibold text-white">{activeTool}</div>
              </div>
              <div>
                <div className="text-slate-400">Selection</div>
                <div className="mt-1 text-sm font-semibold text-white">{selectedObjectId ? "Locked" : "None"}</div>
              </div>
            </div>
          </div>

          <DrawingToolbar />
          <DrawingCanvas className="absolute inset-0" />
        </section>
      </div>
    </main>
  );
}

export default App;
