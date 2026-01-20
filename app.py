import streamlit as st
import snowflake.connector

st.set_page_config(page_title="Voyage Consultant Tools", page_icon="🚀")

st.title("🚀 Voyage Consultant Tools")
st.markdown("### Test Input Form")

# Connect to Snowflake
def get_connection():
    return snowflake.connector.connect(
        account=st.secrets["snowflake"]["account"],
        user=st.secrets["snowflake"]["user"],
        password=st.secrets["snowflake"]["password"],
        warehouse=st.secrets["snowflake"]["warehouse"],
        database=st.secrets["snowflake"]["database"],
        schema=st.secrets["snowflake"]["schema"]
    )

# Input form
user_text = st.text_input("Enter some text:")

if st.button("Submit to Snowflake"):
    if user_text.strip():
        try:
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO test_input (user_text) VALUES (%s)",
                (user_text,)
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
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, user_text, created_at FROM test_input ORDER BY created_at DESC LIMIT 10")
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    
    if rows:
        for row in rows:
            st.write(f"**{row[0]}** | {row[1]} | {row[2]}")
    else:
        st.info("No records yet.")
except Exception as e:
    st.error(f"❌ Could not load records: {e}")
