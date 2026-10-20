"""
SmartBill AI — Platform Admin Portal (Streamlit)

Run: streamlit run app.py
"""

from __future__ import annotations

import os

import pandas as pd
import streamlit as st
from dotenv import load_dotenv

from api_client import AdminApiClient, AdminApiError

load_dotenv()

st.set_page_config(
    page_title="SmartBill Admin",
    page_icon="🛡️",
    layout="wide",
    initial_sidebar_state="expanded",
)

ROLES = ["", "admin", "owner", "manager", "accountant", "sales_staff", "store_operator"]

NAV_ITEMS = ("Dashboard", "Users", "Bills")


def get_client() -> AdminApiClient:
    if "api" not in st.session_state:
        st.session_state.api = AdminApiClient()
    client: AdminApiClient = st.session_state.api
    token = st.session_state.get("admin_token")
    if token:
        client.set_token(token)
    return client


def require_login() -> bool:
    return bool(st.session_state.get("admin_user"))


def login_page() -> None:
    st.title("SmartBill AI — Admin Portal")
    st.caption("Platform administrator access only")

    with st.form("login_form"):
        email = st.text_input("Email", value=os.getenv("ADMIN_EMAIL", ""))
        password = st.text_input("Password", type="password", value=os.getenv("ADMIN_PASSWORD", ""))
        submitted = st.form_submit_button("Sign in", type="primary", use_container_width=True)

    if submitted:
        try:
            client = get_client()
            me = client.login(email.strip(), password)
            st.session_state.admin_user = me
            st.session_state.admin_token = client._token
            st.success(f"Signed in as {me.get('name')} ({me.get('role')})")
            st.rerun()
        except AdminApiError as exc:
            st.error(str(exc))

    st.info(
        "Create a platform admin: `python seed_admin.py` from the admin folder. "
        "Default login: `admin@blulabs.in` / `Admin@12345` (set `ADMIN_EMAIL` in `.env`)."
    )


def sidebar() -> str:
    with st.sidebar:
        st.markdown("### SmartBill Admin")
        user = st.session_state.admin_user
        st.markdown(f"**{user.get('name')}**")
        st.caption(f"Role: {user.get('role')}")
        st.divider()
        st.markdown("**Navigation**")
        page = st.radio(
            "Navigation",
            NAV_ITEMS,
            key="admin_nav_page",
            label_visibility="collapsed",
        )
        st.divider()
        if st.button("Sign out", use_container_width=True):
            get_client().logout_local()
            st.session_state.pop("admin_user", None)
            st.session_state.pop("admin_token", None)
            st.session_state.pop("admin_nav_page", None)
            st.rerun()
    return page


def dashboard_tab() -> None:
    st.subheader("Overview")
    try:
        stats = get_client().dashboard()
    except AdminApiError as exc:
        st.error(str(exc))
        return

    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Users", stats["total_users"])
    c2.metric("Active users", stats["active_users"])
    c3.metric("Companies", stats["total_companies"])
    c4.metric("Invoices", stats["total_invoices"])

    st.markdown("#### Users by role")
    role_df = pd.DataFrame(
        [{"role": k, "count": v} for k, v in stats.get("users_by_role", {}).items()]
    )
    if not role_df.empty:
        st.dataframe(role_df, use_container_width=True, hide_index=True)
    else:
        st.write("No users yet.")


def users_tab() -> None:
    st.subheader("Registered users")

    fc1, fc2, fc3 = st.columns(3)
    with fc1:
        role_filter = st.selectbox("Filter by role", ROLES, format_func=lambda x: x or "All roles")
    with fc2:
        active_filter = st.selectbox("Account status", ["All", "Active", "Disabled"])
    with fc3:
        search = st.text_input("Search name or email")

    is_active = None
    if active_filter == "Active":
        is_active = True
    elif active_filter == "Disabled":
        is_active = False

    try:
        users = get_client().list_users(
            role=role_filter or None,
            search=search or None,
            is_active=is_active,
        )
    except AdminApiError as exc:
        st.error(str(exc))
        return

    st.caption(f"{len(users)} user(s)")

    if not users:
        st.info("No users match your filters.")
        return

    df = pd.DataFrame(users)
    st.dataframe(
        df[
            [
                "name",
                "email",
                "role",
                "company_name",
                "is_active",
                "created_at",
            ]
        ],
        use_container_width=True,
        hide_index=True,
    )

    st.markdown("#### Actions")
    user_options = {f"{u['name']} ({u['email']})": u["id"] for u in users}
    selected_label = st.selectbox("Select user", list(user_options.keys()))
    user_id = user_options[selected_label]

    ac1, ac2, ac3 = st.columns(3)
    with ac1:
        if st.button("Force logout", use_container_width=True):
            try:
                res = get_client().force_logout(user_id)
                st.success(res.get("message", "Done"))
            except AdminApiError as exc:
                st.error(str(exc))
    with ac2:
        if st.button("Disable & logout", use_container_width=True):
            try:
                res = get_client().disable_user(user_id)
                st.success(res.get("message", "Done"))
                st.rerun()
            except AdminApiError as exc:
                st.error(str(exc))
    with ac3:
        new_role = st.selectbox("Set role", ROLES[1:], key="set_role")
        if st.button("Update role", use_container_width=True):
            try:
                get_client().update_user(user_id, role=new_role)
                st.success(f"Role updated to {new_role}")
                st.rerun()
            except AdminApiError as exc:
                st.error(str(exc))


def bills_tab() -> None:
    st.subheader("Bills / invoices")

    bc1, bc2 = st.columns(2)
    with bc1:
        bill_role = st.selectbox("Filter by creator role", ROLES, key="bill_role", format_func=lambda x: x or "All roles")
    with bc2:
        bill_search = st.text_input("Search invoice, party, or creator", key="bill_search")

    try:
        bills = get_client().list_bills(role=bill_role or None, search=bill_search or None)
    except AdminApiError as exc:
        st.error(str(exc))
        return

    if not bills:
        st.info("No bills found. New invoices will show creator once staff create them in the app.")
        return

    df = pd.DataFrame(bills)
    display_cols = [
        "invoice_number",
        "party_name",
        "grand_total",
        "payment_status",
        "invoice_date",
        "created_by_name",
        "created_by_role",
        "created_by_email",
        "created_at",
    ]
    st.dataframe(df[display_cols], use_container_width=True, hide_index=True)

    missing = df["created_by_name"].isna().sum() if "created_by_name" in df.columns else 0
    if missing:
        st.caption(f"{missing} invoice(s) have no creator recorded (created before attribution was added).")


def main() -> None:
    if not require_login():
        login_page()
        return

    page = sidebar()
    st.title(page)

    if page == "Dashboard":
        dashboard_tab()
    elif page == "Users":
        users_tab()
    elif page == "Bills":
        bills_tab()


if __name__ == "__main__":
    main()
