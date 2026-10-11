# BookOCR by l'Atelier

**Français** · [English](README.md)

Application bureau qui transforme un **PDF de livre** (scanné ou texte) en édition numérique fidèle et restructurée : **Markdown étendu** (source de vérité), **PDF Typst** et **EPUB3** — 100 % local par défaut (Ollama), APIs cloud optionnelles plus tard.

> État : développement initial. Le pipeline et l’UI ci-dessous décrivent la cible produit ; l’implémentation avance par étapes.

## Objectifs

- **OCR / extraction fidèle** — conserver le texte d’origine, y compris fautes et particularités. Aucune « correction » orthographique.
- **Structure sensible à la mise en page** — titres, notes de bas de page, notes de fin, en-têtes/pieds, figures + légendes, tableaux, citations, numéros de pages source.
- **Recomposition typographique** — agencement logique (pas un clone pixel du scan) ; styles d’export : academic / essay / novel.
- **Préserver le front matter existant** — réutiliser **TOC**, **index** et **glossaire** imprimés lorsqu’ils existent. La génération à la demande est prévue en V2 seulement.
- **Automatique ou semi-automatique** — revue humaine quand le pipeline doute (type de page, structure, appariement).
- **Un livre à la fois**, priorité à la qualité de sortie.
- **Langues (livres + interface) :** français, anglais, allemand, italien, espagnol.
- **Cibles :** sciences sociales universitaires, essais, romans. Pas de maths/formules pour l’instant ; jamais manga/BD.

## Pipeline (vue d’ensemble)

```text
PDF en entrée
  ├─ plutôt texte  → OpenDataLoader PDF → normalisation → BookMD
  └─ scan / aplati → prétraitement → rasterisation → Unlimited-OCR (Ollama)
                      → parse des régions (type + bbox)
                      → validation Clef-Flash (doute → gate humain)
                      → normalisation → BookMD
BookMD
  → extraction TOC / index / glossaire existants
  → confirmation des métadonnées
  → export Markdown + PDF Typst + EPUB3
```

1. **Classifier** — texte extractible vs scan (ou aplatir un mauvais PDF texte vers le chemin scan).
2. **PDF texte** — [OpenDataLoader PDF](https://github.com/opendataloader-project/opendataloader-pdf) (plus léger que l’OCR quand ça suffit).
3. **Scans** — redressement / contraste / recadrage (lisibilité seule), puis [richardyoung/unlimited-ocr](https://ollama.com/richardyoung/unlimited-ocr) via Ollama (OCR layout avec boîtes ; compatible GPU AMD via Ollama).
4. **Décisions** — [clef-flash](https://ollama.com/library/clef-flash) pour le type de page (`body`, `toc`, `index`, `glossary`, …), heuristiques de notes, gates si confiance basse.
5. **BookMD** — Markdown étendu canonique (voir ci-dessous).
6. **Exports** — Markdown + assets ; PDF via **Typst** ; EPUB3 via **Pandoc** (notes cliquables, pagebreaks, navigation).

Les stacks CUDA officielles [Unlimited-OCR](https://github.com/baidu/Unlimited-OCR) (Transformers / vLLM / SGLang) ne sont pas le chemin par défaut (GGUF Ollama, adapté AMD).

## BookMD (format canonique)

Le Markdown étendu est la source de vérité interne.

| Besoin | Convention |
| --- | --- |
| Page source | `<!-- page: N -->` (aussi mappé en labels Typst et pagebreaks EPUB3) |
| Notes | Inline Pandoc : `^[texte de la note]` |
| Notes de fin / fin de chapitre | `^[<!-- note:end -->…]` · `^[<!-- note:chapter-end -->…]` (toujours inline dans le MD ; les exporteurs regroupent) |
| Figures | `![légende](assets/…)` + dossier assets |
| Tableaux | Markdown (HTML si besoin) |
| Citations | `> …` |
| En-têtes / pieds | Marqués / métadonnées — pas mélangés silencieusement au corps |

Les numéros de page figurent dans le Markdown, dans le PDF Typst le cas échéant, et comme marqueurs de pagebreak EPUB3 (pas forcément visibles dans le lecteur, mais présents dans le paquet).

## Politique d’enrichissement

| Élément | V1 | V2 |
| --- | --- | --- |
| **TOC** | Détecter et préserver le sommaire imprimé ; lier aux chapitres si fiable | Générer depuis les titres à la demande |
| **Index** | Détecter et préserver l’index existant | Générer à la demande |
| **Glossaire** | Détecter et préserver le glossaire existant | Génération assistée à la demande |
| **Métadonnées** | Préremplir (page de titre / copyright) + confirmation | — |

Aucune génération silencieuse de TOC / index / glossaire en V1.

## Stack

| Couche | Choix |
| --- | --- |
| Coque applicative | [Tauri 2](https://v2.tauri.app/) + React / TypeScript |
| Pipeline | Rust (`src-tauri`, `crates/bookmd`) |
| Modèles locaux | Ollama — Unlimited-OCR + Clef-Flash |
| PDF texte | OpenDataLoader PDF (Java 11+) |
| Export PDF | Templates Typst (`academic`, `essay`, `novel`) |
| Export EPUB | Pandoc → EPUB3 |
| Licence | MIT |

Les fournisseurs cloud optionnels passeront par un trait `Provider` commun (désactivé par défaut).

## Organisation du dépôt

```text
ATBookOCR/
  README.md / README.fr.md
  LICENSE
  src/                 # UI React
  src-tauri/           # Tauri + orchestration pipeline Rust
  crates/bookmd/       # Parse / sérialisation BookMD
  templates/typst/     # Styles d’export
```

## Dépendances externes

À installer et rendre disponibles dans le `PATH` (l’app les détecte au démarrage) :

- [Ollama](https://ollama.com/) (version requise par Clef-Flash ; actuellement ≥ 0.35.1)
- Modèles (à tirer quand prêt) :
  - `ollama pull richardyoung/unlimited-ocr`
  - `ollama pull clef-flash`
- Java 11+ et CLI [OpenDataLoader PDF](https://www.opendataloader.org/)
- [Typst](https://typst.app/)
- [Pandoc](https://pandoc.org/)

GPU : NVIDIA ou AMD via les backends supportés par Ollama ; CPU possible mais plus lent.

## Interface (V1)

Parcours guidé minimal — pas d’éditeur Markdown intégré :

1. Choisir le PDF + dossier de sortie  
2. Réglages (modèles Ollama, chemins des outils)  
3. Progression du pipeline  
4. Gates de revue en cas de doute (structure de page, etc.)  
5. Confirmer les métadonnées + aperçu du TOC / index / glossaire **détectés** + style d’export  
6. Exporter Markdown / PDF / EPUB  

Langues UI : FR, EN, DE, IT, ES.

## Développement

```bash
# Prérequis : Node.js, Rust, prérequis Tauri pour votre OS
# https://v2.tauri.app/start/prerequisites/

npm install
npm run tauri dev
```

Build :

```bash
npm run tauri build
```

## Feuille de route (courte)

1. Scaffold Tauri + i18n + détection des dépendances  
2. Crate `bookmd` + tests  
3. Branche PDF texte (OpenDataLoader → BookMD)  
4. Branche scan (prétraitement + Unlimited-OCR → BookMD)  
5. Clef-Flash + gates humains  
6. PDF Typst + EPUB3 Pandoc  
7. Extraction TOC / index / glossaire existants + métadonnées  
8. **V2** — génération à la demande si absents  

## Contribution

Issues et PR bienvenues. Préférer des changements petits et relisibles. La fidélité du texte source est une règle non négociable.

## Remerciements

- [Baidu Unlimited-OCR](https://github.com/baidu/Unlimited-OCR) et le [build GGUF Ollama](https://ollama.com/richardyoung/unlimited-ocr)
- [Clef-Flash](https://ollama.com/library/clef-flash) (modèles décisionnels Cloudflare / Ollama)
- [OpenDataLoader PDF](https://github.com/opendataloader-project/opendataloader-pdf)
- Typst, Pandoc, Tauri, Ollama

## Licence

[MIT](LICENSE) — BookOCR by l'Atelier.
