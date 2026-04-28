"""TidyQuest task sensors."""

from __future__ import annotations

from typing import Any

from homeassistant.components.sensor import SensorEntity, SensorStateClass
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import PERCENTAGE
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import DOMAIN
from .coordinator import TidyQuestCoordinator


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up TidyQuest sensors."""
    coordinator: TidyQuestCoordinator = hass.data[DOMAIN][entry.entry_id]["coordinator"]
    known_task_ids: set[int] = set()

    def add_new_entities() -> None:
        new_entities = []
        for task_id in coordinator.data.tasks:
            if task_id not in known_task_ids:
                known_task_ids.add(task_id)
                new_entities.append(TidyQuestTaskSensor(coordinator, entry.entry_id, task_id))
        if new_entities:
            async_add_entities(new_entities)

    add_new_entities()
    entry.async_on_unload(coordinator.async_add_listener(add_new_entities))


class TidyQuestTaskSensor(CoordinatorEntity[TidyQuestCoordinator], SensorEntity):
    """Sensor representing a TidyQuest task health value."""

    _attr_has_entity_name = True
    _attr_native_unit_of_measurement = PERCENTAGE
    _attr_state_class = SensorStateClass.MEASUREMENT

    def __init__(
        self, coordinator: TidyQuestCoordinator, entry_id: str, task_id: int
    ) -> None:
        super().__init__(coordinator)
        self._task_id = task_id
        self._attr_unique_id = f"{entry_id}_task_{task_id}"

    @property
    def name(self) -> str | None:
        """Return the entity name."""
        task = self._task
        if not task:
            return None
        room_name = task.get("roomName")
        if room_name:
            return f"{room_name} {task.get('name')} health"
        return f"{task.get('name')} health"

    @property
    def native_value(self) -> int | float | None:
        """Return task health."""
        task = self._task
        if not task:
            return None
        return task.get("health")

    @property
    def available(self) -> bool:
        """Return if entity is available."""
        return super().available and self._task is not None

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        """Return task attributes."""
        task = self._task
        if not task:
            return {"task_id": self._task_id}

        return {
            "task_id": self._task_id,
            "room_id": task.get("roomId"),
            "room_name": task.get("roomName"),
            "room_type": task.get("roomType"),
            "task_name": task.get("name"),
            "notes": task.get("notes"),
            "frequency_days": task.get("frequencyDays"),
            "effort": task.get("effort"),
            "is_due": (task.get("health") or 0) <= 0,
            "is_seasonal": task.get("isSeasonal"),
            "last_completed_at": task.get("lastCompletedAt"),
            "completed_today_by": _user_name(task.get("completedTodayBy")),
            "assignment_mode": task.get("assignmentMode"),
            "assigned_users": [
                user.get("displayName") for user in task.get("assignedUsers") or []
            ],
            "assigned_user_ids": task.get("assignedUserIds") or [],
            "effective_assigned_user_ids": task.get("effectiveAssignedUserIds") or [],
            "shared_completions": [
                user.get("displayName") for user in task.get("sharedCompletions") or []
            ],
            "on_demand": bool(task.get("onDemand")),
            "show_in_dashboard": bool(task.get("showInDashboard")),
            "icon_key": task.get("iconKey"),
        }

    @property
    def device_info(self) -> dict[str, Any]:
        """Group task sensors by TidyQuest room."""
        task = self._task
        room_id = task.get("roomId") if task else "unknown"
        room_name = task.get("roomName") if task else "TidyQuest"
        return {
            "identifiers": {(DOMAIN, f"room_{room_id}")},
            "name": room_name,
            "manufacturer": "TidyQuest",
        }

    @property
    def _task(self) -> dict[str, Any] | None:
        """Return the latest task data."""
        return self.coordinator.data.tasks.get(self._task_id)


def _user_name(user: dict[str, Any] | None) -> str | None:
    """Return a display name from a user payload."""
    if not user:
        return None
    return user.get("displayName") or user.get("username")
