"""Services for the TidyQuest integration."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.const import ATTR_ENTITY_ID, CONF_NAME
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.exceptions import HomeAssistantError
import homeassistant.helpers.config_validation as cv

from .api import TidyQuestApiError
from .const import (
    CONF_ASSIGNED_USERS,
    CONF_ASSIGNMENT_MODE,
    CONF_EFFORT,
    CONF_FREQUENCY_DAYS,
    CONF_HEALTH,
    CONF_ICON_KEY,
    CONF_IS_SEASONAL,
    CONF_NOTES,
    CONF_ON_DEMAND,
    CONF_ROOM_ID,
    CONF_ROOM_NAME,
    CONF_SHOW_IN_DASHBOARD,
    CONF_TASK_ID,
    CONF_TIDYQUEST_USER_ID,
    CONF_USER_NAME,
    DOMAIN,
    SERVICE_COMPLETE_TASK,
    SERVICE_CREATE_TASK,
    SERVICE_DELETE_TASK,
    SERVICE_REFRESH,
    SERVICE_RESET_TASK,
    SERVICE_UPDATE_TASK,
)
from .coordinator import TidyQuestCoordinator

COMPLETE_SCHEMA = vol.Schema(
    {
        vol.Optional(ATTR_ENTITY_ID): cv.entity_ids,
        vol.Optional(CONF_TASK_ID): cv.positive_int,
        vol.Optional(CONF_USER_NAME): cv.string,
        vol.Optional(CONF_TIDYQUEST_USER_ID): cv.positive_int,
    }
)

CREATE_SCHEMA = vol.Schema(
    {
        vol.Exclusive(CONF_ROOM_ID, "room"): cv.positive_int,
        vol.Exclusive(CONF_ROOM_NAME, "room"): cv.string,
        vol.Required(CONF_NAME): cv.string,
        vol.Optional(CONF_NOTES): cv.string,
        vol.Optional(CONF_FREQUENCY_DAYS): vol.Coerce(float),
        vol.Optional(CONF_EFFORT): vol.All(vol.Coerce(int), vol.Range(min=1, max=5)),
        vol.Optional(CONF_HEALTH): vol.All(vol.Coerce(int), vol.Range(min=0, max=100)),
        vol.Optional(CONF_ASSIGNED_USERS): vol.All(cv.ensure_list, [cv.string]),
        vol.Optional(CONF_ASSIGNMENT_MODE): vol.In(["first", "shared", "custom"]),
        vol.Optional(CONF_ON_DEMAND): cv.boolean,
        vol.Optional(CONF_SHOW_IN_DASHBOARD): cv.boolean,
        vol.Optional(CONF_IS_SEASONAL): cv.boolean,
        vol.Optional(CONF_ICON_KEY): cv.string,
    }
)

UPDATE_SCHEMA = vol.Schema(
    {
        vol.Optional(ATTR_ENTITY_ID): cv.entity_ids,
        vol.Optional(CONF_TASK_ID): cv.positive_int,
        vol.Optional(CONF_NAME): cv.string,
        vol.Optional(CONF_NOTES): cv.string,
        vol.Optional(CONF_FREQUENCY_DAYS): vol.Coerce(float),
        vol.Optional(CONF_EFFORT): vol.All(vol.Coerce(int), vol.Range(min=1, max=5)),
        vol.Optional(CONF_HEALTH): vol.All(vol.Coerce(int), vol.Range(min=0, max=100)),
        vol.Optional(CONF_ASSIGNED_USERS): vol.All(cv.ensure_list, [cv.string]),
        vol.Optional(CONF_ASSIGNMENT_MODE): vol.In(["first", "shared", "custom"]),
        vol.Optional(CONF_ON_DEMAND): cv.boolean,
        vol.Optional(CONF_SHOW_IN_DASHBOARD): cv.boolean,
        vol.Optional(CONF_IS_SEASONAL): cv.boolean,
        vol.Optional(CONF_ICON_KEY): cv.string,
    }
)

DELETE_SCHEMA = vol.Schema(
    {
        vol.Optional(ATTR_ENTITY_ID): cv.entity_ids,
        vol.Optional(CONF_TASK_ID): cv.positive_int,
    }
)

RESET_SCHEMA = vol.Schema(
    {
        vol.Optional(ATTR_ENTITY_ID): cv.entity_ids,
        vol.Optional(CONF_TASK_ID): cv.positive_int,
    }
)


def async_setup_services(hass: HomeAssistant) -> None:
    """Register TidyQuest services."""
    if hass.services.has_service(DOMAIN, SERVICE_COMPLETE_TASK):
        return

    async def complete_task(call: ServiceCall) -> None:
        task_ids = _task_ids_from_call(hass, call)
        coordinator = _coordinator_for_task(hass, task_ids[0])
        user_id = await _resolve_tidyquest_user_id(hass, coordinator, call)

        for task_id in task_ids:
            task_coordinator = _coordinator_for_task(hass, task_id)
            try:
                await task_coordinator.client.async_complete_task(task_id, user_id)
            except TidyQuestApiError as err:
                raise HomeAssistantError(f"Could not complete TidyQuest task: {err}") from err
            await task_coordinator.async_request_refresh()

    async def create_task(call: ServiceCall) -> None:
        coordinator = _first_coordinator(hass)
        room_id = _resolve_room_id(coordinator, call.data)
        payload = _task_payload(coordinator, call.data, include_name=True)
        try:
            await coordinator.client.async_create_task(room_id, payload)
        except TidyQuestApiError as err:
            raise HomeAssistantError(f"Could not create TidyQuest task: {err}") from err
        await coordinator.async_request_refresh()

    async def update_task(call: ServiceCall) -> None:
        task_ids = _task_ids_from_call(hass, call)
        for task_id in task_ids:
            coordinator = _coordinator_for_task(hass, task_id)
            payload = _task_payload(coordinator, call.data, include_name=False)
            try:
                await coordinator.client.async_update_task(task_id, payload)
            except TidyQuestApiError as err:
                raise HomeAssistantError(f"Could not update TidyQuest task: {err}") from err
            await coordinator.async_request_refresh()

    async def delete_task(call: ServiceCall) -> None:
        task_ids = _task_ids_from_call(hass, call)
        for task_id in task_ids:
            coordinator = _coordinator_for_task(hass, task_id)
            try:
                await coordinator.client.async_delete_task(task_id)
            except TidyQuestApiError as err:
                raise HomeAssistantError(f"Could not delete TidyQuest task: {err}") from err
            await coordinator.async_request_refresh()

    async def reset_task(call: ServiceCall) -> None:
        task_ids = _task_ids_from_call(hass, call)
        for task_id in task_ids:
            coordinator = _coordinator_for_task(hass, task_id)
            try:
                await coordinator.client.async_reset_task(task_id)
            except TidyQuestApiError as err:
                raise HomeAssistantError(f"Could not reset TidyQuest task: {err}") from err
            await coordinator.async_request_refresh()

    async def refresh(call: ServiceCall) -> None:
        for coordinator in _coordinators(hass):
            await coordinator.async_request_refresh()

    hass.services.async_register(
        DOMAIN, SERVICE_COMPLETE_TASK, complete_task, schema=COMPLETE_SCHEMA
    )
    hass.services.async_register(
        DOMAIN, SERVICE_CREATE_TASK, create_task, schema=CREATE_SCHEMA
    )
    hass.services.async_register(
        DOMAIN, SERVICE_UPDATE_TASK, update_task, schema=UPDATE_SCHEMA
    )
    hass.services.async_register(
        DOMAIN, SERVICE_DELETE_TASK, delete_task, schema=DELETE_SCHEMA
    )
    hass.services.async_register(
        DOMAIN, SERVICE_RESET_TASK, reset_task, schema=RESET_SCHEMA
    )
    hass.services.async_register(DOMAIN, SERVICE_REFRESH, refresh)


def async_unload_services(hass: HomeAssistant) -> None:
    """Unregister TidyQuest services."""
    for service in (
        SERVICE_COMPLETE_TASK,
        SERVICE_CREATE_TASK,
        SERVICE_UPDATE_TASK,
        SERVICE_DELETE_TASK,
        SERVICE_RESET_TASK,
        SERVICE_REFRESH,
    ):
        hass.services.async_remove(DOMAIN, service)


def _coordinators(hass: HomeAssistant) -> list[TidyQuestCoordinator]:
    """Return all loaded coordinators."""
    return [
        entry_data["coordinator"] for entry_data in hass.data.get(DOMAIN, {}).values()
    ]


def _first_coordinator(hass: HomeAssistant) -> TidyQuestCoordinator:
    """Return the first loaded coordinator."""
    coordinators = _coordinators(hass)
    if not coordinators:
        raise HomeAssistantError("TidyQuest is not loaded")
    return coordinators[0]


def _coordinator_for_task(hass: HomeAssistant, task_id: int) -> TidyQuestCoordinator:
    """Find the coordinator containing a task."""
    for coordinator in _coordinators(hass):
        if task_id in coordinator.data.tasks:
            return coordinator
    raise HomeAssistantError(f"TidyQuest task id {task_id} was not found")


def _task_ids_from_call(hass: HomeAssistant, call: ServiceCall) -> list[int]:
    """Resolve task ids from task_id or entity_id service data."""
    if CONF_TASK_ID in call.data:
        return [int(call.data[CONF_TASK_ID])]

    entity_ids = call.data.get(ATTR_ENTITY_ID)
    if not entity_ids:
        raise HomeAssistantError("Provide either task_id or entity_id")

    task_ids: list[int] = []
    for entity_id in entity_ids:
        state = hass.states.get(entity_id)
        if state is None:
            raise HomeAssistantError(f"Entity {entity_id} was not found")
        task_id = state.attributes.get("task_id")
        if task_id is None:
            raise HomeAssistantError(f"Entity {entity_id} is not a TidyQuest task sensor")
        task_ids.append(int(task_id))
    return task_ids


async def _resolve_tidyquest_user_id(
    hass: HomeAssistant, coordinator: TidyQuestCoordinator, call: ServiceCall
) -> int | None:
    """Resolve the TidyQuest user represented by a Home Assistant service call."""
    if CONF_TIDYQUEST_USER_ID in call.data:
        return int(call.data[CONF_TIDYQUEST_USER_ID])

    name = call.data.get(CONF_USER_NAME)
    if name is None and call.context.user_id:
        ha_user = await hass.auth.async_get_user(call.context.user_id)
        name = ha_user.name if ha_user else None

    if name is None:
        return None

    user = _find_user_by_name(coordinator, str(name))
    if user is None:
        raise HomeAssistantError(
            f"No TidyQuest user matches Home Assistant user name '{name}'. "
            "Set user_name or tidyquest_user_id on the service call, or rename the "
            "Home Assistant user to match a TidyQuest display name or username."
        )
    return int(user["id"])


def _find_user_by_name(
    coordinator: TidyQuestCoordinator, name: str
) -> dict[str, Any] | None:
    """Find a TidyQuest user by display name or username."""
    normalized = name.strip().casefold()
    for user in coordinator.data.users:
        candidates = (user.get("displayName"), user.get("username"))
        if any(str(candidate).strip().casefold() == normalized for candidate in candidates if candidate):
            return user
    return None


def _resolve_room_id(coordinator: TidyQuestCoordinator, data: dict[str, Any]) -> int:
    """Resolve a room id from service data."""
    if CONF_ROOM_ID in data:
        return int(data[CONF_ROOM_ID])

    room_name = data[CONF_ROOM_NAME].strip().casefold()
    for room in coordinator.data.rooms:
        if str(room.get("name", "")).strip().casefold() == room_name:
            return int(room["id"])
    raise HomeAssistantError(f"No TidyQuest room matches '{data[CONF_ROOM_NAME]}'")


def _task_payload(
    coordinator: TidyQuestCoordinator,
    data: dict[str, Any],
    *,
    include_name: bool,
) -> dict[str, Any]:
    """Convert Home Assistant service data into a TidyQuest task payload."""
    payload: dict[str, Any] = {}
    if include_name or CONF_NAME in data:
        payload["name"] = data[CONF_NAME]
    _copy_if_present(payload, data, CONF_NOTES, "notes")
    _copy_if_present(payload, data, CONF_FREQUENCY_DAYS, "frequencyDays")
    _copy_if_present(payload, data, CONF_EFFORT, "effort")
    _copy_if_present(payload, data, CONF_HEALTH, "health")
    _copy_if_present(payload, data, CONF_ASSIGNMENT_MODE, "assignmentMode")
    _copy_if_present(payload, data, CONF_ON_DEMAND, "onDemand")
    _copy_if_present(payload, data, CONF_SHOW_IN_DASHBOARD, "showInDashboard")
    _copy_if_present(payload, data, CONF_IS_SEASONAL, "isSeasonal")
    _copy_if_present(payload, data, CONF_ICON_KEY, "iconKey")

    if CONF_ASSIGNED_USERS in data:
        payload["assignedUserIds"] = [
            int(_user_id_from_name(coordinator, name))
            for name in data[CONF_ASSIGNED_USERS]
        ]
    return payload


def _copy_if_present(
    payload: dict[str, Any], data: dict[str, Any], source: str, target: str
) -> None:
    """Copy a service field if present."""
    if source in data:
        payload[target] = data[source]


def _user_id_from_name(coordinator: TidyQuestCoordinator, name: str) -> int:
    """Return a TidyQuest user id for a display name or username."""
    user = _find_user_by_name(coordinator, name)
    if user is None:
        raise HomeAssistantError(f"No TidyQuest user matches '{name}'")
    return int(user["id"])
