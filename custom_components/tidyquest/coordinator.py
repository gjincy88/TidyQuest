"""Data coordinator for the TidyQuest integration."""

from __future__ import annotations

from dataclasses import dataclass
import logging
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .api import TidyQuestApiClient, TidyQuestApiError
from .const import DEFAULT_SCAN_INTERVAL, DOMAIN

_LOGGER = logging.getLogger(__name__)


@dataclass(slots=True)
class TidyQuestData:
    """Latest TidyQuest data used by entities and services."""

    rooms: list[dict[str, Any]]
    users: list[dict[str, Any]]
    tasks: dict[int, dict[str, Any]]


class TidyQuestCoordinator(DataUpdateCoordinator[TidyQuestData]):
    """Coordinate TidyQuest API updates."""

    def __init__(self, hass: HomeAssistant, client: TidyQuestApiClient) -> None:
        super().__init__(
            hass,
            _LOGGER,
            name=DOMAIN,
            update_interval=DEFAULT_SCAN_INTERVAL,
        )
        self.client = client

    async def _async_update_data(self) -> TidyQuestData:
        """Fetch all data from TidyQuest."""
        try:
            rooms = await self.client.async_get_rooms()
            users = await self.client.async_get_users()
        except TidyQuestApiError as err:
            raise UpdateFailed(str(err)) from err

        tasks: dict[int, dict[str, Any]] = {}
        for room in rooms:
            for task in room.get("tasks", []):
                task_with_room = dict(task)
                task_with_room["roomName"] = room.get("name")
                task_with_room["roomType"] = room.get("roomType")
                task_with_room["roomHealth"] = room.get("health")
                tasks[int(task["id"])] = task_with_room

        return TidyQuestData(rooms=rooms, users=users, tasks=tasks)
