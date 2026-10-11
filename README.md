# BookOCR by l'Atelier

**[Français](README.fr.md)** · English

Desktop app that turns a **book PDF** (scanned or text-based) into a faithful, restructured digital edition: **extended Markdown** (source of truth), **Typst PDF**, and **EPUB3** — fully local by default (Ollama), with optional cloud APIs later.

> Status: early development. The pipeline and UI described below are the product target; implementation is incremental.

## Goals

- **Faithful OCR / extraction** — keep the original wording, including typos and quirks. No spelling “improvement”.
- **Layout-aware structure** — titles, footnotes, endnotes, headers/footers, figures + captions, tables, quotations, source page numbers.
- **Typographic recomposition** — logical arrangement (not a pixel clone of the scan); export styles: academic / essay / novel.
- **Preserve existing front matter** — reuse printed **TOC**, **index**, and **glossary** when present. Generation on demand is planned for V2 only.
- **Automatic or semi-automatic** — human review when the pipeline is uncertain (page type, structure, matching).
- **One book at a time**, max output quality over speed.
- **Languages (books + UI):** French, English, German, Italian, Spanish.
- **Targets:** academic social sciences, essays, novels. No maths/formulas for now; never comics/manga.

## Pipeline (overview)

```text
PDF input
  ├─ text-like  → OpenDataLoader PDF → normalize → BookMD
  └─ scan/flat  → preprocess → rasterize → Unlimited-OCR (Ollama)
                      → parse regions (type + bbox)
                      → Clef-Flash validation (doubt → human gate)
                      → normalize → BookMD
BookMD
  → extract existing TOC / index / glossary
  → confirm metadata
  → export Markdown + Typst PDF + EPUB3
```

1. **Classify** — extractable text vs scan (or flatten poor text PDFs into the scan path).
2. **Text PDFs** — [OpenDataLoader PDF](https://github.com/opendataloader-project/opendataloader-pdf) (lighter than OCR when it works).
3. **Scans** — deskew/contrast/crop (readability only), then [richardyoung/unlimited-ocr](https://ollama.com/richardyoung/unlimited-ocr) via Ollama (layout OCR with bounding boxes; works on AMD GPUs through Ollama).
4. **Decisions** — [clef-flash](https://ollama.com/library/clef-flash) for page type (`body`, `toc`, `index`, `glossary`, …), footnote heuristics, low-confidence gates.
5. **BookMD** — canonical extended Markdown (see below).
6. **Exports** — Markdown + assets; PDF via **Typst**; EPUB3 via **Pandoc** (clickable notes, page breaks, navigation).

Official Baidu [Unlimited-OCR](https://github.com/baidu/Unlimited-OCR) CUDA stacks (Transformers / vLLM / SGLang) are out of scope for the default path (AMD-friendly Ollama GGUF instead).

## BookMD (canonical format)

Extended Markdown is the internal source of truth.

| Concern | Convention |
| --- | --- |
| Source page | `<!-- page: N -->` (also mapped into Typst labels and EPUB3 pagebreaks) |
| Footnotes / notes | Pandoc inline: `^[note text]` |
| End / chapter-end notes | `^[<!-- note:end -->…]` · `^[<!-- note:chapter-end -->…]` (still inline in MD; exporters regroup) |
| Figures | `![caption](assets/…)` + assets folder |
| Tables | Markdown (HTML when needed) |
| Quotations | `> …` |
| Headers/footers | Marked / metadata — not silently mixed into body |

Page numbers appear in Markdown, in the Typst PDF where appropriate, and as EPUB3 pagebreak markers (may be invisible in the reader UI but present in the package).

## Enrichment policy

| Element | V1 | V2 |
| --- | --- | --- |
| **TOC** | Detect & preserve printed table of contents; link to chapters when reliable | Generate from headings on demand |
| **Index** | Detect & preserve existing index | Generate on demand |
| **Glossary** | Detect & preserve existing glossary | Assisted generation on demand |
| **Metadata** | Prefill (title page / copyright) + user confirmation | — |

No silent generation of TOC / index / glossary in V1.

## Stack

| Layer | Choice |
| --- | --- |
| App shell | [Tauri 2](https://v2.tauri.app/) + React / TypeScript |
| Core pipeline | Rust (`src-tauri`, `crates/bookmd`) |
| Local models | Ollama — Unlimited-OCR + Clef-Flash |
| Text PDF | OpenDataLoader PDF (Java 11+) |
| PDF export | Typst templates (`academic`, `essay`, `novel`) |
| EPUB export | Pandoc → EPUB3 |
| License | MIT |

Optional cloud LLM providers will sit behind a common `Provider` trait (off by default).

## Repository layout

```text
ATBookOCR/
  README.md / README.fr.md
  LICENSE
  src/                 # React UI
  src-tauri/           # Tauri + Rust pipeline orchestration
  crates/bookmd/       # BookMD parse / serialize
  templates/typst/     # Export styles
```

## External dependencies

Install and ensure they are on `PATH` (the app will detect them at startup):

- [Ollama](https://ollama.com/) ≥ version required by Clef-Flash (see model page; currently 0.35.1+)
- Models (pull when ready):
  - `ollama pull richardyoung/unlimited-ocr`
  - `ollama pull clef-flash`
- Java 11+ and [OpenDataLoader PDF](https://www.opendataloader.org/) CLI
- [Typst](https://typst.app/)
- [Pandoc](https://pandoc.org/)

GPU: NVIDIA or AMD via Ollama’s supported backends; CPU works but is slower.

## UI (V1)

Minimal guided flow — no built-in Markdown editor:

1. Choose PDF + output folder  
2. Settings (Ollama models, tool paths)  
3. Pipeline progress  
4. Review gates on doubt (page structure, etc.)  
5. Confirm metadata + preview of **detected** TOC / index / glossary + export style  
6. Export Markdown / PDF / EPUB  

UI languages: FR, EN, DE, IT, ES.

## Development

```bash
# Prerequisites: Node.js, Rust, Tauri prerequisites for your OS
# https://v2.tauri.app/start/prerequisites/

npm install
npm run tauri dev
```

Build:

```bash
npm run tauri build
```

## Roadmap (short)

1. Scaffold Tauri + i18n + dependency checks  
2. `bookmd` crate + tests  
3. Text-PDF branch (OpenDataLoader → BookMD)  
4. Scan branch (preprocess + Unlimited-OCR → BookMD)  
5. Clef-Flash + human gates  
6. Typst PDF + Pandoc EPUB3  
7. Existing TOC / index / glossary extraction + metadata  
8. **V2** — on-demand generation of missing TOC / index / glossary  

## Contributing

Issues and PRs welcome. Prefer small, reviewable changes. Keep fidelity of source text as a non-negotiable rule.

## Acknowledgements

- [Baidu Unlimited-OCR](https://github.com/baidu/Unlimited-OCR) and the [Ollama GGUF build](https://ollama.com/richardyoung/unlimited-ocr)
- [Clef-Flash](https://ollama.com/library/clef-flash) (Cloudflare / Ollama decision models)
- [OpenDataLoader PDF](https://github.com/opendataloader-project/opendataloader-pdf)
- Typst, Pandoc, Tauri, Ollama

## License

[MIT](LICENSE) — BookOCR by l'Atelier.
