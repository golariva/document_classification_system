from docx import Document as DocxDocument
from PyPDF2 import PdfReader


def extract_text(file_path: str, filename: str) -> str:
    text = ""

    # TXT
    if filename.endswith(".txt"):
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            text = f.read()

    # DOCX
    elif filename.endswith(".docx"):
        doc = DocxDocument(file_path)
        text = "\n".join([p.text for p in doc.paragraphs])

    # PDF
    elif filename.endswith(".pdf"):
        reader = PdfReader(file_path)

        pages = []

        for page in reader.pages:
            page_text = page.extract_text()

            if page_text:
                pages.append(page_text)

        text = "\n".join(pages)

    return text