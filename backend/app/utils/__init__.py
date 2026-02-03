from datetime import datetime, timezone
import uuid


def generate_uuid() -> str:
    return str(uuid.uuid4())


def get_time() -> datetime:
    return datetime.now(timezone.utc)
