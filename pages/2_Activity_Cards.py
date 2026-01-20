import streamlit as st
import snowflake.connector
import json
import os
import uuid
import re
from datetime import datetime

st.set_page_config(page_title="Activity Cards", page_icon="📋", layout="wide")

st.title("📋 Activity Cards")
st.markdown("Create and manage activity cards for process mapping.")

# Current user (hardcoded for now)
CURRENT_USER = "app_user"

# Uploads directory for user attachments
UPLOADS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "user_uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)

# Swimlane letters to always show
SWIMLANE_LETTERS = [chr(ord('A') + i) for i in range(10)]  # A through J

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

# Load workflows
def load_workflows():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, workflow_name, description FROM workflows ORDER BY workflow_name")
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return rows

# Create workflow
def create_workflow(name, description):
    conn = get_connection()
    cursor = conn.cursor()
    # Get next sequential ID
    cursor.execute("SELECT COALESCE(MAX(id), 0) + 1 FROM workflows")
    next_id = cursor.fetchone()[0]
    cursor.execute("""
        INSERT INTO workflows (id, workflow_name, description, created_by)
        VALUES (%s, %s, %s, %s)
    """, (next_id, name, description, CURRENT_USER))
    conn.commit()
    cursor.close()
    conn.close()
    return next_id

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

# Load swimlane config for a workflow
def load_swimlane_config(workflow_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT swimlane_letter, swimlane_name
        FROM swimlane_config
        WHERE workflow_id = %s
        ORDER BY swimlane_letter
    """, (workflow_id,))
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return {row[0]: row[1] for row in rows}

# Save swimlane name
def save_swimlane_name(workflow_id, letter, name):
    conn = get_connection()
    cursor = conn.cursor()
    # Check if exists
    cursor.execute("""
        SELECT id FROM swimlane_config
        WHERE workflow_id = %s AND swimlane_letter = %s
    """, (workflow_id, letter))
    existing = cursor.fetchone()
    if existing:
        cursor.execute("""
            UPDATE swimlane_config
            SET swimlane_name = %s, modified_at = CURRENT_TIMESTAMP()
            WHERE workflow_id = %s AND swimlane_letter = %s
        """, (name, workflow_id, letter))
    else:
        cursor.execute("""
            INSERT INTO swimlane_config (workflow_id, swimlane_letter, swimlane_name, display_order)
            VALUES (%s, %s, %s, %s)
        """, (workflow_id, letter, name, ord(letter) - ord('A')))
    conn.commit()
    cursor.close()
    conn.close()

# Load all activities for a workflow
def load_activities(workflow_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, activity_name, activity_type, grid_location, status, created_at
        FROM activities
        WHERE workflow_id = %s
        ORDER BY grid_location, activity_name
    """, (workflow_id,))
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return rows

# Load activities as grid map for a workflow
def load_activities_grid(workflow_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, activity_name, activity_type, grid_location, connections
        FROM activities
        WHERE workflow_id = %s
    """, (workflow_id,))
    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    grid = {}
    for row in rows:
        if row[3]:  # grid_location
            grid[row[3].upper()] = {
                'id': row[0],
                'name': row[1],
                'type': row[2],
                'connections': row[4]
            }
    return grid

# Parse grid location into letter and number
def parse_grid_location(loc):
    if not loc:
        return None, None
    match = re.match(r'([A-Z]+)(\d+)', loc.upper())
    if match:
        return match.group(1), int(match.group(2))
    return None, None

# Build grid location from letter and number
def build_grid_location(letter, number):
    return f"{letter}{number}"

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

# Shift activities in a swimlane
def shift_activities(workflow_id, swimlane_letter, from_position):
    """Shift all activities in a swimlane from position onwards by +1"""
    conn = get_connection()
    cursor = conn.cursor()

    # Get all activities in this swimlane at or after the position
    cursor.execute("""
        SELECT id, grid_location, connections
        FROM activities
        WHERE workflow_id = %s AND grid_location LIKE %s
        ORDER BY grid_location DESC
    """, (workflow_id, f"{swimlane_letter}%"))

    activities_to_shift = []
    for row in cursor.fetchall():
        letter, num = parse_grid_location(row[1])
        if num and num >= from_position:
            activities_to_shift.append({
                'id': row[0],
                'old_location': row[1],
                'new_location': build_grid_location(letter, num + 1),
                'old_num': num,
                'new_num': num + 1
            })

    # Build mapping of old -> new locations for connection updates
    location_map = {a['old_location']: a['new_location'] for a in activities_to_shift}

    # Update grid locations (do in reverse order to avoid conflicts)
    for activity in activities_to_shift:
        cursor.execute("""
            UPDATE activities
            SET grid_location = %s, modified_at = CURRENT_TIMESTAMP(), modified_by = %s
            WHERE id = %s
        """, (activity['new_location'], CURRENT_USER, activity['id']))

        # Log the shift
        cursor.execute("""
            INSERT INTO activity_audit_log (activity_id, action, field_changed, old_value, new_value, changed_by)
            VALUES (%s, 'SHIFT', 'grid_location', %s, %s, %s)
        """, (activity['id'], activity['old_location'], activity['new_location'], CURRENT_USER))

    # Now update all connections that point to shifted locations
    if location_map:
        cursor.execute("""
            SELECT id, connections FROM activities
            WHERE workflow_id = %s AND connections IS NOT NULL
        """, (workflow_id,))
        for row in cursor.fetchall():
            activity_id = row[0]
            connections_str = row[1]
            if connections_str:
                try:
                    connections = json.loads(connections_str)
                    updated = False
                    for conn_item in connections:
                        if 'next' in conn_item and conn_item['next'] in location_map:
                            conn_item['next'] = location_map[conn_item['next']]
                            updated = True
                    if updated:
                        cursor.execute("""
                            UPDATE activities
                            SET connections = %s, modified_at = CURRENT_TIMESTAMP(), modified_by = %s
                            WHERE id = %s
                        """, (json.dumps(connections), CURRENT_USER, activity_id))
                except json.JSONDecodeError:
                    pass

    conn.commit()
    cursor.close()
    conn.close()
    return len(activities_to_shift)

# Save activity
def save_activity(data, workflow_id, activity_id=None):
    conn = get_connection()
    cursor = conn.cursor()

    if activity_id:
        # Update existing
        old_data = load_activity(activity_id)

        cursor.execute("""
            UPDATE activities SET
                activity_name = %s,
                activity_type = %s,
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
            data['activity_name'], data['activity_type'], data['grid_location'],
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
        # Insert new - get next sequential ID
        cursor.execute("SELECT COALESCE(MAX(id), 0) + 1 FROM activities")
        next_id = cursor.fetchone()[0]
        cursor.execute("""
            INSERT INTO activities (
                id, workflow_id, activity_name, activity_type, grid_location, connections,
                task_time_size, task_time_midpoint, task_time_custom,
                labor_rate_size, labor_rate_midpoint, labor_rate_custom,
                volume_size, volume_midpoint, volume_custom,
                target_cycle_time_hours, actual_cycle_time_hours,
                disposition_complete_pct, disposition_forwarded_pct, disposition_pended_pct,
                transformation_plan, phase, status, cost_to_change, projected_annual_savings,
                process_steps, systems_touched, constraints_rules, opportunities, next_steps,
                attachments, comments, data_confidence, data_source, created_by
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            )
        """, (
            next_id, workflow_id, data['activity_name'], data['activity_type'], data['grid_location'],
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

        # Log creation with the ID we assigned
        cursor.execute("""
            INSERT INTO activity_audit_log (activity_id, action, changed_by)
            VALUES (%s, 'CREATE', %s)
        """, (next_id, CURRENT_USER))

    conn.commit()
    cursor.close()
    conn.close()
    return True

# Log audit changes
def log_audit(cursor, activity_id, action, old_data, new_data):
    fields_to_track = [
        'activity_name', 'activity_type', 'grid_location',
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

# Save uploaded file
def save_uploaded_file(uploaded_file):
    file_id = str(uuid.uuid4())[:8]
    filename = f"{file_id}_{uploaded_file.name}"
    filepath = os.path.join(UPLOADS_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(uploaded_file.getbuffer())
    return {"name": uploaded_file.name, "filename": filename}

# Initialize session state
if 'editing_id' not in st.session_state:
    st.session_state.editing_id = None
if 'show_form' not in st.session_state:
    st.session_state.show_form = False
if 'delete_confirm' not in st.session_state:
    st.session_state.delete_confirm = None
if 'decision_branches' not in st.session_state:
    st.session_state.decision_branches = 2
if 'current_attachments' not in st.session_state:
    st.session_state.current_attachments = []
if 'selected_grid' not in st.session_state:
    st.session_state.selected_grid = None
if 'conflict_dialog' not in st.session_state:
    st.session_state.conflict_dialog = None
if 'naming_swimlane' not in st.session_state:
    st.session_state.naming_swimlane = None
if 'edit_swimlane_mode' not in st.session_state:
    st.session_state.edit_swimlane_mode = False
if 'selected_workflow_id' not in st.session_state:
    st.session_state.selected_workflow_id = None
if 'creating_workflow' not in st.session_state:
    st.session_state.creating_workflow = False

# Load t-shirt config
try:
    tshirt_config = load_tshirt_config()
except Exception as e:
    st.error(f"Failed to load t-shirt config: {e}")
    tshirt_config = {}

# =====================
# WORKFLOW SELECTOR
# =====================
st.markdown("### Select Workflow")

workflows = load_workflows()
workflow_options = {w[0]: w[1] for w in workflows}  # id -> name

if st.session_state.creating_workflow:
    # Show create workflow form
    st.markdown("#### Create New Workflow")
    new_wf_name = st.text_input("Workflow Name", key="new_workflow_name")
    new_wf_desc = st.text_area("Description (optional)", key="new_workflow_desc", height=80)

    col1, col2 = st.columns([1, 4])
    with col1:
        if st.button("Create", type="primary"):
            if new_wf_name.strip():
                new_id = create_workflow(new_wf_name.strip(), new_wf_desc.strip() if new_wf_desc else None)
                st.session_state.selected_workflow_id = new_id
                st.session_state.creating_workflow = False
                st.rerun()
            else:
                st.error("Please enter a workflow name")
    with col2:
        if st.button("Cancel"):
            st.session_state.creating_workflow = False
            st.rerun()
else:
    # Show workflow dropdown
    col1, col2 = st.columns([3, 1])
    with col1:
        if workflows:
            # Build options list
            options = ["-- Select a workflow --"] + [w[1] for w in workflows]

            # Find current index
            current_idx = 0
            if st.session_state.selected_workflow_id:
                for i, w in enumerate(workflows):
                    if w[0] == st.session_state.selected_workflow_id:
                        current_idx = i + 1
                        break

            selected = st.selectbox("Workflow", options, index=current_idx, label_visibility="collapsed")

            if selected != "-- Select a workflow --":
                # Find the workflow ID
                for w in workflows:
                    if w[1] == selected:
                        if st.session_state.selected_workflow_id != w[0]:
                            st.session_state.selected_workflow_id = w[0]
                            # Reset form state when switching workflows
                            st.session_state.show_form = False
                            st.session_state.editing_id = None
                            st.session_state.selected_grid = None
                            st.rerun()
                        break
            else:
                st.session_state.selected_workflow_id = None
        else:
            st.info("No workflows yet. Create one to get started.")

    with col2:
        if st.button("+ New Workflow"):
            st.session_state.creating_workflow = True
            st.rerun()

# Only show rest of page if workflow is selected
if not st.session_state.selected_workflow_id:
    st.warning("Please select or create a workflow to continue.")
    st.stop()

# Load data for selected workflow
workflow_id = st.session_state.selected_workflow_id
swimlane_names = load_swimlane_config(workflow_id)
activities_grid = load_activities_grid(workflow_id)

# Determine grid dimensions based on activities
def get_max_col(activities_grid):
    max_col = 1
    for loc in activities_grid.keys():
        letter, num = parse_grid_location(loc)
        if num and num > max_col:
            max_col = num
    return max_col

max_col = get_max_col(activities_grid)
cols_to_display = list(range(1, max_col + 2))  # Show exactly 1 extra unpopulated column

st.markdown("---")

# =====================
# PROCESS GRID
# =====================
st.markdown("### Process Grid")

# Swimlane edit mode toggle
col1, col2 = st.columns([6, 1])
with col2:
    if st.button("Edit Swimlanes" if not st.session_state.edit_swimlane_mode else "Done Editing"):
        st.session_state.edit_swimlane_mode = not st.session_state.edit_swimlane_mode
        st.rerun()

# Swimlane naming dialog (for grid cell clicks)
if st.session_state.naming_swimlane:
    st.markdown(f"#### Name Swimlane {st.session_state.naming_swimlane}")
    new_name = st.text_input("Swimlane name:", key="new_swimlane_name",
                              placeholder="e.g., Mail Room, Claims Processing")
    col1, col2 = st.columns([1, 4])
    with col1:
        if st.button("Save Name", type="primary"):
            if new_name.strip():
                save_swimlane_name(workflow_id, st.session_state.naming_swimlane, new_name.strip())
                st.session_state.naming_swimlane = None
                st.session_state.show_form = True
                st.rerun()
            else:
                st.error("Please enter a name")
    with col2:
        if st.button("Cancel##naming"):
            st.session_state.naming_swimlane = None
            st.session_state.selected_grid = None
            st.rerun()

# Conflict resolution dialog
if st.session_state.conflict_dialog:
    conflict = st.session_state.conflict_dialog
    st.markdown("---")
    st.warning(f"**{conflict['location']}** is occupied by **'{conflict['existing_name']}'**")

    col1, col2, col3, col4 = st.columns([1, 1, 1, 2])
    with col1:
        if st.button("Insert Here", type="primary", help="Shift existing activities to the right"):
            letter, num = parse_grid_location(conflict['location'])
            shifted = shift_activities(workflow_id, letter, num)
            st.session_state.selected_grid = conflict['location']
            st.session_state.conflict_dialog = None
            st.session_state.show_form = True
            st.success(f"Shifted {shifted} activities. Now placing new activity at {conflict['location']}.")
            st.rerun()
    with col2:
        if st.button("Replace", type="secondary", help="Delete existing and place new"):
            delete_activity(conflict['existing_id'])
            st.session_state.selected_grid = conflict['location']
            st.session_state.conflict_dialog = None
            st.session_state.show_form = True
            st.rerun()
    with col3:
        if st.button("Cancel##conflict"):
            st.session_state.conflict_dialog = None
            st.rerun()
    st.markdown("---")

# Edit swimlanes mode - show ALL letters A-J
if st.session_state.edit_swimlane_mode:
    st.markdown("#### Edit Swimlane Names")
    st.caption("Name your swimlanes (rows). Each workflow has its own swimlane names.")

    for letter in SWIMLANE_LETTERS:
        current_name = swimlane_names.get(letter, '')
        col1, col2, col3 = st.columns([1, 3, 1])
        with col1:
            st.markdown(f"**{letter}**")
        with col2:
            new_name = st.text_input(
                f"Name for {letter}",
                value=current_name,
                key=f"edit_swimlane_{letter}",
                label_visibility="collapsed",
                placeholder="Click to name this swimlane"
            )
        with col3:
            if st.button("Save", key=f"save_swimlane_{letter}"):
                save_swimlane_name(workflow_id, letter, new_name.strip() if new_name else '')
                st.rerun()
else:
    # Visual Grid Picker
    # Header row with column numbers
    header_cols = st.columns([2] + [1] * len(cols_to_display))
    header_cols[0].markdown("**Swimlane**")
    for i, col_num in enumerate(cols_to_display):
        header_cols[i + 1].markdown(f"**{col_num}**")

    # Determine which rows to show (named ones + any with activities + exactly 1 unnamed extra)
    rows_with_activities = set()
    for loc in activities_grid.keys():
        letter, _ = parse_grid_location(loc)
        if letter:
            rows_with_activities.add(letter)

    rows_with_names = set(swimlane_names.keys())

    # Show rows up to max used + exactly 1 extra unnamed row
    all_used_rows = rows_with_activities | rows_with_names
    if all_used_rows:
        max_row_ord = max(ord(r) for r in all_used_rows)
        last_row_to_show = chr(min(max_row_ord + 1, ord('J')))  # +1 for exactly 1 extra row
    else:
        last_row_to_show = 'A'  # Start with just row A if nothing used

    rows_to_display = [chr(ord('A') + i) for i in range(ord(last_row_to_show) - ord('A') + 1)]

    # Grid rows
    for row_letter in rows_to_display:
        row_cols = st.columns([2] + [1] * len(cols_to_display))

        # Swimlane label
        swimlane_name = swimlane_names.get(row_letter, '')

        if swimlane_name:
            label = f"**{row_letter}** - {swimlane_name}"
        else:
            label = f"**{row_letter}** - *(unnamed)*"

        row_cols[0].markdown(label)

        # Grid cells
        for i, col_num in enumerate(cols_to_display):
            grid_loc = build_grid_location(row_letter, col_num)
            cell_data = activities_grid.get(grid_loc)

            with row_cols[i + 1]:
                if cell_data:
                    # Occupied cell
                    btn_label = "🔵"
                    help_text = f"{cell_data['name']} ({cell_data['type']})"
                    if st.button(btn_label, key=f"grid_{grid_loc}", help=help_text, use_container_width=True):
                        if st.session_state.show_form and not st.session_state.editing_id:
                            # Trying to place new activity on occupied cell
                            st.session_state.conflict_dialog = {
                                'location': grid_loc,
                                'existing_id': cell_data['id'],
                                'existing_name': cell_data['name']
                            }
                            st.rerun()
                        else:
                            # Edit existing activity
                            st.session_state.editing_id = cell_data['id']
                            st.session_state.selected_grid = grid_loc
                            st.session_state.show_form = True
                            existing = load_activity(cell_data['id'])
                            if existing and existing.get('ATTACHMENTS'):
                                try:
                                    st.session_state.current_attachments = json.loads(existing.get('ATTACHMENTS', '[]'))
                                except:
                                    st.session_state.current_attachments = []
                            else:
                                st.session_state.current_attachments = []
                            if existing and existing.get('CONNECTIONS'):
                                try:
                                    conns = json.loads(existing.get('CONNECTIONS', '[]'))
                                    st.session_state.decision_branches = max(2, len(conns))
                                except:
                                    st.session_state.decision_branches = 2
                            st.rerun()
                else:
                    # Empty cell
                    if st.button("⬜", key=f"grid_{grid_loc}", use_container_width=True):
                        # Check if swimlane is named
                        if row_letter not in swimlane_names:
                            # Prompt to name it first
                            st.session_state.naming_swimlane = row_letter
                            st.session_state.selected_grid = grid_loc
                            st.rerun()
                        else:
                            # Named swimlane, proceed with selection
                            st.session_state.selected_grid = grid_loc
                            st.session_state.show_form = True
                            st.session_state.editing_id = None
                            st.session_state.decision_branches = 2
                            st.session_state.current_attachments = []
                            st.rerun()

# Show selected location
if st.session_state.selected_grid and not st.session_state.naming_swimlane:
    letter, num = parse_grid_location(st.session_state.selected_grid)
    swimlane_name = swimlane_names.get(letter, 'Unnamed')
    st.info(f"**Selected: {st.session_state.selected_grid}** ({swimlane_name}, Step {num})")

# New Activity button
if not st.session_state.show_form:
    if st.button("+ New Activity", type="primary"):
        st.session_state.show_form = True
        st.session_state.editing_id = None
        st.session_state.decision_branches = 2
        st.session_state.current_attachments = []
        st.session_state.selected_grid = None
        st.info("Click a cell on the grid above to select where to place the activity.")

# List view
st.markdown("---")
st.markdown("### Activity List")
try:
    activities = load_activities(workflow_id)

    if activities:
        cols = st.columns([1, 3, 2, 2, 2, 1])
        cols[0].markdown("**ID**")
        cols[1].markdown("**Name**")
        cols[2].markdown("**Type**")
        cols[3].markdown("**Grid**")
        cols[4].markdown("**Status**")
        cols[5].markdown("**Actions**")

        st.divider()

        for activity in activities:
            cols = st.columns([1, 3, 2, 2, 2, 1])
            cols[0].write(activity[0])
            cols[1].write(activity[1] or "-")
            cols[2].write(activity[2] or "-")
            cols[3].write(activity[3] or "-")
            cols[4].write(activity[4] or "-")
            if cols[5].button("Edit", key=f"edit_{activity[0]}"):
                st.session_state.editing_id = activity[0]
                st.session_state.show_form = True
                st.session_state.selected_grid = activity[3]
                existing = load_activity(activity[0])
                if existing and existing.get('ATTACHMENTS'):
                    try:
                        st.session_state.current_attachments = json.loads(existing.get('ATTACHMENTS', '[]'))
                    except:
                        st.session_state.current_attachments = []
                else:
                    st.session_state.current_attachments = []
                if existing and existing.get('CONNECTIONS'):
                    try:
                        conns = json.loads(existing.get('CONNECTIONS', '[]'))
                        st.session_state.decision_branches = max(2, len(conns))
                    except:
                        st.session_state.decision_branches = 2
                st.rerun()
    else:
        st.info("No activities in this workflow yet. Click a cell on the grid to create one.")
except Exception as e:
    st.error(f"Failed to load activities: {e}")

# Form for add/edit
if st.session_state.show_form and not st.session_state.naming_swimlane and not st.session_state.conflict_dialog:
    st.markdown("---")

    existing = None
    if st.session_state.editing_id:
        existing = load_activity(st.session_state.editing_id)
        st.markdown(f"### Edit Activity #{st.session_state.editing_id}")
    else:
        st.markdown("### New Activity")
        if not st.session_state.selected_grid:
            st.warning("Please select a grid location above before filling out the form.")

    with st.form("activity_form"):
        # Basic Info Section
        st.markdown("#### Basic Info")
        col1, col2, col3 = st.columns([2, 1, 1])
        with col1:
            activity_name = st.text_input("Activity Name*", value=existing.get('ACTIVITY_NAME', '') if existing else '', max_chars=100)
        with col2:
            activity_type = st.selectbox("Type*", ['task', 'decision'],
                index=['task', 'decision'].index(existing.get('ACTIVITY_TYPE', 'task')) if existing and existing.get('ACTIVITY_TYPE') else 0)
        with col3:
            grid_loc = st.session_state.selected_grid or (existing.get('GRID_LOCATION', '') if existing else '')
            st.text_input("Grid Location", value=grid_loc, disabled=True)

        # Connections Section
        st.markdown("#### Connections")

        existing_connections = []
        if existing and existing.get('CONNECTIONS'):
            try:
                existing_connections = json.loads(existing.get('CONNECTIONS', '[]'))
            except:
                existing_connections = []

        if activity_type == 'task':
            next_step = st.text_input("Next Activity (grid location)",
                value=existing_connections[0].get('next', '') if existing_connections else '',
                help="Enter the grid location of the next activity (e.g., A2)")
            connections_data = [{"next": next_step}] if next_step else []
        else:
            st.markdown("**Decision Branches**")
            st.caption("Define the conditions and their corresponding next steps")

            connections_data = []
            for i in range(st.session_state.decision_branches):
                col1, col2 = st.columns(2)
                default_conditions = ['Yes', 'No', 'Maybe', 'Escalate', 'Approve', 'Deny']
                with col1:
                    default_cond = default_conditions[i] if i < len(default_conditions) else ''
                    condition = st.text_input(
                        f"Condition {i+1}",
                        value=existing_connections[i].get('condition', default_cond) if i < len(existing_connections) else default_cond,
                        key=f"cond_{i}",
                        placeholder="e.g., Approved, Denied"
                    )
                with col2:
                    next_loc = st.text_input(
                        f"Next Activity {i+1}",
                        value=existing_connections[i].get('next', '') if i < len(existing_connections) else '',
                        key=f"next_{i}",
                        placeholder="e.g., B1"
                    )
                if condition or next_loc:
                    connections_data.append({"condition": condition, "next": next_loc})

        # Time & Cost Section
        st.markdown("#### Time & Cost")

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
                if opt.startswith(existing_task_time + ' ') and existing_task_time:
                    task_time_idx = i
                    break
            if existing and existing.get('TASK_TIME_CUSTOM') and not existing.get('TASK_TIME_SIZE'):
                task_time_idx = len(task_time_options) - 1

            task_time_size_full = st.selectbox("Size", task_time_options, index=task_time_idx, key="task_time_size")
            task_time_size = task_time_size_full.split(' - ')[0] if ' - ' in task_time_size_full else task_time_size_full

            task_time_custom = None
            task_time_midpoint = None
            if task_time_size == 'Other':
                task_time_custom = st.number_input("Custom value (minutes)", min_value=0.0,
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
                if opt.startswith(existing_labor_rate + ' ') and existing_labor_rate:
                    labor_rate_idx = i
                    break
            if existing and existing.get('LABOR_RATE_CUSTOM') and not existing.get('LABOR_RATE_SIZE'):
                labor_rate_idx = len(labor_rate_options) - 1

            labor_rate_size_full = st.selectbox("Size", labor_rate_options, index=labor_rate_idx, key="labor_rate_size")
            labor_rate_size = labor_rate_size_full.split(' - ')[0] if ' - ' in labor_rate_size_full else labor_rate_size_full

            labor_rate_custom = None
            labor_rate_midpoint = None
            if labor_rate_size == 'Other':
                labor_rate_custom = st.number_input("Custom value ($/hour)", min_value=0.0,
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
                if opt.startswith(existing_volume + ' ') and existing_volume:
                    volume_idx = i
                    break
            if existing and existing.get('VOLUME_CUSTOM') and not existing.get('VOLUME_SIZE'):
                volume_idx = len(volume_options) - 1

            volume_size_full = st.selectbox("Size", volume_options, index=volume_idx, key="volume_size")
            volume_size = volume_size_full.split(' - ')[0] if ' - ' in volume_size_full else volume_size_full

            volume_custom = None
            volume_midpoint = None
            if volume_size == 'Other':
                volume_custom = st.number_input("Custom value (per month)", min_value=0.0,
                    value=float(existing.get('VOLUME_CUSTOM', 0)) if existing and existing.get('VOLUME_CUSTOM') else 0.0,
                    key="volume_custom")
                volume_midpoint = volume_custom
            elif volume_size:
                volume_midpoint = get_midpoint(tshirt_config, 'volume', volume_size)
                if volume_midpoint:
                    st.caption(f"Midpoint: {volume_midpoint:,.0f}/mo")

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

        if st.session_state.current_attachments:
            st.markdown("**Current Attachments:**")
            for att in st.session_state.current_attachments:
                filepath = os.path.join(UPLOADS_DIR, att.get('filename', ''))
                if os.path.exists(filepath):
                    st.markdown(f"- {att.get('name', 'Unknown')}")

        uploaded_files = st.file_uploader(
            "Upload new files",
            accept_multiple_files=True,
            key="file_uploader"
        )

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
            grid_location = st.session_state.selected_grid or (existing.get('GRID_LOCATION', '') if existing else '')

            if not activity_name:
                st.error("Activity Name is required.")
            elif not grid_location:
                st.error("Please select a grid location from the grid above.")
            else:
                attachments_list = list(st.session_state.current_attachments)
                if uploaded_files:
                    for uploaded_file in uploaded_files:
                        file_info = save_uploaded_file(uploaded_file)
                        attachments_list.append(file_info)

                data = {
                    'activity_name': activity_name,
                    'activity_type': activity_type,
                    'grid_location': grid_location.upper(),
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
                    'attachments': json.dumps(attachments_list) if attachments_list else None,
                    'comments': comments or None,
                    'data_confidence': data_confidence or None,
                    'data_source': data_source or None,
                }

                try:
                    save_activity(data, workflow_id, st.session_state.editing_id)
                    st.success("Activity saved successfully!")
                    st.session_state.show_form = False
                    st.session_state.editing_id = None
                    st.session_state.current_attachments = []
                    st.session_state.selected_grid = None
                    st.rerun()
                except Exception as e:
                    st.error(f"Failed to save: {e}")

        if cancelled:
            st.session_state.show_form = False
            st.session_state.editing_id = None
            st.session_state.current_attachments = []
            st.session_state.selected_grid = None
            st.rerun()

    # Add Branch button (outside form for decisions)
    if activity_type == 'decision':
        col1, col2 = st.columns([1, 5])
        with col1:
            if st.button("+ Add Branch"):
                st.session_state.decision_branches += 1
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
                        st.session_state.current_attachments = []
                        st.session_state.selected_grid = None
                        st.rerun()
                    except Exception as e:
                        st.error(f"Failed to delete: {e}")
            with col2:
                if st.button("No, Cancel##delete"):
                    st.session_state.delete_confirm = None
                    st.rerun()
        else:
            if st.button("Delete Activity", type="secondary"):
                st.session_state.delete_confirm = st.session_state.editing_id
                st.rerun()
