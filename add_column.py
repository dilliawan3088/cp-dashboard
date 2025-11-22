import sqlite3

# Connect to the database
conn = sqlite3.connect('poultry_dashboard.db')
cursor = conn.cursor()

try:
    # Add the missing column
    cursor.execute("ALTER TABLE overall_summary ADD COLUMN total_non_halal INTEGER DEFAULT 0;")
    conn.commit()
    print("✅ Column 'total_non_halal' added successfully to 'overall_summary' table!")
except sqlite3.OperationalError as e:
    if "duplicate column name" in str(e).lower():
        print("⚠️ Column 'total_non_halal' already exists!")
    else:
        print(f"❌ Error: {e}")
finally:
    conn.close()
