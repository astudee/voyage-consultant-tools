import streamlit as st
import snowflake.connector

st.set_page_config(page_title="Snowflake Test", page_icon="❄️")

st.title("❄️ Snowflake Test")
st.markdown("Verify database connectivity by writing and reading test records.")

# Cached Snowflake connection for reads
@st.cache_resource
def _get_cached_connection():
    return snowflake.connector.connect(
        account=st.secrets["snowflake"]["account"],
        user=st.secrets["snowflake"]["user"],
        password=st.secrets["snowflake"]["password"],
        warehouse=st.secrets["snowflake"]["warehouse"],
        database=st.secrets["snowflake"]["database"],
        schema=st.secrets["snowflake"]["schema"]
    )

def get_read_cursor():
    """Get a cursor from the cached connection for read operations."""
    try:
        conn = _get_cached_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        cursor.fetchone()
        cursor.close()
        return conn.cursor()
    except Exception:
        _get_cached_connection.clear()
        conn = _get_cached_connection()
        return conn.cursor()

def get_write_connection():
    """Get a fresh connection for write operations."""
    return snowflake.connector.connect(
        account=st.secrets["snowflake"]["account"],
        user=st.secrets["snowflake"]["user"],
        password=st.secrets["snowflake"]["password"],
        warehouse=st.secrets["snowflake"]["warehouse"],
        database=st.secrets["snowflake"]["database"],
        schema=st.secrets["snowflake"]["schema"]
    )

# Input form
st.markdown("### Write a Record")
user_text = st.text_input("Enter some text:")

if st.button("Submit to Snowflake"):
    if user_text.strip():
        try:
            conn = get_write_connection()
            cursor = conn.cursor()
            # Get next sequential ID
            cursor.execute("SELECT COALESCE(MAX(id), 0) + 1 FROM test_input")
            next_id = cursor.fetchone()[0]
            cursor.execute(
                "INSERT INTO test_input (id, user_text) VALUES (%s, %s)",
                (next_id, user_text)
            )
            conn.commit()
            cursor.close()
            conn.close()
            st.success("✅ Record saved to Snowflake!")
        except Exception as e:
            st.error(f"❌ Error: {e}")
    else:
        st.warning("Please enter some text first.")

# Show existing records
st.markdown("---")
st.markdown("### Recent Records")

if st.button("Refresh Data"):
    st.rerun()

try:
    cursor = get_read_cursor()
    cursor.execute("SELECT id, user_text, created_at FROM test_input ORDER BY created_at DESC LIMIT 10")
    rows = cursor.fetchall()
    cursor.close()

    if rows:
        for row in rows:
            st.write(f"**{row[0]}** | {row[1]} | {row[2]}")
    else:
        st.info("No records yet.")
except Exception as e:
    st.error(f"❌ Could not load records: {e}")
