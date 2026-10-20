from fastapi import APIRouter, Depends, HTTPException, status

from app.auth.dependencies import get_current_user
from app.gst.schemas import GSTLookupResponse
from app.gst.service import GSTLookupError, is_valid_gstin, lookup_gst_details, normalize_gstin
from app.models.user import User

router = APIRouter(prefix="/gst", tags=["GST Lookup"])


@router.get("/lookup/{gstin}", response_model=GSTLookupResponse)
def lookup_gst(
    gstin: str,
    _: User = Depends(get_current_user),
):
    normalized = normalize_gstin(gstin)
    if not is_valid_gstin(normalized):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Please enter a valid GST number.",
        )

    try:
        details = lookup_gst_details(normalized)
    except GSTLookupError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc

    return GSTLookupResponse(**details)
