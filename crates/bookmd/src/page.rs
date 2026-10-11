use regex::Regex;
use std::sync::OnceLock;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PageMarker {
    pub page: u32,
    /// Byte offset of the marker in the source.
    pub offset: usize,
}

fn page_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"<!--\s*page:\s*(\d+)\s*-->").expect("page regex"))
}

pub fn extract_page_markers(source: &str) -> Vec<PageMarker> {
    page_re()
        .captures_iter(source)
        .filter_map(|caps| {
            let full = caps.get(0)?;
            let page: u32 = caps.get(1)?.as_str().parse().ok()?;
            Some(PageMarker {
                page,
                offset: full.start(),
            })
        })
        .collect()
}

pub fn format_page_marker(page: u32) -> String {
    format!("<!-- page: {page} -->")
}

#[cfg(test)]
mod tests {
    use super::*;
    use pretty_assertions::assert_eq;

    #[test]
    fn extracts_pages() {
        let src = "<!-- page: 1 -->\nHello\n<!-- page: 12 -->\nWorld";
        let markers = extract_page_markers(src);
        assert_eq!(markers.len(), 2);
        assert_eq!(markers[0].page, 1);
        assert_eq!(markers[1].page, 12);
    }

    #[test]
    fn formats_marker() {
        assert_eq!(format_page_marker(3), "<!-- page: 3 -->");
    }
}
