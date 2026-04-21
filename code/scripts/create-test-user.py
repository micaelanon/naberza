#!/usr/bin/env python3

"""
Script to create a test admin user in PostgreSQL
Run: python3 scripts/create-test-user.py
"""

import os
import sys
import psycopg2
from psycopg2 import sql
from datetime import datetime

# Get database URL from environment
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://naberza:postgres@localhost:5432/naberza_dev")

def main():
    try:
        # Parse the connection string
        # Format: postgresql://user:password@host:port/database
        parts = DATABASE_URL.replace("postgresql://", "").split("@")
        user_part = parts[0].split(":")
        host_part = parts[1].split("/")

        user = user_part[0]
        password = user_part[1]
        host = host_part[0].split(":")[0]
        port = int(host_part[0].split(":")[1]) if ":" in host_part[0] else 5432
        database = host_part[1]

        print(f"Connecting to PostgreSQL at {host}:{port}/{database}...")

        # Connect to the database
        conn = psycopg2.connect(
            user=user,
            password=password,
            host=host,
            port=port,
            database=database
        )

        cursor = conn.cursor()

        # Check if user exists
        cursor.execute("SELECT id FROM users WHERE id = %s", ("admin",))
        existing = cursor.fetchone()

        if existing:
            print("✓ User 'admin' already exists")
            cursor.close()
            conn.close()
            return

        # Create the user
        now = datetime.now()
        cursor.execute(
            """
            INSERT INTO users (id, email, name, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s)
            """,
            ("admin", "admin@naberza.local", "Admin", now, now)
        )

        conn.commit()
        print("✓ Created user 'admin' successfully")
        print(f"  Email: admin@naberza.local")
        print(f"  Name: Admin")

        cursor.close()
        conn.close()

    except Exception as error:
        print(f"✗ Error: {error}")
        sys.exit(1)

if __name__ == "__main__":
    main()
