import streamlit as st
import snowflake.connector
import json
from datetime import datetime

st.set_page_config(page_title="Activity Cards", page_icon="📋", layout="wide")

st.title("📋 Activity Cards")
st.markdown("Create and manage activity cards for process mapping.")

# Current user (hardcoded for now)
CURRENT_USER = "app_user"

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

# Load t-shirt config from database
@st.cache_data(ttl=300)
def load_tshirt_config():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT category, size, label, min_value, max_value, midpoint, unit
        FROM tshirt_config
        WHERE engagement_id IS NULL
        ORDER BY category, min_value
    """)
    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    config = {}
    for row in rows:
        category = row[0]
        if category not in config:
            config[category] = []
        config[category].append({
            'size': row[1],
            'label': row[2],
            'min_value': row[3],
            'max_value': row[4],
            'midpoint': row[5],
            'unit': row[6]
        })
    return config

# Load all activities
def load_activities(engagement_id=None):
    conn = get_connection()
    cursor = conn.cursor()
    if engagement_id:
        cursor.execute("""
            SELECT id, activity_name, activity_type, swimlane, grid_location, status, created_at
            FROM activities
            WHERE engagement_id = %s
            ORDER BY grid_location, activity_name
        """, (engagement_id,))
    else:
        cursor.execute("""
            SELECT id, activity_name, activity_type, swimlane, grid_location, status, created_at
            FROM activities
            ORDER BY grid_location, activity_name
        """)
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return rows

# Load single activity
def load_activity(activity_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM activities WHERE id = %s", (activity_id,))
    columns = [desc[0] for desc in cursor.description]
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    if row:
        return dict(zip(columns, row))
    return None

# Save activity
def save_activity(data, activity_id=None):
    conn = get_connection()
    cursor = conn.cursor()

    if activity_id:
        # Update existing
        old_data = load_activity(activity_id)

        cursor.execute("""
            UPDATE activities SET
                engagement_id = %s,
                activity_name = %s,
                description = %s,
                activity_type = %s,
                swimlane = %s,
                grid_location = %s,
                connections = %s,
                task_time_size = %s,
                task_time_midpoint = %s,
                task_time_custom = %s,
                labor_rate_size = %s,
                labor_rate_midpoint = %s,
                labor_rate_custom = %s,
                volume_size = %s,
                volume_midpoint = %s,
                volume_custom = %s,
                target_cycle_time_hours = %s,
                actual_cycle_time_hours = %s,
                disposition_complete_pct = %s,
                disposition_forwarded_pct = %s,
                disposition_pended_pct = %s,
                transformation_plan = %s,
                phase = %s,
                status = %s,
                cost_to_change = %s,
                projected_annual_savings = %s,
                process_steps = %s,
                systems_touched = %s,
                constraints_rules = %s,
                opportunities = %s,
                next_steps = %s,
                attachments = %s,
                comments = %s,
                data_confidence = %s,
                data_source = %s,
                modified_at = CURRENT_TIMESTAMP(),
                modified_by = %s
            WHERE id = %s
        """, (
            data['engagement_id'], data['activity_name'], data['description'],
            data['activity_type'], data['swimlane'], data['grid_location'],
            data['connections'], data['task_time_size'], data['task_time_midpoint'],
            data['task_time_custom'], data['labor_rate_size'], data['labor_rate_midpoint'],
            data['labor_rate_custom'], data['volume_size'], data['volume_midpoint'],
            data['volume_custom'], data['target_cycle_time_hours'], data['actual_cycle_time_hours'],
            data['disposition_complete_pct'], data['disposition_forwarded_pct'],
            data['disposition_pended_pct'], data['transformation_plan'], data['phase'],
            data['status'], data['cost_to_change'], data['projected_annual_savings'],
            data['process_steps'], data['systems_touched'], data['constraints_rules'],
            data['opportunities'], data['next_steps'], data['attachments'],
            data['comments'], data['data_confidence'], data['data_source'],
            CURRENT_USER, activity_id
        ))

        # Log changes to audit
        log_audit(cursor, activity_id, 'UPDATE', old_data, data)
    else:
        # Insert new
        cursor.execute("""
            INSERT INTO activities (
                engagement_id, activity_name, description, activity_type, swimlane,
                grid_location, connections, task_time_size, task_time_midpoint,
                task_time_custom, labor_rate_size, labor_rate_midpoint, labor_rate_custom,
                volume_size, volume_midpoint, volume_custom, target_cycle_time_hours,
                actual_cycle_time_hours, disposition_complete_pct, disposition_forwarded_pct,
                disposition_pended_pct, transformation_plan, phase, status, cost_to_change,
                projected_annual_savings, process_steps, systems_touched, constraints_rules,
                opportunities, next_steps, attachments, comments, data_confidence,
                data_source, created_by
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            )
        """, (
            data['engagement_id'], data['activity_name'], data['description'],
            data['activity_type'], data['swimlane'], data['grid_location'],
            data['connections'], data['task_time_size'], data['task_time_midpoint'],
            data['task_time_custom'], data['labor_rate_size'], data['labor_rate_midpoint'],
            data['labor_rate_custom'], data['volume_size'], data['volume_midpoint'],
            data['volume_custom'], data['target_cycle_time_hours'], data['actual_cycle_time_hours'],
            data['disposition_complete_pct'], data['disposition_forwarded_pct'],
            data['disposition_pended_pct'], data['transformation_plan'], data['phase'],
            data['status'], data['cost_to_change'], data['projected_annual_savings'],
            data['process_steps'], data['systems_touched'], data['constraints_rules'],
            data['opportunities'], data['next_steps'], data['attachments'],
            data['comments'], data['data_confidence'], data['data_source'], CURRENT_USER
        ))

        # Get the new ID and log creation
        cursor.execute("SELECT MAX(id) FROM activities")
        new_id = cursor.fetchone()[0]
        cursor.execute("""
            INSERT INTO activity_audit_log (activity_id, action, changed_by)
            VALUES (%s, 'CREATE', %s)
        """, (new_id, CURRENT_USER))

    conn.commit()
    cursor.close()
    conn.close()
    return True

# Log audit changes
def log_audit(cursor, activity_id, action, old_data, new_data):
    fields_to_track = [
        'activity_name', 'description', 'activity_type', 'swimlane', 'grid_location',
        'connections', 'task_time_size', 'labor_rate_size', 'volume_size',
        'transformation_plan', 'status', 'data_confidence'
    ]

    for field in fields_to_track:
        old_val = str(old_data.get(field.upper(), '')) if old_data else ''
        new_val = str(new_data.get(field, ''))
        if old_val != new_val:
            cursor.execute("""
                INSERT INTO activity_audit_log (activity_id, action, field_changed, old_value, new_value, changed_by)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (activity_id, action, field, old_val, new_val, CURRENT_USER))

# Delete activity
def delete_activity(activity_id):
    conn = get_connection()
    cursor = conn.cursor()

    # Log deletion
    cursor.execute("""
        INSERT INTO activity_audit_log (activity_id, action, changed_by)
        VALUES (%s, 'DELETE', %s)
    """, (activity_id, CURRENT_USER))

    # Delete
    cursor.execute("DELETE FROM activities WHERE id = %s", (activity_id,))
    conn.commit()
    cursor.close()
    conn.close()

# Get midpoint for t-shirt size
def get_midpoint(config, category, size):
    if category in config:
        for item in config[category]:
            if item['size'] == size:
                return item['midpoint']
    return None

# Initialize session state
if 'editing_id' not in st.session_state:
    st.session_state.editing_id = None
if 'show_form' not in st.session_state:
    st.session_state.show_form = False
if 'delete_confirm' not in st.session_state:
    st.session_state.delete_confirm = None

# Load t-shirt config
try:
    tshirt_config = load_tshirt_config()
except Exception as e:
    st.error(f"Failed to load t-shirt config: {e}")
    tshirt_config = {}

# Sidebar for engagement filter
st.sidebar.markdown("### Filters")
engagement_filter = st.sidebar.text_input("Engagement ID", "")

# Main content
col1, col2 = st.columns([3, 1])
with col1:
    st.markdown("### Activities")
with col2:
    if st.button("➕ New Activity", type="primary"):
        st.session_state.show_form = True
        st.session_state.editing_id = None

# List view
try:
    activities = load_activities(engagement_filter if engagement_filter else None)

    if activities:
        # Table header
        cols = st.columns([1, 3, 2, 2, 1, 2, 1])
        cols[0].markdown("**ID**")
        cols[1].markdown("**Name**")
        cols[2].markdown("**Type**")
        cols[3].markdown("**Swimlane**")
        cols[4].markdown("**Grid**")
        cols[5].markdown("**Status**")
        cols[6].markdown("**Actions**")

        st.divider()

        for activity in activities:
            cols = st.columns([1, 3, 2, 2, 1, 2, 1])
            cols[0].write(activity[0])
            cols[1].write(activity[1] or "-")
            cols[2].write(activity[2] or "-")
            cols[3].write(activity[3] or "-")
            cols[4].write(activity[4] or "-")
            cols[5].write(activity[5] or "-")
            if cols[6].button("Edit", key=f"edit_{activity[0]}"):
                st.session_state.editing_id = activity[0]
                st.session_state.show_form = True
                st.rerun()
    else:
        st.info("No activities found. Click 'New Activity' to create one.")
except Exception as e:
    st.error(f"Failed to load activities: {e}")

# Form for add/edit
if st.session_state.show_form:
    st.divider()

    # Load existing data if editing
    existing = None
    if st.session_state.editing_id:
        existing = load_activity(st.session_state.editing_id)
        st.markdown(f"### Edit Activity #{st.session_state.editing_id}")
    else:
        st.markdown("### New Activity")

    with st.form("activity_form"):
        # Basic Info Section
        st.markdown("#### Basic Info")
        col1, col2 = st.columns(2)
        with col1:
            engagement_id = st.text_input("Engagement ID", value=existing.get('ENGAGEMENT_ID', '') if existing else engagement_filter)
            activity_name = st.text_input("Activity Name*", value=existing.get('ACTIVITY_NAME', '') if existing else '', max_chars=100)
            activity_type = st.selectbox("Type*", ['task', 'decision'],
                index=['task', 'decision'].index(existing.get('ACTIVITY_TYPE', 'task')) if existing and existing.get('ACTIVITY_TYPE') else 0)
        with col2:
            swimlane = st.text_input("Swimlane", value=existing.get('SWIMLANE', '') if existing else '', max_chars=100)
            grid_location = st.text_input("Grid Location (e.g., A1, B2)", value=existing.get('GRID_LOCATION', '') if existing else '', max_chars=10)

        description = st.text_area("Description", value=existing.get('DESCRIPTION', '') if existing else '', max_chars=300, height=100)

        # Connections Section
        st.markdown("#### Connections")
        st.caption("For tasks: single next step. For decisions: multiple condition/next pairs.")

        # Parse existing connections
        existing_connections = []
        if existing and existing.get('CONNECTIONS'):
            try:
                existing_connections = json.loads(existing.get('CONNECTIONS', '[]'))
            except:
                existing_connections = []

        if activity_type == 'task':
            next_step = st.text_input("Next Activity (grid location)",
                value=existing_connections[0].get('next', '') if existing_connections else '')
            connections_data = [{"next": next_step}] if next_step else []
        else:
            st.markdown("**Decision Branches**")
            num_branches = st.number_input("Number of branches", min_value=2, max_value=10, value=max(2, len(existing_connections)) if existing_connections else 2)
            connections_data = []
            for i in range(int(num_branches)):
                col1, col2 = st.columns(2)
                with col1:
                    condition = st.text_input(f"Condition {i+1}",
                        value=existing_connections[i].get('condition', '') if i < len(existing_connections) else '',
                        key=f"cond_{i}")
                with col2:
                    next_loc = st.text_input(f"Next {i+1}",
                        value=existing_connections[i].get('next', '') if i < len(existing_connections) else '',
                        key=f"next_{i}")
                if condition or next_loc:
                    connections_data.append({"condition": condition, "next": next_loc})

        # Time & Cost Section
        st.markdown("#### Time & Cost")

        # Build size options
        def build_size_options(category):
            options = [''] + [f"{item['size']} - {item['label']}" for item in tshirt_config.get(category, [])] + ['Other']
            return options

        col1, col2, col3 = st.columns(3)

        with col1:
            st.markdown("**Task Time**")
            task_time_options = build_size_options('task_time')
            existing_task_time = existing.get('TASK_TIME_SIZE', '') if existing else ''
            task_time_idx = 0
            for i, opt in enumerate(task_time_options):
                if opt.startswith(existing_task_time) and existing_task_time:
                    task_time_idx = i
                    break
            if existing and existing.get('TASK_TIME_CUSTOM') and not existing.get('TASK_TIME_SIZE'):
                task_time_idx = len(task_time_options) - 1  # Other

            task_time_size_full = st.selectbox("Size", task_time_options, index=task_time_idx, key="task_time_size")
            task_time_size = task_time_size_full.split(' - ')[0] if ' - ' in task_time_size_full else task_time_size_full

            task_time_custom = None
            task_time_midpoint = None
            if task_time_size == 'Other':
                task_time_custom = st.number_input("Custom (minutes)", min_value=0.0,
                    value=float(existing.get('TASK_TIME_CUSTOM', 0)) if existing and existing.get('TASK_TIME_CUSTOM') else 0.0,
                    key="task_time_custom")
                task_time_midpoint = task_time_custom
            elif task_time_size:
                task_time_midpoint = get_midpoint(tshirt_config, 'task_time', task_time_size)
                if task_time_midpoint:
                    st.caption(f"Midpoint: {task_time_midpoint} min")

        with col2:
            st.markdown("**Labor Rate**")
            labor_rate_options = build_size_options('labor_rate')
            existing_labor_rate = existing.get('LABOR_RATE_SIZE', '') if existing else ''
            labor_rate_idx = 0
            for i, opt in enumerate(labor_rate_options):
                if opt.startswith(existing_labor_rate) and existing_labor_rate:
                    labor_rate_idx = i
                    break
            if existing and existing.get('LABOR_RATE_CUSTOM') and not existing.get('LABOR_RATE_SIZE'):
                labor_rate_idx = len(labor_rate_options) - 1

            labor_rate_size_full = st.selectbox("Size", labor_rate_options, index=labor_rate_idx, key="labor_rate_size")
            labor_rate_size = labor_rate_size_full.split(' - ')[0] if ' - ' in labor_rate_size_full else labor_rate_size_full

            labor_rate_custom = None
            labor_rate_midpoint = None
            if labor_rate_size == 'Other':
                labor_rate_custom = st.number_input("Custom ($/hour)", min_value=0.0,
                    value=float(existing.get('LABOR_RATE_CUSTOM', 0)) if existing and existing.get('LABOR_RATE_CUSTOM') else 0.0,
                    key="labor_rate_custom")
                labor_rate_midpoint = labor_rate_custom
            elif labor_rate_size:
                labor_rate_midpoint = get_midpoint(tshirt_config, 'labor_rate', labor_rate_size)
                if labor_rate_midpoint:
                    st.caption(f"Midpoint: ${labor_rate_midpoint}/hr")

        with col3:
            st.markdown("**Volume**")
            volume_options = build_size_options('volume')
            existing_volume = existing.get('VOLUME_SIZE', '') if existing else ''
            volume_idx = 0
            for i, opt in enumerate(volume_options):
                if opt.startswith(existing_volume) and existing_volume:
                    volume_idx = i
                    break
            if existing and existing.get('VOLUME_CUSTOM') and not existing.get('VOLUME_SIZE'):
                volume_idx = len(volume_options) - 1

            volume_size_full = st.selectbox("Size", volume_options, index=volume_idx, key="volume_size")
            volume_size = volume_size_full.split(' - ')[0] if ' - ' in volume_size_full else volume_size_full

            volume_custom = None
            volume_midpoint = None
            if volume_size == 'Other':
                volume_custom = st.number_input("Custom (per month)", min_value=0.0,
                    value=float(existing.get('VOLUME_CUSTOM', 0)) if existing and existing.get('VOLUME_CUSTOM') else 0.0,
                    key="volume_custom")
                volume_midpoint = volume_custom
            elif volume_size:
                volume_midpoint = get_midpoint(tshirt_config, 'volume', volume_size)
                if volume_midpoint:
                    st.caption(f"Midpoint: {volume_midpoint}/mo")

        # SLA Section
        st.markdown("#### SLA / Cycle Time")
        col1, col2 = st.columns(2)
        with col1:
            target_cycle_time = st.number_input("Target Cycle Time (hours)", min_value=0.0,
                value=float(existing.get('TARGET_CYCLE_TIME_HOURS', 0)) if existing and existing.get('TARGET_CYCLE_TIME_HOURS') else 0.0)
        with col2:
            actual_cycle_time = st.number_input("Actual Cycle Time (hours)", min_value=0.0,
                value=float(existing.get('ACTUAL_CYCLE_TIME_HOURS', 0)) if existing and existing.get('ACTUAL_CYCLE_TIME_HOURS') else 0.0)

        # Disposition Section
        st.markdown("#### Disposition Breakdown")
        st.caption("Percentages should sum to 100%")
        col1, col2, col3 = st.columns(3)
        with col1:
            disp_complete = st.number_input("Complete %", min_value=0.0, max_value=100.0,
                value=float(existing.get('DISPOSITION_COMPLETE_PCT', 0)) if existing and existing.get('DISPOSITION_COMPLETE_PCT') else 0.0)
        with col2:
            disp_forwarded = st.number_input("Forwarded %", min_value=0.0, max_value=100.0,
                value=float(existing.get('DISPOSITION_FORWARDED_PCT', 0)) if existing and existing.get('DISPOSITION_FORWARDED_PCT') else 0.0)
        with col3:
            disp_pended = st.number_input("Pended %", min_value=0.0, max_value=100.0,
                value=float(existing.get('DISPOSITION_PENDED_PCT', 0)) if existing and existing.get('DISPOSITION_PENDED_PCT') else 0.0)

        disp_total = disp_complete + disp_forwarded + disp_pended
        if disp_total > 0 and disp_total != 100:
            st.warning(f"Disposition total: {disp_total}% (should be 100%)")

        # Transformation Section
        st.markdown("#### Transformation")
        col1, col2, col3, col4 = st.columns(4)
        with col1:
            transform_options = ['', 'eliminate', 'automate', 'optimize']
            existing_transform = existing.get('TRANSFORMATION_PLAN', '') if existing else ''
            transform_idx = transform_options.index(existing_transform) if existing_transform in transform_options else 0
            transformation_plan = st.selectbox("Plan", transform_options, index=transform_idx)
        with col2:
            phase = st.number_input("Phase", min_value=0, max_value=10,
                value=int(existing.get('PHASE', 0)) if existing and existing.get('PHASE') else 0)
        with col3:
            status_options = ['', 'not_started', 'in_progress', 'complete']
            existing_status = existing.get('STATUS', '') if existing else ''
            status_idx = status_options.index(existing_status) if existing_status in status_options else 0
            status = st.selectbox("Status", status_options, index=status_idx)
        with col4:
            pass

        col1, col2 = st.columns(2)
        with col1:
            cost_to_change = st.number_input("Cost to Change ($)", min_value=0.0,
                value=float(existing.get('COST_TO_CHANGE', 0)) if existing and existing.get('COST_TO_CHANGE') else 0.0)
        with col2:
            projected_savings = st.number_input("Projected Annual Savings ($)", min_value=0.0,
                value=float(existing.get('PROJECTED_ANNUAL_SAVINGS', 0)) if existing and existing.get('PROJECTED_ANNUAL_SAVINGS') else 0.0)

        # Detail Section
        st.markdown("#### Detail")
        process_steps = st.text_area("Process Steps",
            value=existing.get('PROCESS_STEPS', '') if existing else '', height=100)
        systems_touched = st.text_input("Systems Touched",
            value=existing.get('SYSTEMS_TOUCHED', '') if existing else '', max_chars=500)
        constraints_rules = st.text_area("Constraints / Rules",
            value=existing.get('CONSTRAINTS_RULES', '') if existing else '', height=80)
        opportunities = st.text_area("Opportunities",
            value=existing.get('OPPORTUNITIES', '') if existing else '', height=80)
        next_steps_text = st.text_area("Next Steps",
            value=existing.get('NEXT_STEPS', '') if existing else '', height=80)

        # Attachments Section
        st.markdown("#### Attachments")
        st.caption("Enter as JSON array: [{\"name\": \"Doc Name\", \"url\": \"https://...\"}]")
        attachments = st.text_area("Attachments (JSON)",
            value=existing.get('ATTACHMENTS', '') if existing else '', height=60)

        # Notes Section
        st.markdown("#### Notes")
        comments = st.text_area("Comments",
            value=existing.get('COMMENTS', '') if existing else '', height=100)

        # Data Quality Section
        st.markdown("#### Data Quality")
        col1, col2 = st.columns(2)
        with col1:
            confidence_options = ['', 'estimate', 'partial', 'confirmed']
            existing_confidence = existing.get('DATA_CONFIDENCE', '') if existing else ''
            confidence_idx = confidence_options.index(existing_confidence) if existing_confidence in confidence_options else 0
            data_confidence = st.selectbox("Confidence", confidence_options, index=confidence_idx)
        with col2:
            data_source = st.text_input("Data Source",
                value=existing.get('DATA_SOURCE', '') if existing else '', max_chars=200)

        # Form buttons
        col1, col2, col3 = st.columns([1, 1, 4])
        with col1:
            submitted = st.form_submit_button("Save", type="primary")
        with col2:
            cancelled = st.form_submit_button("Cancel")

        if submitted:
            if not activity_name:
                st.error("Activity Name is required.")
            else:
                # Build data dict
                data = {
                    'engagement_id': engagement_id or None,
                    'activity_name': activity_name,
                    'description': description or None,
                    'activity_type': activity_type,
                    'swimlane': swimlane or None,
                    'grid_location': grid_location or None,
                    'connections': json.dumps(connections_data) if connections_data else None,
                    'task_time_size': task_time_size if task_time_size and task_time_size != 'Other' else None,
                    'task_time_midpoint': task_time_midpoint,
                    'task_time_custom': task_time_custom,
                    'labor_rate_size': labor_rate_size if labor_rate_size and labor_rate_size != 'Other' else None,
                    'labor_rate_midpoint': labor_rate_midpoint,
                    'labor_rate_custom': labor_rate_custom,
                    'volume_size': volume_size if volume_size and volume_size != 'Other' else None,
                    'volume_midpoint': volume_midpoint,
                    'volume_custom': volume_custom,
                    'target_cycle_time_hours': target_cycle_time or None,
                    'actual_cycle_time_hours': actual_cycle_time or None,
                    'disposition_complete_pct': disp_complete or None,
                    'disposition_forwarded_pct': disp_forwarded or None,
                    'disposition_pended_pct': disp_pended or None,
                    'transformation_plan': transformation_plan or None,
                    'phase': phase or None,
                    'status': status or None,
                    'cost_to_change': cost_to_change or None,
                    'projected_annual_savings': projected_savings or None,
                    'process_steps': process_steps or None,
                    'systems_touched': systems_touched or None,
                    'constraints_rules': constraints_rules or None,
                    'opportunities': opportunities or None,
                    'next_steps': next_steps_text or None,
                    'attachments': attachments or None,
                    'comments': comments or None,
                    'data_confidence': data_confidence or None,
                    'data_source': data_source or None,
                }

                try:
                    save_activity(data, st.session_state.editing_id)
                    st.success("Activity saved successfully!")
                    st.session_state.show_form = False
                    st.session_state.editing_id = None
                    st.rerun()
                except Exception as e:
                    st.error(f"Failed to save: {e}")

        if cancelled:
            st.session_state.show_form = False
            st.session_state.editing_id = None
            st.rerun()

    # Delete button (outside form)
    if st.session_state.editing_id:
        st.divider()
        st.markdown("#### Danger Zone")

        if st.session_state.delete_confirm == st.session_state.editing_id:
            st.warning("Are you sure you want to delete this activity?")
            col1, col2, col3 = st.columns([1, 1, 4])
            with col1:
                if st.button("Yes, Delete", type="primary"):
                    try:
                        delete_activity(st.session_state.editing_id)
                        st.success("Activity deleted.")
                        st.session_state.show_form = False
                        st.session_state.editing_id = None
                        st.session_state.delete_confirm = None
                        st.rerun()
                    except Exception as e:
                        st.error(f"Failed to delete: {e}")
            with col2:
                if st.button("Cancel"):
                    st.session_state.delete_confirm = None
                    st.rerun()
        else:
            if st.button("Delete Activity", type="secondary"):
                st.session_state.delete_confirm = st.session_state.editing_id
                st.rerun()
