use crate::BookMdError;
use regex::Regex;
use std::sync::OnceLock;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum NoteKind {
    /// Default footnote / inline note.
    Footnote,
    /// End-of-book note.
    End,
    /// End-of-chapter note.
    ChapterEnd,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct InlineNote {
    pub kind: NoteKind,
    pub text: String,
    pub offset: usize,
}

fn note_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    // Pandoc inline note: ^[ ... ] with optional typed HTML comment prefix.
    RE.get_or_init(|| {
        Regex::new(r"\^\[((?:<!--\s*note:(end|chapter-end)\s*-->)?)(.*?)\]")
            .expect("note regex")
    })
}

pub fn extract_inline_notes(source: &str) -> Result<Vec<InlineNote>, BookMdError> {
    let mut out = Vec::new();
    for caps in note_re().captures_iter(source) {
        let full = caps
            .get(0)
            .ok_or_else(|| BookMdError::InvalidNote("missing match".into()))?;
        let tag = caps.get(2).map(|m| m.as_str());
        let body = caps
            .get(3)
            .map(|m| m.as_str().trim())
            .unwrap_or("")
            .to_string();
        let kind = match tag {
            Some("end") => NoteKind::End,
            Some("chapter-end") => NoteKind::ChapterEnd,
            None => NoteKind::Footnote,
            Some(other) => {
                return Err(BookMdError::InvalidNote(format!("unknown note tag: {other}")));
            }
        };
        out.push(InlineNote {
            kind,
            text: body,
            offset: full.start(),
        });
    }
    Ok(out)
}

pub fn format_inline_note(kind: NoteKind, text: &str) -> String {
    match kind {
        NoteKind::Footnote => format!("^[{text}]"),
        NoteKind::End => format!("^[<!-- note:end -->{text}]"),
        NoteKind::ChapterEnd => format!("^[<!-- note:chapter-end -->{text}]"),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use pretty_assertions::assert_eq;

    #[test]
    fn parses_footnote() {
        let notes = extract_inline_notes("Hello^[a note] world").unwrap();
        assert_eq!(notes.len(), 1);
        assert_eq!(notes[0].kind, NoteKind::Footnote);
        assert_eq!(notes[0].text, "a note");
    }

    #[test]
    fn parses_end_note() {
        let notes = extract_inline_notes("See^[<!-- note:end -->fin du livre]").unwrap();
        assert_eq!(notes[0].kind, NoteKind::End);
        assert_eq!(notes[0].text, "fin du livre");
    }

    #[test]
    fn formats_typed() {
        assert_eq!(
            format_inline_note(NoteKind::ChapterEnd, "x"),
            "^[<!-- note:chapter-end -->x]"
        );
    }
}
