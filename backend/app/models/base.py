from sqlalchemy.orm import DeclarativeBase


def pg_enum_values(enum_cls):
    """PostgreSQL enums store member values (e.g. 'admin'), not names ('ADMIN')."""
    return [member.value for member in enum_cls]


class Base(DeclarativeBase):
    pass
