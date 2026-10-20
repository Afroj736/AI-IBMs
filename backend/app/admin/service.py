from uuid import UUID

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.admin.schemas import (
    AdminBillListItem,
    AdminDashboardStats,
    AdminForceLogoutResponse,
    AdminUserDetail,
    AdminUserListItem,
)
from app.models.company import Company
from app.models.invoice import Invoice
from app.models.party import Party
from app.models.user import User, UserRole


class AdminService:
    def __init__(self, db: Session):
        self.db = db

    def dashboard_stats(self) -> AdminDashboardStats:
        total_users = self.db.query(func.count(User.id)).scalar() or 0
        active_users = self.db.query(func.count(User.id)).filter(User.is_active.is_(True)).scalar() or 0
        total_companies = self.db.query(func.count(Company.id)).scalar() or 0
        total_invoices = self.db.query(func.count(Invoice.id)).scalar() or 0

        role_rows = self.db.query(User.role, func.count(User.id)).group_by(User.role).all()
        users_by_role = {row[0].value if hasattr(row[0], "value") else str(row[0]): row[1] for row in role_rows}

        return AdminDashboardStats(
            total_users=total_users,
            active_users=active_users,
            total_companies=total_companies,
            total_invoices=total_invoices,
            users_by_role=users_by_role,
        )

    def list_users(
        self,
        *,
        role: UserRole | None = None,
        search: str | None = None,
        company_id: UUID | None = None,
        is_active: bool | None = None,
    ) -> list[AdminUserListItem]:
        q = self.db.query(User, Company.business_name).outerjoin(Company, User.company_id == Company.id)

        if role:
            q = q.filter(User.role == role)
        if company_id:
            q = q.filter(User.company_id == company_id)
        if is_active is not None:
            q = q.filter(User.is_active.is_(is_active))
        if search:
            term = f"%{search.strip()}%"
            q = q.filter((User.name.ilike(term)) | (User.email.ilike(term)))

        rows = q.order_by(User.created_at.desc()).all()
        return [
            AdminUserListItem(
                id=str(user.id),
                name=user.name,
                email=user.email,
                role=user.role,
                company_id=str(user.company_id) if user.company_id else None,
                company_name=company_name,
                is_active=user.is_active,
                token_version=user.token_version,
                created_at=user.created_at,
            )
            for user, company_name in rows
        ]

    def get_user(self, user_id: UUID) -> AdminUserDetail | None:
        row = (
            self.db.query(User, Company.business_name, Company.mobile)
            .outerjoin(Company, User.company_id == Company.id)
            .filter(User.id == user_id)
            .first()
        )
        if not row:
            return None
        user, company_name, mobile = row
        return AdminUserDetail(
            id=str(user.id),
            name=user.name,
            email=user.email,
            role=user.role,
            company_id=str(user.company_id) if user.company_id else None,
            company_name=company_name,
            is_active=user.is_active,
            token_version=user.token_version,
            created_at=user.created_at,
            mobile=mobile,
        )

    def update_user(self, user_id: UUID, *, role: UserRole | None, is_active: bool | None) -> AdminUserDetail | None:
        user = self.db.get(User, user_id)
        if not user:
            return None
        if role is not None:
            if user.role == UserRole.ADMIN and role != UserRole.ADMIN:
                raise ValueError("Cannot change platform admin role from admin API")
            user.role = role
        if is_active is not None:
            user.is_active = is_active
        self.db.commit()
        self.db.refresh(user)
        return self.get_user(user_id)

    def force_logout(self, user_id: UUID) -> AdminForceLogoutResponse | None:
        user = self.db.get(User, user_id)
        if not user:
            return None
        if user.role == UserRole.ADMIN:
            raise ValueError("Cannot force-logout platform admin via this action")
        user.token_version += 1
        self.db.commit()
        self.db.refresh(user)
        return AdminForceLogoutResponse(
            user_id=str(user.id),
            message="All active sessions revoked for this user",
            token_version=user.token_version,
        )

    def list_bills(
        self,
        *,
        role: UserRole | None = None,
        user_id: UUID | None = None,
        search: str | None = None,
    ) -> list[AdminBillListItem]:
        Creator = User
        q = (
            self.db.query(Invoice, Party.name, Creator)
            .outerjoin(Party, Invoice.party_id == Party.id)
            .outerjoin(Creator, Invoice.created_by_user_id == Creator.id)
        )

        if role:
            q = q.filter(Creator.role == role)
        if user_id:
            q = q.filter(Invoice.created_by_user_id == user_id)
        if search:
            term = f"%{search.strip()}%"
            q = q.filter(
                (Invoice.invoice_number.ilike(term))
                | (Party.name.ilike(term))
                | (Creator.name.ilike(term))
                | (Creator.email.ilike(term))
            )

        rows = q.order_by(Invoice.created_at.desc()).limit(500).all()
        results: list[AdminBillListItem] = []
        for invoice, party_name, creator in rows:
            results.append(
                AdminBillListItem(
                    id=str(invoice.id),
                    invoice_number=invoice.invoice_number,
                    grand_total=invoice.grand_total,
                    payment_status=invoice.payment_status.value
                    if hasattr(invoice.payment_status, "value")
                    else str(invoice.payment_status),
                    invoice_date=str(invoice.invoice_date),
                    party_name=party_name,
                    created_by_user_id=str(creator.id) if creator else None,
                    created_by_name=creator.name if creator else None,
                    created_by_role=creator.role.value if creator else None,
                    created_by_email=creator.email if creator else None,
                    created_at=invoice.created_at,
                )
            )
        return results
