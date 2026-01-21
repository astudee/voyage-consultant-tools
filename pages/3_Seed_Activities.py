import streamlit as st
import snowflake.connector
import json

st.set_page_config(page_title="Seed Activities", page_icon="🌱")

st.title("🌱 Seed Activities Data")
st.markdown("Insert swimlane G and sample activities for the insurance workflow.")

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

# Define the data to insert
WORKFLOW_ID = 1  # Assuming workflow ID 1

# Swimlane to add
NEW_SWIMLANE = {
    "letter": "G",
    "name": "Outbound Correspondence",
    "display_order": 6
}

# Activities to insert
# Format: (grid_location, name, type, task_time_size, labor_rate_size, volume_size, connections)
ACTIVITIES = [
    # Swimlane C - Auto
    ("C4", "Auto Intake Review", "task", "M", "M", "L", [{"next": "C5"}]),
    ("C5", "Pull MVR Report", "task", "S", "M", "L", [{"next": "C6"}]),
    ("C6", "Auto Risk Assessment", "task", "L", "H", "L", [{"next": "C7"}]),
    ("C7", "Auto Determination", "decision", "M", "H", "L", [{"condition": "Approve", "next": "C8"}, {"condition": "Decline", "next": "C8"}, {"condition": "Escalate", "next": "F4"}]),
    ("C8", "Draft Auto Letter", "task", "M", "M", "L", [{"next": "G10"}]),

    # Swimlane D - Home
    ("D4", "Home Intake Review", "task", "M", "M", "L", [{"next": "D5"}]),
    ("D5", "Request Property Appraisal", "task", "S", "M", "L", [{"next": "D6"}]),
    ("D6", "Review Photos & Documentation", "task", "L", "M", "L", [{"next": "D7"}]),
    ("D7", "Home Risk Assessment", "task", "XL", "H", "L", [{"next": "D8"}]),
    ("D8", "Home Determination", "decision", "M", "H", "L", [{"condition": "Approve", "next": "D9"}, {"condition": "Decline", "next": "D9"}, {"condition": "Escalate", "next": "F4"}]),
    ("D9", "Draft Home Letter", "task", "M", "M", "L", [{"next": "G10"}]),

    # Swimlane E - Boat
    ("E4", "Boat Intake Review", "task", "M", "M", "M", [{"next": "E5"}]),
    ("E5", "Marine Benchmarking", "task", "L", "H", "M", [{"next": "E6"}]),
    ("E6", "Boat Condition Assessment", "task", "L", "H", "M", [{"next": "E7"}]),
    ("E7", "Boat Determination", "decision", "M", "H", "M", [{"condition": "Approve", "next": "E8"}, {"condition": "Decline", "next": "E8"}, {"condition": "Escalate", "next": "F4"}]),
    ("E8", "Draft Boat Letter", "task", "M", "M", "M", [{"next": "G10"}]),

    # Swimlane F - Escalation
    ("F4", "Escalated Intake Review", "task", "L", "H", "S", [{"next": "F5"}]),
    ("F5", "Proactive Customer Outreach", "task", "L", "H", "S", [{"next": "F6"}]),
    ("F6", "Legal/Compliance Review", "task", "XL", "XH", "S", [{"next": "F7"}]),
    ("F7", "Senior Underwriter Review", "task", "XL", "XH", "S", [{"next": "F8"}]),
    ("F8", "Escalated Determination", "decision", "L", "XH", "S", [{"condition": "Approve", "next": "F9"}, {"condition": "Decline", "next": "F9"}]),
    ("F9", "Draft Escalated Letter", "task", "L", "H", "S", [{"next": "G10"}]),

    # Swimlane G - Outbound Correspondence
    ("G10", "Letter Quality Review", "task", "S", "M", "XL", [{"next": "G11"}]),
    ("G11", "Print & Assemble", "task", "S", "L", "XL", [{"next": "G12"}]),
    ("G12", "Mail Preparation", "task", "S", "L", "XL", [{"next": "G13"}]),
    ("G13", "Outbound Mail Dispatch", "task", "S", "L", "XL", None),
]

# T-shirt size midpoints (from tshirt_config table)
TASK_TIME_MIDPOINTS = {
    "XS": 1, "S": 3, "M": 7.5, "L": 22.5, "XL": 45, "XXL": 90
}
LABOR_RATE_MIDPOINTS = {
    "L": 25, "M": 40, "H": 60, "XH": 85
}
VOLUME_MIDPOINTS = {
    "XS": 25, "S": 75, "M": 300, "L": 750, "XL": 2000, "XXL": 7500
}

st.markdown("### Data Preview")

st.markdown("**New Swimlane:**")
st.write(f"- {NEW_SWIMLANE['letter']}: {NEW_SWIMLANE['name']}")

st.markdown("**Activities to Insert:**")
for act in ACTIVITIES:
    st.write(f"- {act[0]}: {act[1]} ({act[2]})")

st.markdown("---")

col1, col2 = st.columns(2)

with col1:
    if st.button("🏊 Insert Swimlane G", type="primary"):
        try:
            conn = get_write_connection()
            cursor = conn.cursor()

            # Check if swimlane G already exists
            cursor.execute(
                "SELECT id FROM swimlane_config WHERE workflow_id = %s AND swimlane_letter = %s",
                (WORKFLOW_ID, NEW_SWIMLANE["letter"])
            )
            existing = cursor.fetchone()

            if existing:
                st.warning(f"Swimlane {NEW_SWIMLANE['letter']} already exists for workflow {WORKFLOW_ID}")
            else:
                cursor.execute(
                    """INSERT INTO swimlane_config (workflow_id, swimlane_letter, swimlane_name, display_order)
                       VALUES (%s, %s, %s, %s)""",
                    (WORKFLOW_ID, NEW_SWIMLANE["letter"], NEW_SWIMLANE["name"], NEW_SWIMLANE["display_order"])
                )
                conn.commit()
                st.success(f"✅ Inserted swimlane {NEW_SWIMLANE['letter']}: {NEW_SWIMLANE['name']}")

            cursor.close()
            conn.close()
        except Exception as e:
            st.error(f"❌ Error: {e}")

with col2:
    if st.button("📋 Insert All Activities", type="primary"):
        try:
            conn = get_write_connection()
            cursor = conn.cursor()

            # Get next ID
            cursor.execute("SELECT COALESCE(MAX(id), 0) FROM activities")
            max_id = cursor.fetchone()[0]
            next_id = max_id + 1

            inserted = 0
            skipped = 0

            for act in ACTIVITIES:
                grid_loc, name, act_type, task_time, labor_rate, volume, connections = act

                # Check if activity already exists at this grid location
                cursor.execute(
                    "SELECT id FROM activities WHERE workflow_id = %s AND grid_location = %s",
                    (WORKFLOW_ID, grid_loc)
                )
                existing = cursor.fetchone()

                if existing:
                    skipped += 1
                    continue

                # Get midpoints
                task_time_mid = TASK_TIME_MIDPOINTS.get(task_time)
                labor_rate_mid = LABOR_RATE_MIDPOINTS.get(labor_rate)
                volume_mid = VOLUME_MIDPOINTS.get(volume)

                # Format connections as JSON
                connections_json = json.dumps(connections) if connections else None

                cursor.execute(
                    """INSERT INTO activities (
                        id, workflow_id, activity_name, activity_type, grid_location, connections,
                        task_time_size, task_time_midpoint,
                        labor_rate_size, labor_rate_midpoint,
                        volume_size, volume_midpoint,
                        status, created_by
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                    (
                        next_id, WORKFLOW_ID, name, act_type, grid_loc, connections_json,
                        task_time, task_time_mid,
                        labor_rate, labor_rate_mid,
                        volume, volume_mid,
                        "not_started", "seed_script"
                    )
                )
                next_id += 1
                inserted += 1

            conn.commit()
            cursor.close()
            conn.close()

            st.success(f"✅ Inserted {inserted} activities, skipped {skipped} (already exist)")

        except Exception as e:
            st.error(f"❌ Error: {e}")

st.markdown("---")

# Show current data
st.markdown("### Current Swimlanes")
try:
    conn = get_write_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT swimlane_letter, swimlane_name FROM swimlane_config WHERE workflow_id = %s ORDER BY swimlane_letter",
        (WORKFLOW_ID,)
    )
    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    if rows:
        for row in rows:
            st.write(f"- **{row[0]}**: {row[1]}")
    else:
        st.info("No swimlanes configured yet.")
except Exception as e:
    st.error(f"Could not load swimlanes: {e}")

st.markdown("### Current Activities")
try:
    conn = get_write_connection()
    cursor = conn.cursor()
    cursor.execute(
        """SELECT grid_location, activity_name, activity_type
           FROM activities
           WHERE workflow_id = %s
           ORDER BY grid_location""",
        (WORKFLOW_ID,)
    )
    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    if rows:
        for row in rows:
            st.write(f"- **{row[0]}**: {row[1]} ({row[2]})")
    else:
        st.info("No activities yet.")
except Exception as e:
    st.error(f"Could not load activities: {e}")
