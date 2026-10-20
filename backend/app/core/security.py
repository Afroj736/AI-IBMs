from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config.settings import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_token(subject: str, expires_delta: timedelta, token_type: str, token_version: int = 1) -> str:
    expire = datetime.now(timezone.utc) + expires_delta
    payload = {"sub": subject, "exp": expire, "type": token_type, "tv": token_version}
    key = settings.jwt_refresh_secret_key if token_type == "refresh" else settings.jwt_secret_key
    return jwt.encode(payload, key, algorithm=ALGORITHM)


def create_access_token(subject: str, token_version: int = 1) -> str:
    return create_token(subject, timedelta(minutes=settings.jwt_access_expire_minutes), "access", token_version)


def create_refresh_token(subject: str, token_version: int = 1) -> str:
    return create_token(subject, timedelta(days=settings.jwt_refresh_expire_days), "refresh", token_version)


def decode_token(token: str) -> dict:
    for key in [settings.jwt_secret_key, settings.jwt_refresh_secret_key]:
        try:
            return jwt.decode(token, key, algorithms=[ALGORITHM])
        except JWTError:
            continue
    raise ValueError("Invalid token")
