from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()
engine = create_engine(os.environ["DATABASE_URL"])

with engine.begin() as conn:
    conn.execute(text("UPDATE invoice_templates SET status = 'inactive'"))
    conn.execute(text("UPDATE invoice_templates SET status = 'active' WHERE template_name = 'GST Tax Invoice'"))
    rows = conn.execute(
        text("SELECT template_name, status, template_json->>'invoice_prefix' FROM invoice_templates ORDER BY template_name")
    ).fetchall()
    for row in rows:
        print(row)
