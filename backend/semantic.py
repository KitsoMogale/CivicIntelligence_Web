import math
import os
from sqlalchemy import select
from sqlalchemy.orm import Session
from backend.database import engine, EntityRecord
def rank_vector(embedding: list[float], country: str, session: Session | None = None):
    if len(embedding) != 1536 or not all(math.isfinite(x) for x in embedding):
        raise ValueError("Expected 1536 finite vector components")
    if session is None:
        with Session(engine()) as connection:
            return rank_vector(embedding, country, connection)
    statement = select(EntityRecord).where(EntityRecord.country == country, EntityRecord.embedding.is_not(None)).order_by(EntityRecord.embedding.cosine_distance(embedding)).limit(8)
    return [row.record for row in session.scalars(statement)]
def generate_embeddings(texts: list[str], client=None):
    import httpx
    own_client = client is None
    client = client or httpx.Client(timeout=45)
    try:
        response = client.post("https://api.openai.com/v1/embeddings", headers={"Authorization": "Bearer " + os.environ["OPENAI_API_KEY"]}, json={"model": os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small"), "input": texts, "dimensions": 1536})
        response.raise_for_status()
        rows = sorted(response.json()["data"], key=lambda r: r["index"])
        vectors = [r["embedding"] for r in rows]
        if len(vectors) != len(texts) or any(len(v) != 1536 or not all(math.isfinite(x) for x in v) for v in vectors):
            raise ValueError("Invalid embedding response")
        return vectors
    finally:
        if own_client:
            client.close()
