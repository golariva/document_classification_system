from docx import Document as DocxDocument

def extract_text(file_path: str, filename: str) -> str:
    text = ""

    if filename.endswith(".txt"):
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            text = f.read()

    elif filename.endswith(".docx"):
        doc = DocxDocument(file_path)
        text = "\n".join([p.text for p in doc.paragraphs])

    return text