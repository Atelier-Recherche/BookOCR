//! BookMD — canonical extended Markdown for BookOCR.
//!
//! Conventions (V1):
//! - Source pages: `<!-- page: N -->`
//! - Inline notes: `^[note text]`
//! - Typed notes: `^[<!-- note:end -->…]`, `^[<!-- note:chapter-end -->…]`

mod note;
mod page;

pub use note::{NoteKind, InlineNote, extract_inline_notes, format_inline_note};
pub use page::{PageMarker, extract_page_markers, format_page_marker};

use thiserror::Error;

#[derive(Debug, Error)]
pub enum BookMdError {
    #[error("invalid page marker: {0}")]
    InvalidPageMarker(String),
    #[error("invalid note: {0}")]
    InvalidNote(String),
}

/// Lightweight document view over BookMD source.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BookDocument {
    pub source: String,
}

impl BookDocument {
    pub fn parse(source: impl Into<String>) -> Self {
        Self {
            source: source.into(),
        }
    }

    pub fn page_markers(&self) -> Vec<PageMarker> {
        extract_page_markers(&self.source)
    }

    pub fn inline_notes(&self) -> Result<Vec<InlineNote>, BookMdError> {
        note::extract_inline_notes(&self.source)
    }
}
