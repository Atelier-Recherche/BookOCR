import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
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

function App() {
  const { t, i18n } = useTranslation();
  const [pdfPath, setPdfPath] = useState("");
  const [outputDir, setOutputDir] = useState("");
  const [deps, setDeps] = useState<DependencyReport | null>(null);
  const [depsError, setDepsError] = useState<string | null>(null);

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

  const setLang = (code: string) => {
    void i18n.changeLanguage(code);
    localStorage.setItem("bookocr.lang", code);
  };

  return (
    <div className="shell">
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
          <label className="field">
            <span>{t("select.pdf")}</span>
            <input
              value={pdfPath}
              onChange={(e) => setPdfPath(e.target.value)}
              placeholder="C:\\Books\\example.pdf"
            />
          </label>
          <label className="field">
            <span>{t("select.output")}</span>
            <input
              value={outputDir}
              onChange={(e) => setOutputDir(e.target.value)}
              placeholder="C:\\Books\\out"
            />
          </label>
          <p className="muted">{t("select.comingSoon")}</p>
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
