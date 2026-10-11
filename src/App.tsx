import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { open } from "@tauri-apps/plugin-dialog";
import { useTranslation } from "react-i18next";
import { languages } from "./i18n";
import "./App.css";

type ToolStatus = {
  name: string;
  found: boolean;
  path: string | null;
};

type DependencyReport = {
  tools: ToolStatus[];
};

type DropTarget = "pdf" | "output" | null;

function isPdfPath(path: string): boolean {
  return path.toLowerCase().endsWith(".pdf");
}

function basename(path: string): string {
  const parts = path.replace(/\\/g, "/").split("/");
  return parts[parts.length - 1] || path;
}

function hitTest(
  el: HTMLElement | null,
  physicalX: number,
  physicalY: number,
): boolean {
  if (!el) return false;
  const rect = el.getBoundingClientRect();
  const x = physicalX / window.devicePixelRatio;
  const y = physicalY / window.devicePixelRatio;
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

function App() {
  const { t, i18n } = useTranslation();
  const [pdfPath, setPdfPath] = useState("");
  const [outputDir, setOutputDir] = useState("");
  const [deps, setDeps] = useState<DependencyReport | null>(null);
  const [depsError, setDepsError] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget>(null);
  const [dragging, setDragging] = useState(false);
  const [dropError, setDropError] = useState<string | null>(null);

  const pdfZoneRef = useRef<HTMLDivElement>(null);
  const outputZoneRef = useRef<HTMLDivElement>(null);
  const dropErrorRef = useRef(t);

  useEffect(() => {
    dropErrorRef.current = t;
  }, [t]);

  const refreshDeps = useCallback(async () => {
    setDepsError(null);
    try {
      const report = await invoke<DependencyReport>("check_dependencies");
      setDeps(report);
    } catch (e) {
      setDepsError(String(e));
    }
  }, []);

  useEffect(() => {
    void refreshDeps();
  }, [refreshDeps]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let cancelled = false;

    const resolveTarget = (x: number, y: number): DropTarget => {
      if (hitTest(pdfZoneRef.current, x, y)) return "pdf";
      if (hitTest(outputZoneRef.current, x, y)) return "output";
      return null;
    };

    void getCurrentWebview()
      .onDragDropEvent((event) => {
        const payload = event.payload;

        if (payload.type === "enter" || payload.type === "over") {
          setDragging(true);
          setDropTarget(
            resolveTarget(payload.position.x, payload.position.y),
          );
          return;
        }

        if (payload.type === "leave") {
          setDragging(false);
          setDropTarget(null);
          return;
        }

        if (payload.type === "drop") {
          setDragging(false);
          const target = resolveTarget(
            payload.position.x,
            payload.position.y,
          );
          setDropTarget(null);
          setDropError(null);

          const paths = payload.paths;
          const pdfs = paths.filter(isPdfPath);
          const others = paths.filter((p) => !isPdfPath(p));
          const tr = dropErrorRef.current;

          if (target === "pdf") {
            if (pdfs[0]) setPdfPath(pdfs[0]);
            else setDropError(tr("select.dropPdfOnly"));
            return;
          }

          if (target === "output") {
            if (others[0]) setOutputDir(others[0]);
            else setDropError(tr("select.dropFolderOnly"));
            return;
          }

          if (pdfs[0]) setPdfPath(pdfs[0]);
          else if (others[0]) setOutputDir(others[0]);
        }
      })
      .then((fn) => {
        if (cancelled) fn();
        else unlisten = fn;
      });

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  const setLang = (code: string) => {
    void i18n.changeLanguage(code);
    localStorage.setItem("bookocr.lang", code);
  };

  const pickPdf = async () => {
    setDropError(null);
    const selected = await open({
      multiple: false,
      directory: false,
      filters: [{ name: "PDF", extensions: ["pdf"] }],
      title: t("select.choosePdf"),
    });
    if (typeof selected === "string") setPdfPath(selected);
  };

  const pickOutput = async () => {
    setDropError(null);
    const selected = await open({
      multiple: false,
      directory: true,
      title: t("select.chooseOutput"),
    });
    if (typeof selected === "string") setOutputDir(selected);
  };

  return (
    <div className={`shell${dragging ? " is-dragging" : ""}`}>
      <header className="hero">
        <div className="lang-row">
          <label htmlFor="lang">{t("lang.label")}</label>
          <select
            id="lang"
            value={i18n.language}
            onChange={(e) => setLang(e.target.value)}
          >
            {languages.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
        <p className="brand">
          <span className="brand-name">{t("app.title")}</span>{" "}
          <span className="brand-by">{t("app.brand")}</span>
        </p>
        <p className="tagline">{t("app.tagline")}</p>
      </header>

      <main className="panels">
        <section className="panel">
          <h2>{t("steps.select")}</h2>
          <p className="hint">{t("select.pdfHint")}</p>

          <div
            ref={pdfZoneRef}
            className={`dropzone${dropTarget === "pdf" ? " active" : ""}${pdfPath ? " filled" : ""}`}
            onClick={() => void pickPdf()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                void pickPdf();
              }
            }}
          >
            <div className="dropzone-label">{t("select.pdf")}</div>
            {pdfPath ? (
              <>
                <div className="dropzone-file" title={pdfPath}>
                  {basename(pdfPath)}
                </div>
                <code className="dropzone-path">{pdfPath}</code>
              </>
            ) : (
              <p className="dropzone-prompt">{t("select.dropPdf")}</p>
            )}
            <div className="dropzone-actions">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  void pickPdf();
                }}
              >
                {t("select.choosePdf")}
              </button>
              {pdfPath && (
                <button
                  type="button"
                  className="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPdfPath("");
                  }}
                >
                  {t("select.clear")}
                </button>
              )}
            </div>
          </div>

          <div
            ref={outputZoneRef}
            className={`dropzone${dropTarget === "output" ? " active" : ""}${outputDir ? " filled" : ""}`}
            onClick={() => void pickOutput()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                void pickOutput();
              }
            }}
          >
            <div className="dropzone-label">{t("select.output")}</div>
            {outputDir ? (
              <>
                <div className="dropzone-file" title={outputDir}>
                  {basename(outputDir)}
                </div>
                <code className="dropzone-path">{outputDir}</code>
              </>
            ) : (
              <p className="dropzone-prompt">{t("select.dropOutput")}</p>
            )}
            <div className="dropzone-actions">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  void pickOutput();
                }}
              >
                {t("select.chooseOutput")}
              </button>
              {outputDir && (
                <button
                  type="button"
                  className="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOutputDir("");
                  }}
                >
                  {t("select.clear")}
                </button>
              )}
            </div>
          </div>

          {dropError && <p className="error">{dropError}</p>}
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>{t("steps.deps")}</h2>
            <button type="button" onClick={() => void refreshDeps()}>
              {t("deps.refresh")}
            </button>
          </div>
          <p className="hint">{t("deps.hint")}</p>
          {depsError && <p className="error">{depsError}</p>}
          <ul className="deps-list">
            {(deps?.tools ?? []).map((tool) => (
              <li key={tool.name} className={tool.found ? "ok" : "bad"}>
                <strong>{tool.name}</strong>
                <span>{tool.found ? t("deps.found") : t("deps.missing")}</span>
                {tool.path && <code>{tool.path}</code>}
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}

export default App;
