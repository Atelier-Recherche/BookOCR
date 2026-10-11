use serde::Serialize;
use which::which;

#[derive(Debug, Clone, Serialize)]
pub struct ToolStatus {
    pub name: String,
    pub found: bool,
    pub path: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct DependencyReport {
    pub tools: Vec<ToolStatus>,
}

const TOOLS: &[(&str, &[&str])] = &[
    ("ollama", &["ollama"]),
    ("java", &["java"]),
    ("opendataloader-pdf", &["opendataloader-pdf"]),
    ("typst", &["typst"]),
    ("pandoc", &["pandoc"]),
];

pub fn check_dependencies() -> DependencyReport {
    let mut tools = Vec::new();
    for (name, candidates) in TOOLS {
        let mut found_path = None;
        for bin in *candidates {
            if let Ok(path) = which(bin) {
                found_path = Some(path.display().to_string());
                break;
            }
        }
        tools.push(ToolStatus {
            name: (*name).to_string(),
            found: found_path.is_some(),
            path: found_path,
        });
    }
    DependencyReport { tools }
}
