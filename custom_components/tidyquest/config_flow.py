"""Config flow for TidyQuest."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant import config_entries
from homeassistant.const import CONF_PASSWORD, CONF_USERNAME
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .api import TidyQuestApiClient, TidyQuestApiError
from .const import CONF_BASE_URL, DEFAULT_NAME, DOMAIN


class TidyQuestConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a TidyQuest config flow."""

    VERSION = 1

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.ConfigFlowResult:
        """Handle the initial step."""
        errors: dict[str, str] = {}

        if user_input is not None:
            base_url = user_input[CONF_BASE_URL].rstrip("/")
            username = user_input[CONF_USERNAME]
            password = user_input[CONF_PASSWORD]

            client = TidyQuestApiClient(
                async_get_clientsession(self.hass), base_url, username, password
            )
            try:
                user = await client.async_login()
            except TidyQuestApiError as err:
                if err.status == 401:
                    errors["base"] = "invalid_auth"
                else:
                    errors["base"] = "cannot_connect"
            else:
                await self.async_set_unique_id(f"{base_url}:{user['id']}")
                self._abort_if_unique_id_configured()
                title = f"{DEFAULT_NAME} ({user.get('displayName') or username})"
                return self.async_create_entry(
                    title=title,
                    data={
                        CONF_BASE_URL: base_url,
                        CONF_USERNAME: username,
                        CONF_PASSWORD: password,
                    },
                )

        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema(
                {
                    vol.Required(CONF_BASE_URL, default="http://localhost:3020"): str,
                    vol.Required(CONF_USERNAME): str,
                    vol.Required(CONF_PASSWORD): str,
                }
            ),
            errors=errors,
        )
