from app.models.user import User
from app.schemas.user_profile import UserProfileSettingsPayload


def default_profile_settings(name: str, email: str) -> dict:
    parts = name.strip().split(maxsplit=1)
    first = parts[0] if parts else ""
    last = parts[1] if len(parts) > 1 else ""
    base = UserProfileSettingsPayload(
        first_name=first,
        last_name=last,
        display_name=email.split("@")[0] if email else first,
        username=email.split("@")[0].replace(".", "_") if email else "",
    )
    return base.model_dump()


def merge_profile_settings(raw: dict | None, *, name: str, email: str) -> UserProfileSettingsPayload:
    defaults = default_profile_settings(name, email)
    if not raw:
        return UserProfileSettingsPayload.model_validate(defaults)
    merged = {**defaults, **raw}
    if isinstance(raw.get("notification_prefs"), dict):
        merged["notification_prefs"] = {
            **defaults["notification_prefs"],
            **raw["notification_prefs"],
        }
    return UserProfileSettingsPayload.model_validate(merged)


def resolved_display_name(user: User, settings: UserProfileSettingsPayload) -> str:
    if settings.display_name.strip():
        return settings.display_name.strip()
    parts = [settings.first_name, settings.last_name]
    combined = " ".join(p for p in parts if p.strip())
    return combined or user.name
