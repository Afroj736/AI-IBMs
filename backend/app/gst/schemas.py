from pydantic import BaseModel, Field


class GSTLookupResponse(BaseModel):
    gstin: str
    legal_name: str
    trade_name: str
    pan: str
    address: str
    city: str = ""
    state: str
    pincode: str
    taxpayer_type: str
    registration_date: str
    status: str
