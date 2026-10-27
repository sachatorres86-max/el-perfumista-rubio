from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_admin, require_staff
from app.core.utils import unique_slug
from app.models import Note, OlfactoryFamily, Product, ProductNote, User
from app.schemas import FamilyIn, FamilyOut, MessageOut, NoteIn, NoteOut

router = APIRouter(prefix="/api/admin", tags=["admin · catálogo"])


# ------------------------------------------------------------------ familias


@router.get("/familias", response_model=list[FamilyOut])
def list_families(
    db: Session = Depends(get_db),
    _: User = Depends(require_staff),
) -> list[dict]:
    rows = db.execute(
        select(OlfactoryFamily, func.count(Product.id))
        .outerjoin(Product, Product.family_id == OlfactoryFamily.id)
        .group_by(OlfactoryFamily.id)
        .order_by(OlfactoryFamily.sort_order, OlfactoryFamily.name)
    ).all()
    return [
        {
            "id": family.id,
            "name": family.name,
            "slug": family.slug,
            "description": family.description,
            "product_count": count,
        }
        for family, count in rows
    ]


@router.post("/familias", response_model=FamilyOut, status_code=status.HTTP_201_CREATED)
def create_family(
    payload: FamilyIn,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> dict:
    if db.scalar(select(OlfactoryFamily.id).where(func.lower(OlfactoryFamily.name) == payload.name.lower())):
        raise HTTPException(status_code=400, detail="Ya existe una familia con ese nombre")

    family = OlfactoryFamily(
        name=payload.name.strip(),
        slug=unique_slug(db, OlfactoryFamily, payload.slug or payload.name),
        description=payload.description,
        sort_order=payload.sort_order,
    )
    db.add(family)
    db.commit()
    db.refresh(family)
    return {
        "id": family.id,
        "name": family.name,
        "slug": family.slug,
        "description": family.description,
        "product_count": 0,
    }


@router.put("/familias/{family_id}", response_model=FamilyOut)
def update_family(
    family_id: int,
    payload: FamilyIn,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> dict:
    family = db.get(OlfactoryFamily, family_id)
    if not family:
        raise HTTPException(status_code=404, detail="Familia no encontrada")

    duplicate = db.scalar(
        select(OlfactoryFamily.id).where(
            func.lower(OlfactoryFamily.name) == payload.name.lower(),
            OlfactoryFamily.id != family_id,
        )
    )
    if duplicate:
        raise HTTPException(status_code=400, detail="Ya existe una familia con ese nombre")

    family.name = payload.name.strip()
    family.description = payload.description
    family.sort_order = payload.sort_order
    if payload.slug and payload.slug != family.slug:
        family.slug = unique_slug(db, OlfactoryFamily, payload.slug, exclude_id=family.id)

    db.commit()
    db.refresh(family)
    count = db.scalar(
        select(func.count(Product.id)).where(Product.family_id == family.id)
    ) or 0
    return {
        "id": family.id,
        "name": family.name,
        "slug": family.slug,
        "description": family.description,
        "product_count": count,
    }


@router.delete("/familias/{family_id}", response_model=MessageOut)
def delete_family(
    family_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> MessageOut:
    family = db.get(OlfactoryFamily, family_id)
    if not family:
        raise HTTPException(status_code=404, detail="Familia no encontrada")

    count = db.scalar(select(func.count(Product.id)).where(Product.family_id == family.id)) or 0
    if count:
        raise HTTPException(
            status_code=409,
            detail="No se puede eliminar una familia con productos asociados",
        )

    db.delete(family)
    db.commit()
    return MessageOut(message="Familia eliminada")


# ------------------------------------------------------------------ notas


@router.get("/notas", response_model=list[NoteOut])
def list_notes(
    db: Session = Depends(get_db),
    _: User = Depends(require_staff),
) -> list[dict]:
    rows = db.execute(
        select(Note, func.count(ProductNote.id))
        .outerjoin(ProductNote, ProductNote.note_id == Note.id)
        .group_by(Note.id)
        .order_by(Note.name)
    ).all()
    return [
        {
            "id": note.id,
            "name": note.name,
            "slug": note.slug,
            "usage_count": count,
        }
        for note, count in rows
    ]


@router.post("/notas", response_model=NoteOut, status_code=status.HTTP_201_CREATED)
def create_note(
    payload: NoteIn,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> dict:
    if db.scalar(select(Note.id).where(func.lower(Note.name) == payload.name.lower())):
        raise HTTPException(status_code=400, detail="Ya existe una nota con ese nombre")

    note = Note(
        name=payload.name.strip(),
        slug=unique_slug(db, Note, payload.slug or payload.name),
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return {"id": note.id, "name": note.name, "slug": note.slug, "usage_count": 0}


@router.put("/notas/{note_id}", response_model=NoteOut)
def update_note(
    note_id: int,
    payload: NoteIn,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> dict:
    note = db.get(Note, note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Nota no encontrada")

    duplicate = db.scalar(
        select(Note.id).where(
            func.lower(Note.name) == payload.name.lower(),
            Note.id != note_id,
        )
    )
    if duplicate:
        raise HTTPException(status_code=400, detail="Ya existe una nota con ese nombre")

    note.name = payload.name.strip()
    if payload.slug and payload.slug != note.slug:
        note.slug = unique_slug(db, Note, payload.slug, exclude_id=note.id)

    db.commit()
    db.refresh(note)
    count = db.scalar(select(func.count(ProductNote.id)).where(ProductNote.note_id == note.id)) or 0
    return {"id": note.id, "name": note.name, "slug": note.slug, "usage_count": count}


@router.delete("/notas/{note_id}", response_model=MessageOut)
def delete_note(
    note_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> MessageOut:
    note = db.get(Note, note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Nota no encontrada")

    count = db.scalar(select(func.count(ProductNote.id)).where(ProductNote.note_id == note.id)) or 0
    if count:
        raise HTTPException(
            status_code=409,
            detail="No se puede eliminar una nota asociada a productos",
        )

    db.delete(note)
    db.commit()
    return MessageOut(message="Nota eliminada")
