"""Quick E2E test: voice upload -> draft -> confirm invoice."""
from __future__ import annotations

import io
import json
import struct
import sys
import wave
from pathlib import Path

import requests
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

BASE = "http://127.0.0.1:8000/api/v1"


def make_silent_wav(seconds: float = 1.0) -> bytes:
    buf = io.BytesIO()
    rate = 16000
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(struct.pack("<h", 0) * int(rate * seconds))
    return buf.getvalue()


def main() -> int:
    wav_bytes = make_silent_wav(1.0)

    creds = [
        ("admin@blulabs.in", "Admin@12345"),
        ("afroj+test.1@blulabs.in", "Test@12345"),
    ]
    token = None
    for email, password in creds:
        r = requests.post(
            f"{BASE}/auth/login",
            json={"email": email, "password": password},
            timeout=15,
        )
        if r.status_code == 200:
            print(f"LOGIN OK: {email}")
            token = r.json()["access_token"]
            break
    if not token:
        print("LOGIN FAILED")
        return 1

    headers = {"Authorization": f"Bearer {token}"}

    t = requests.get(f"{BASE}/invoice-templates", headers=headers, timeout=15)
    print("templates:", t.status_code, len(t.json()) if t.ok else t.text[:200])

    files = {"audio_file": ("test.wav", wav_bytes, "audio/wav")}
    r = requests.post(f"{BASE}/voice/upload", headers=headers, files=files, timeout=120)
    print("upload:", r.status_code)
    if not r.ok:
        print(r.text[:600])
        return 2

    data = r.json()
    print("transcript:", repr(data.get("transcript", "")[:200]))
    recording_id = data["recording_id"]

    body: dict = {"recording_id": recording_id}
    if t.ok and t.json():
        body["template_id"] = t.json()[0]["id"]

    r2 = requests.post(f"{BASE}/voice/drafts", headers=headers, json=body, timeout=120)
    print("draft:", r2.status_code)
    if not r2.ok:
        print(r2.text[:600])
        return 3

    draft = r2.json()
    print(
        "draft_id=", draft["id"],
        "items=", len(draft["items"]),
        "grand_total=", draft["grand_total"],
    )

    draft_id = draft["id"]
    r3 = requests.post(f"{BASE}/voice/drafts/{draft_id}/confirm", headers=headers, timeout=60)
    print("confirm:", r3.status_code)
    if not r3.ok:
        print(r3.text[:600])
        return 4

    print("SUCCESS:", json.dumps(r3.json(), indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
