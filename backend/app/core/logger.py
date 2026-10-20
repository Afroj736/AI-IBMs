import json
import logging


logger = logging.getLogger("inventory_ai")
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter("%(asctime)s %(levelname)s %(message)s")
    handler.setFormatter(formatter)
    logger.addHandler(handler)
logger.setLevel(logging.INFO)


def log_event(event: str, **payload):
    logger.info(json.dumps({"event": event, **payload}, default=str))
