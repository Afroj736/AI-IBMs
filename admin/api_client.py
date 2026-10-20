"""HTTP client for SmartBill platform admin APIs."""

from __future__ import annotations

import os
from typing import Any

import requests

API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000/api/v1").rstrip("/")


class AdminApiError(Exception):
    def __init__(self, message: str, status_code: int | None = None):
        super().__init__(message)
        self.status_code = status_code


class AdminApiClient:
    def __init__(self, base_url: str = API_BASE_URL):
        self.base_url = base_url
        self._token: str | None = None

    def _headers(self) -> dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self._token:
            headers["Authorization"] = f"Bearer {self._token}"
        return headers

    def _request(self, method: str, path: str, **kwargs: Any) -> Any:
        url = f"{self.base_url}{path}"
        response = requests.request(method, url, headers=self._headers(), timeout=30, **kwargs)
        if response.status_code >= 400:
            detail = response.json().get("detail", response.text) if response.text else "Request failed"
            if isinstance(detail, list):
                detail = str(detail)
            raise AdminApiError(str(detail), response.status_code)
        if response.status_code == 204 or not response.text:
            return None
        return response.json()

    def set_token(self, token: str | None) -> None:
        self._token = token

    def login(self, email: str, password: str) -> dict[str, Any]:
        data = self._request("POST", "/auth/login", json={"email": email, "password": password})
        self.set_token(data["access_token"])
        me = self._request("GET", "/auth/me")
        if me.get("role") != "admin":
            self.set_token(None)
            raise AdminApiError("This account is not a platform admin")
        return me

    def logout_local(self) -> None:
        self.set_token(None)

    def dashboard(self) -> dict[str, Any]:
        return self._request("GET", "/admin/dashboard")

    def list_users(
        self,
        *,
        role: str | None = None,
        search: str | None = None,
        is_active: bool | None = None,
    ) -> list[dict[str, Any]]:
        params: dict[str, Any] = {}
        if role:
            params["role"] = role
        if search:
            params["search"] = search
        if is_active is not None:
            params["is_active"] = is_active
        return self._request("GET", "/admin/users", params=params)

    def list_bills(
        self,
        *,
        role: str | None = None,
        user_id: str | None = None,
        search: str | None = None,
    ) -> list[dict[str, Any]]:
        params: dict[str, Any] = {}
        if role:
            params["role"] = role
        if user_id:
            params["user_id"] = user_id
        if search:
            params["search"] = search
        return self._request("GET", "/admin/bills", params=params)

    def force_logout(self, user_id: str) -> dict[str, Any]:
        return self._request("POST", f"/admin/users/{user_id}/force-logout")

    def disable_user(self, user_id: str) -> dict[str, Any]:
        return self._request("POST", f"/admin/users/{user_id}/disable")

    def update_user(self, user_id: str, *, role: str | None = None, is_active: bool | None = None) -> dict[str, Any]:
        body: dict[str, Any] = {}
        if role is not None:
            body["role"] = role
        if is_active is not None:
            body["is_active"] = is_active
        return self._request("PATCH", f"/admin/users/{user_id}", json=body)
