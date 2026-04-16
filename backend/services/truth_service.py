"""Truth verification utilities using FAISS.
Implements a RAG pipeline using TF-IDF vectors pushed into a dense FAISS index.
1. Retrieve top-k documents based on vector similarity via FAISS.
2. Compute a groundedness score (average similarity).
3. Return citations and a truth score.
"""
import sqlite3
from typing import List, Dict, Tuple
import numpy as np
import faiss
from sklearn.feature_extraction.text import TfidfVectorizer
from ..config import DB_PATH, RAG_SIMILARITY_THRESHOLD

# ---------------------------------------------------------------------------
# Load knowledge base (cached on first call)
# ---------------------------------------------------------------------------
_KB_CACHE = None


def invalidate_cache():
    """Clear the KB cache so the next call reloads from DB."""
    global _KB_CACHE
    _KB_CACHE = None


def _load_knowledge_base():
    """Load all articles from the SQLite knowledge_base table and build a
    FAISS index from TF-IDF dense embeddings. 
    Returns (faiss_index, list_of_records, vectorizer).
    """
    global _KB_CACHE
    if _KB_CACHE is not None:
        return _KB_CACHE

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT title, content, source FROM knowledge_base")
        rows = cursor.fetchall()
    except sqlite3.OperationalError:
        rows = []
    conn.close()

    if not rows:
        return None, [], None

    records = [{"title": r[0], "content": r[1], "source": r[2]} for r in rows]
    texts = [rec["content"] for rec in records]
    
    # 1. Create TF-IDF Vectors
    vectorizer = TfidfVectorizer(stop_words="english", max_features=5000)
    matrix_sparse = vectorizer.fit_transform(texts)
    
    # 2. Convert to Dense Float32 for FAISS
    matrix_dense = matrix_sparse.toarray().astype(np.float32)
    
    # 3. Build FAISS IndexFlatIP (Inner Product = Cosine Similarity for normalized TF-IDF)
    d = matrix_dense.shape[1]
    index = faiss.IndexFlatIP(d)
    
    # Add vectors to FAISS index
    faiss.normalize_L2(matrix_dense) # Ensure pure cosine similarity setup
    index.add(matrix_dense)
    
    _KB_CACHE = (index, records, vectorizer)
    return _KB_CACHE


def verify_claims(claim: str, top_k: int = 3) -> Dict:
    """Verify a single claim against the knowledge base.
    Uses FAISS retriever to find similar documents.
    """
    result = _load_knowledge_base()
    faiss_index, records, vectorizer = result if result and result[0] is not None else (None, [], None)

    if faiss_index is None or len(records) == 0:
        return {
            "truth_score": 0.5,
            "groundedness": 0.0,
            "citations": [{"title": "No knowledge base loaded", "source": "N/A",
                           "similarity": 0.0, "snippet": "Seed the knowledge base to enable RAG."}],
        }

    # Vectorize the text query
    query_sparse = vectorizer.transform([claim])
    query_dense = query_sparse.toarray().astype(np.float32)
    faiss.normalize_L2(query_dense)
    
    # FAISS search
    D, I = faiss_index.search(query_dense, min(top_k, len(records)))
    
    # Extract distances and indices
    top_sims = D[0]
    top_idxs = I[0]

    groundedness = float(np.mean(top_sims)) if len(top_sims) > 0 else 0.0

    # Truth score logic
    truth_score = min(groundedness / RAG_SIMILARITY_THRESHOLD, 1.0)

    citations = []
    for idx, sim in zip(top_idxs, top_sims):
        if idx == -1: # FAISS padding if not enough valid documents
            continue
        rec = records[idx]
        snippet = rec["content"][:200] + "..." if len(rec["content"]) > 200 else rec["content"]
        citations.append({
            "title": rec["title"],
            "source": rec["source"],
            "similarity": round(float(sim), 4),
            "snippet": snippet,
        })

    return {
        "truth_score": round(truth_score, 4),
        "groundedness": round(groundedness, 4),
        "citations": citations,
    }
