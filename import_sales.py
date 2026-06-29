import os
import sqlite3
import pandas as pd
import numpy as np
import json
from pathlib import Path

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(SCRIPT_DIR, "philos_sales.db")

def load_config():
    config_path = Path(__file__).parent / "settings.json"
    if not config_path.exists():
        print(f"Error: Config file not found at {config_path}")
        import sys
        sys.exit(1)
    with open(config_path, "r") as f:
        return json.load(f)

config = load_config()
channels_config = config.get("channels", [])
def get_db_connection():
    conn = sqlite3.connect(DB_PATH, timeout=30.0)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Create orders table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS orders (
        order_id TEXT PRIMARY KEY,
        channel TEXT NOT NULL,
        original_order_id TEXT NOT NULL,
        order_date DATETIME NOT NULL,
        status TEXT,
        subtotal REAL DEFAULT 0.0,
        packaging_charge REAL DEFAULT 0.0,
        delivery_charge REAL DEFAULT 0.0,
        discount REAL DEFAULT 0.0,
        tax REAL DEFAULT 0.0,
        grand_total REAL DEFAULT 0.0,
        commission REAL DEFAULT 0.0,
        other_charges REAL DEFAULT 0.0,
        net_payout REAL DEFAULT 0.0,
        items_summary TEXT,
        customer_name TEXT,
        customer_phone TEXT,
        order_type TEXT,
        sub_order_type TEXT
    )
    """)
    
    # Create order_payments table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS order_payments (
        payment_id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id TEXT NOT NULL,
        payment_type TEXT NOT NULL,
        amount REAL NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE
    )
    """)
    
    conn.commit()
    conn.close()
    print("Database initialized successfully.")

def find_header_and_read(path, sheet_name, keywords):
    df = pd.read_excel(path, sheet_name=sheet_name, header=None)
    for idx, row in df.iterrows():
        row_str = [str(val).strip() for val in row.tolist() if pd.notnull(val)]
        if all(any(kw in val for val in row_str) for kw in keywords):
            # Re-read Excel from this row index
            return pd.read_excel(path, sheet_name=sheet_name, header=idx), idx
    raise ValueError(f"Could not find header row with keywords {keywords}")

def parse_counter(folder, channel_name="Counter"):
    print(f"Parsing {channel_name} sales...")
    if not os.path.exists(folder):
        print(f"{channel_name} folder {folder} not found.")
        return []
    
    orders = {}
    files = sorted([f for f in os.listdir(folder) if f.endswith('.xlsx')])
    
    for file in files:
        path = os.path.join(folder, file)
        print(f"  Reading Counter file: {file}")
        try:
            df, idx = find_header_and_read(path, 'Sheet1', ['Order No.', 'Items', 'Grand Total'])
            
            # Temporary holder for the current order when parsing lines
            current_order_id = None
            
            for i, row in df.iterrows():
                order_no_val = row.get('Order No.')
                if pd.isnull(order_no_val):
                    continue
                    
                order_no_str = str(order_no_val).strip()
                # Skip total rows or non-numeric order numbers
                if not order_no_str.replace('.', '', 1).isdigit():
                    continue
                    
                order_no = int(float(order_no_str))
                db_order_id = f"Counter_{order_no}"
                
                # Check if this row is a new main order or a payment split
                created_val = row.get('Created')
                items_val = row.get('Items')
                
                if pd.notnull(created_val) and pd.notnull(items_val):
                    # Main Order Row
                    current_order_id = db_order_id
                    
                    subtotal = float(row.get('My Amount (₹)', 0.0))
                    discount = float(row.get('Total Discount (₹)', 0.0))
                    tax = float(row.get('Total Tax (₹)', 0.0))
                    round_off = float(row.get('Round Off (₹)', 0.0))
                    
                    # For Counter, use Grand Total (₹) directly if > 0, else calculate (e.g. for Part Payments)
                    grand_total = float(row.get('Grand Total (₹)', 0.0))
                    if grand_total == 0.0:
                        grand_total = subtotal + tax - discount + round_off
                    
                    # Payment Type on main row
                    pay_type = str(row.get('Payment Type', 'Cash')).strip()
                    
                    # Clean customer info if present
                    cust_name = str(row.get('Customer Name')) if pd.notnull(row.get('Customer Name')) else None
                    cust_phone = str(row.get('Customer Phone')) if pd.notnull(row.get('Customer Phone')) else None
                    
                    orders[db_order_id] = {
                        "order_id": db_order_id,
                        "channel": "Counter",
                        "original_order_id": str(order_no),
                        "order_date": pd.to_datetime(created_val, format='mixed').strftime('%Y-%m-%d %H:%M:%S'),
                        "status": str(row.get('Status', 'Printed')).strip(),
                        "subtotal": subtotal,
                        "packaging_charge": 0.0,
                        "delivery_charge": float(row.get('Delivery Charge (₹)', 0.0)),
                        "discount": discount,
                        "tax": tax,
                        "grand_total": grand_total,
                        "commission": 0.0,
                        "other_charges": 0.0,
                        "net_payout": grand_total,
                        "items_summary": str(items_val).strip(),
                        "customer_name": cust_name,
                        "customer_phone": cust_phone,
                        "order_type": str(row.get('Order Type', 'Dine In')).strip(),
                        "sub_order_type": str(row.get('Sub Order Type', '')).strip() if pd.notnull(row.get('Sub Order Type')) else None,
                        "payments": []
                    }
                    
                    # If it's not a part payment, record the payment details
                    if pay_type != "Part Payment" and grand_total > 0:
                        orders[db_order_id]["payments"].append({
                            "payment_type": pay_type,
                            "amount": grand_total
                        })
                else:
                    # Payment split row
                    # It should belong to the current_order_id or match the order_no
                    target_order_id = db_order_id
                    if target_order_id in orders:
                        pay_type = str(row.get('Payment Type', 'Cash')).strip()
                        # For split row, the paid amount is in 'Grand Total (₹)'
                        amount = float(row.get('Grand Total (₹)', 0.0))
                        if amount > 0 and pay_type != 'nan':
                            orders[target_order_id]["payments"].append({
                                "payment_type": pay_type,
                                "amount": amount
                            })
        except Exception as e:
            print(f"Error parsing Counter file {file}: {e}")
            
    print(f"Parsed {len(orders)} Counter orders.")
    return list(orders.values())

def parse_zomato(folder, channel_name="Zomato"):
    print(f"Parsing {channel_name} sales...")
    if not os.path.exists(folder):
        print(f"{channel_name} folder {folder} not found.")
        return []
    
    orders = {}
    files = sorted([f for f in os.listdir(folder) if f.endswith('.xlsx')])
    
    for file in files:
        path = os.path.join(folder, file)
        try:
            df, idx = find_header_and_read(path, 'Order Level', ['Order ID', 'Order Date', 'Res. name'])
            for i, row in df.iterrows():
                order_id_val = row.get('Order ID')
                if pd.isnull(order_id_val):
                    continue
                order_id_str = str(order_id_val).strip()
                if not order_id_str.isdigit():
                    continue
                
                db_order_id = f"Zomato_{order_id_str}"
                
                subtotal = float(row.get('Subtotal (items total)', 0.0))
                packaging = float(row.get('Packaging charge', 0.0))
                delivery = float(row.get('Delivery charge for restaurants on self logistics', 0.0))
                
                promo_discount = float(row.get('Restaurant discount [Promo]', 0.0))
                other_discount = float(row.get('Restaurant Discount [BOGO, Freebies, Gold, Brand pack & others]', 0.0))
                discount = promo_discount + other_discount
                
                tax = float(row.get('Total GST collected from customers', 0.0))
                grand_total = float(row.get('Net order value\n[(1) + (2) + (3) - (4) - (5) + (6) - (7) + (8)]', 0.0))
                if grand_total == 0.0:
                    # Fallback formula
                    grand_total = subtotal + packaging + delivery - discount + tax
                    
                service_fee = float(row.get('Service fee\n[ (9) * (10) ]', 0.0))
                pay_mechanism_fee = float(row.get('Payment mechanism fee', 0.0))
                commission = service_fee + pay_mechanism_fee
                
                gov_charges = float(row.get('Government charges\n[(13) + (16) + (17) + (18) + (19)]', 0.0))
                other_ded = float(row.get('Other order-level deductions\n[(21) + (22) + (23) + (24) + (25) + (26) + (27) + (28)]', 0.0))
                service_tax = float(row.get('Taxes on service & payment mechanism fees\n(B) * 18%', 0.0))
                other_charges = gov_charges + other_ded + service_tax
                
                net_payout = float(row.get('Order level Payout\n(A) - (E) + (F)', 0.0))
                
                pay_type = str(row.get('Mode of payment', 'ONLINE')).strip()
                
                orders[db_order_id] = {
                    "order_id": db_order_id,
                    "channel": "Zomato",
                    "original_order_id": order_id_str,
                    "order_date": pd.to_datetime(row.get('Order Date'), format='mixed').strftime('%Y-%m-%d %H:%M:%S'),
                    "status": str(row.get('Order status (Delivered/ Cancelled/ Rejected)', 'DELIVERED')).strip(),
                    "subtotal": subtotal,
                    "packaging_charge": packaging,
                    "delivery_charge": delivery,
                    "discount": discount,
                    "tax": tax,
                    "grand_total": grand_total,
                    "commission": commission,
                    "other_charges": other_charges,
                    "net_payout": net_payout,
                    "items_summary": None,
                    "customer_name": None,
                    "customer_phone": None,
                    "order_type": str(row.get('Order type', 'O2')).strip(),
                    "sub_order_type": None,
                    "payments": [{
                        "payment_type": pay_type,
                        "amount": grand_total
                    }]
                }
        except Exception as e:
            print(f"Error parsing Zomato file {file}: {e}")
            
    print(f"Parsed {len(orders)} Zomato orders.")
    return list(orders.values())

def parse_swiggy(folder, channel_name="Swiggy"):
    print(f"Parsing {channel_name} sales...")
    if not os.path.exists(folder):
        print(f"{channel_name} folder {folder} not found.")
        return []
    
    orders = {}
    files = sorted([f for f in os.listdir(folder) if f.endswith('.xlsx')])
    
    for file in files:
        path = os.path.join(folder, file)
        try:
            df, idx = find_header_and_read(path, 'Order Level', ['Order ID', 'Order Date', 'Order Status'])
            for i, row in df.iterrows():
                order_id_val = row.get('Order ID')
                if pd.isnull(order_id_val):
                    continue
                order_id_str = str(order_id_val).strip()
                if not order_id_str.isdigit():
                    continue
                
                db_order_id = f"Swiggy_{order_id_str}"
                
                subtotal = float(row.get('Item Total', 0.0))
                packaging = float(row.get('Packaging Charges', 0.0))
                discount = float(row.get('Restaurant Discount Share [3a+3b]', 0.0))
                tax = float(row.get('GST Collected', 0.0))
                grand_total = float(row.get('Total Customer Paid [4+5]', 0.0))
                
                commission = float(row.get('Commission', 0.0))
                total_swiggy_fees = float(row.get('Total Swiggy Fees\n[6+7+8-9+10+11+12+13+14+15+16]', 0.0))
                total_taxes = float(row.get('Total Taxes\n[19+20+21]', 0.0))
                
                other_charges = total_swiggy_fees - commission + total_taxes
                net_payout = float(row.get('Net Payout for Order (after taxes)\n[A-B-C-D]', 0.0))
                
                pay_type = str(row.get('Order Payment Type', 'ONLINE')).strip()
                
                orders[db_order_id] = {
                    "order_id": db_order_id,
                    "channel": "Swiggy",
                    "original_order_id": order_id_str,
                    "order_date": pd.to_datetime(row.get('Order Date'), format='mixed').strftime('%Y-%m-%d %H:%M:%S'),
                    "status": str(row.get('Order Status', 'delivered')).strip(),
                    "subtotal": subtotal,
                    "packaging_charge": packaging,
                    "delivery_charge": 0.0, # Not explicitly detailed at order level for restaurant payouts
                    "discount": discount,
                    "tax": tax,
                    "grand_total": grand_total,
                    "commission": commission,
                    "other_charges": other_charges,
                    "net_payout": net_payout,
                    "items_summary": None,
                    "customer_name": None,
                    "customer_phone": None,
                    "order_type": str(row.get('Order Category', 'Swiggy')).strip(),
                    "sub_order_type": None,
                    "payments": [{
                        "payment_type": pay_type,
                        "amount": grand_total
                    }]
                }
        except Exception as e:
            print(f"Error parsing Swiggy file {file}: {e}")
            
    print(f"Parsed {len(orders)} Swiggy orders.")
    return list(orders.values())

def import_all(progress_callback=None):
    def log_progress(msg):
        print(msg)
        if progress_callback:
            progress_callback(msg)
            
    log_progress("Initializing sales database tables...")
    init_db()
    
    all_orders = []
    stats = {}
    
    for ch in channels_config:
        folder = os.path.join(SCRIPT_DIR, ch.get("import_folder", ""))
        name = ch["name"]
        slug = ch["id"]
        
        parsed_orders = []
        if slug == "counter":
            parsed_orders = parse_counter(folder, name)
        elif slug == "zomato":
            parsed_orders = parse_zomato(folder, name)
        elif slug == "swiggy":
            parsed_orders = parse_swiggy(folder, name)
        else:
            log_progress(f"No specific parser found for channel slug '{slug}'. Skipping.")
            
        all_orders.extend(parsed_orders)
        stats[slug] = len(parsed_orders)
        log_progress(f"{name} parsing complete: parsed {len(parsed_orders)} orders.")
    
    log_progress(f"Total parsed orders from all channels: {len(all_orders)}. Starting database import...")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Disable foreign key constraints during import for speed
    cursor.execute("PRAGMA foreign_keys = OFF")
    
    orders_inserted = 0
    payments_inserted = 0
    
    # Use transactional block for fast insertions
    cursor.execute("BEGIN TRANSACTION")
    
    for idx, order in enumerate(all_orders):
        if idx % 1000 == 0 and idx > 0:
            log_progress(f"Saving sales orders: {idx}/{len(all_orders)} stored...")
            
        try:
            cursor.execute("""
            INSERT OR REPLACE INTO orders (
                order_id, channel, original_order_id, order_date, status,
                subtotal, packaging_charge, delivery_charge, discount, tax,
                grand_total, commission, other_charges, net_payout, items_summary,
                customer_name, customer_phone, order_type, sub_order_type
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                order["order_id"], order["channel"], order["original_order_id"], order["order_date"], order["status"],
                order["subtotal"], order["packaging_charge"], order["delivery_charge"], order["discount"], order["tax"],
                order["grand_total"], order["commission"], order["other_charges"], order["net_payout"], order["items_summary"],
                order["customer_name"], order["customer_phone"], order.get("order_type"), order.get("sub_order_type")
            ))
            orders_inserted += 1
            
            # Clear previous payments if updating order
            cursor.execute("DELETE FROM order_payments WHERE order_id = ?", (order["order_id"],))
            
            for payment in order["payments"]:
                cursor.execute("""
                INSERT INTO order_payments (order_id, payment_type, amount)
                VALUES (?, ?, ?)
                """, (order["order_id"], payment["payment_type"], payment["amount"]))
                payments_inserted += 1
                
        except Exception as e:
            print(f"Error inserting order {order['order_id']}: {e}")
            
    cursor.execute("COMMIT")
    cursor.execute("PRAGMA foreign_keys = ON")
    
    # Vacuum database to optimize size
    log_progress("Sales import saved. Optimizing database file size (VACUUM)...")
    cursor.execute("VACUUM")
    conn.close()
    
    log_progress(f"Sales Import Complete: {orders_inserted} orders and {payments_inserted} payment details updated.")
    
    result_stats = {
        "orders_inserted": orders_inserted,
        "payments_inserted": payments_inserted
    }
    result_stats.update({f"{k}_orders": v for k, v in stats.items()})
    return result_stats

if __name__ == "__main__":
    import_all()
