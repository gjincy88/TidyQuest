"""Constants for the TidyQuest integration."""

from __future__ import annotations

from datetime import timedelta

DOMAIN = "tidyquest"
DEFAULT_NAME = "TidyQuest"
DEFAULT_SCAN_INTERVAL = timedelta(minutes=5)

CONF_BASE_URL = "base_url"
CONF_USER_NAME = "user_name"
CONF_TIDYQUEST_USER_ID = "tidyquest_user_id"
CONF_ROOM_ID = "room_id"
CONF_ROOM_NAME = "room_name"
CONF_TASK_ID = "task_id"
CONF_FREQUENCY_DAYS = "frequency_days"
CONF_EFFORT = "effort"
CONF_HEALTH = "health"
CONF_NOTES = "notes"
CONF_ASSIGNED_USERS = "assigned_users"
CONF_ASSIGNMENT_MODE = "assignment_mode"
CONF_ON_DEMAND = "on_demand"
CONF_SHOW_IN_DASHBOARD = "show_in_dashboard"
CONF_IS_SEASONAL = "is_seasonal"
CONF_ICON_KEY = "icon_key"

SERVICE_COMPLETE_TASK = "complete_task"
SERVICE_RESET_TASK = "reset_task"
SERVICE_CREATE_TASK = "create_task"
SERVICE_UPDATE_TASK = "update_task"
SERVICE_DELETE_TASK = "delete_task"
SERVICE_REFRESH = "refresh"

PLATFORMS = ["sensor"]
