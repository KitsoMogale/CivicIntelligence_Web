"""Explicit batch ingestion: python -m backend.embed. Requires server credentials."""
from sqlalchemy import select
from sqlalchemy.orm import Session
from backend.database import engine, EntityRecord
from backend.semantic import generate_embeddings
def main():
    with Session(engine()) as session:
        records = list(session.scalars(select(EntityRecord).where(EntityRecord.embedding.is_(None))))
        for start in range(0, len(records), 20):
            batch = records[start:start + 20]
            vectors = generate_embeddings([r.record["name"] + "\n" + r.record["description"] for r in batch])
            for record, vector in zip(batch, vectors, strict=True):
                record.embedding = vector
            session.commit()
        print(f"Embedded {len(records)} entity records.")
if __name__ == "__main__":
    main()
