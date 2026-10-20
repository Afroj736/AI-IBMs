# ER Diagram (Text)

```mermaid
erDiagram
  USERS {
    UUID id PK
    VARCHAR name
    VARCHAR email
    VARCHAR hashed_password
    ENUM role
    TIMESTAMPTZ created_at
  }

  ITEMS {
    UUID id PK
    VARCHAR item_name
    VARCHAR item_code
    VARCHAR sku
    VARCHAR barcode
    VARCHAR category
    VARCHAR sub_category
    VARCHAR brand
    VARCHAR model_number
    BOOLEAN serial_number_required
    VARCHAR hsn_code
    NUMERIC gst_percentage
    NUMERIC purchase_price
    NUMERIC selling_price
    INT minimum_stock
    INT current_stock
    TEXT description
    VARCHAR status
    TIMESTAMPTZ created_at
  }
```
