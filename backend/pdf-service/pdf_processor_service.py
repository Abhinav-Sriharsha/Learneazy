import fitz  # PyMuPDF
from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from langchain_text_splitters import RecursiveCharacterTextSplitter

app = Flask(__name__)
CORS(app)

text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=512,
    chunk_overlap=50,
)

def get_chapter_map(doc):
    """
    Uses the PDF's bookmarks (ToC) to create a chapter map.
    If no bookmarks are found, it creates a "dummy" map
    that treats the whole book as "Chapter 1".
    """
    toc = doc.get_toc()
    
    # --- GRACEFUL FALLBACK ---
    if not toc:
        print("⚠️ WARNING: No bookmarks (ToC) found in this PDF.")
        print("Indexing the entire document as 'Chapter 1'.")
        return [
            {
                "chapter_number": "1",
                "title": "Full Document",
                "start_page": 1,
                "end_page": doc.page_count
            }
        ]
    # --- END OF FALLBACK ---

    chapter_map = []
    chapter_count = 1

    # --- FIX: We need to find the *indices* of the valid chapters first ---
    # This filters out junk bookmarks like "copyright" that are also level 1
    valid_chapter_indices = []
    for i, (level, title, page) in enumerate(toc):
        normalized_title = title.strip()
        if level == 1 and (normalized_title.startswith("Chapter") or normalized_title.startswith("Appendix")):
            valid_chapter_indices.append(i)

    # --- NEW: Handle case where no valid chapters are found ---
    if not valid_chapter_indices:
        print("⚠️ WARNING: No 'Chapter' or 'Appendix' bookmarks found at level 1.")
        print("Indexing the entire document as 'Chapter 1'.")
        return [
            {
                "chapter_number": "1",
                "title": "Full Document",
                "start_page": 1,
                "end_page": doc.page_count
            }
        ]

    # --- MODIFIED: Iterate using the filtered indices ---
    for i, toc_index in enumerate(valid_chapter_indices):
        (level, title, page) = toc[toc_index]
        
        start_page = page
        end_page = doc.page_count
        
        # Find the *next* valid chapter's start page to set our end_page
        if i < len(valid_chapter_indices) - 1:
            next_toc_index = valid_chapter_indices[i+1]
            end_page = toc[next_toc_index][2] - 1 # page of next valid chapter - 1
        
        chapter_map.append({
            "chapter_number": str(chapter_count),
            "title": title.strip(),
            "start_page": start_page,
            "end_page": end_page
        })
        chapter_count += 1
        
    print(f"Generated chapter map (Filtered): {chapter_map}")
    return chapter_map

@app.route('/process_pdf', methods=['POST'])
def process_pdf():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    try:
        pdf_bytes = file.read()
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")

        chapter_map = get_chapter_map(doc) # This will now parse correctly

        # Layer 1a: The Full Table of Contents (One single doc)
        toc_text = "\n".join([f"Chapter {c['chapter_number']}: {c['title']} (Page {c['start_page']})" for c in chapter_map])
        layer1_full_toc_doc = {
            "content": toc_text,
            "metadata": { "doc_type": "toc_full" } 
        }
        
        # Layer 1b: Individual ToC Entries (One doc per chapter)
        layer1_entry_docs = []
        for c in chapter_map:
            layer1_entry_docs.append({
                "content": f"Chapter {c['chapter_number']}: {c['title']} (Starts on Page {c['start_page']})",
                "metadata": {
                    "doc_type": "toc_entry", 
                    "chapter": c['chapter_number']
                }
            })

        # Layer 3: The Detailed Chunks
        layer3_chunks = []
        for chapter in chapter_map:
            chapter_text = ""
            # Ensure page numbers are valid
            start_page_index = max(0, chapter["start_page"] - 1)
            end_page_index = min(doc.page_count, chapter["end_page"])

            for page_num in range(start_page_index, end_page_index):
                chapter_text += doc[page_num].get_text()

            chunks = text_splitter.split_text(chapter_text)
            
            for chunk_content in chunks:
                layer3_chunks.append({
                    "content": chunk_content.replace("\u0000", ""), # Sanitize
                    "metadata": {
                        "doc_type": "chunk",
                        "chapter": chapter["chapter_number"],
                        "chapter_title": chapter["title"]
                    }
                })

        doc.close()

        print(f"Successfully processed PDF. Found {len(layer3_chunks)} chunks.")

        # Return the new, more refined payload
        return jsonify({
            "layer1_full_toc_doc": layer1_full_toc_doc,
            "layer1_entry_docs": layer1_entry_docs,
            "layer3_chunks": layer3_chunks
        })

    except Exception as e:
        return jsonify({"error": f"Failed to process PDF: {str(e)}"}), 500

if __name__ == '__main__':
    # Bind to 0.0.0.0 so Railway can access it from other services
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=True, host='0.0.0.0', port=port)