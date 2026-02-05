# Author: Danilo Piparo, Diogo Castro 2015
# Copyright CERN

import jupyterhub.handlers.pages as pages
import jupyterhub.apihandlers.users as users
from jupyterhub import app
from .spawn_handler import SpawnHandler
from .error_handler import ProxyErrorHandler
from .userapi_handler import SelfAPIHandler
from . import get_templates
from traitlets import default
import os
import datetime

handlers_map = {
    pages.SpawnHandler: SpawnHandler,
    pages.ProxyErrorHandler: ProxyErrorHandler,
    users.SelfAPIHandler: SelfAPIHandler
}


from jupyterhub.handlers import BaseHandler
from tornado import web


class SwanCustomEnvironmentsHandler(BaseHandler):
    """
    Render the custom environment building view on the Hub.
    
    The page will make API calls to the user's single-user server
    through JupyterHub's proxy at /user/{username}/api/customenvs
    """

    @web.authenticated
    async def get(self):
        user = await self.get_current_user()
        if user is None:
            raise web.HTTPError(403)
        
        # Get the user's default server (empty string name)
        spawner = user.spawners.get("")
        
        # Check server state - but don't redirect, let the JS handle waiting
        server_ready = spawner is not None and spawner.ready
        
        # If no spawner at all and not pending, redirect to spawn
        # if spawner is None or (not spawner.ready and not spawner.pending):
        #     self.redirect(self.hub.base_url + "spawn")
        #     return

        html = await self.render_template(
            "customenvs.html",
            user=user,
            user_server_url=user.url,
            server_ready=server_ready,
            # Progress URL for polling spawn status
            progress_url=user.url + "api/status",
        )
        self.finish(html)


class SWAN(app.JupyterHub):
    name = 'swan'

    @default('logo_file')
    def _logo_file_default(self):
        return os.path.join(
            self.data_files_path, 'static', 'swan', 'logos', 'logo_swan_cloudhisto.png'
        )

    @default('load_roles')
    def _load_roles_default(self):
        # Ensure that users can see their own auth_state
        # This allows retrieving the up to date tokens and put them inside
        # the user container
        # Replace this config with care
        return [
            {
                "name": "user",
                "scopes": ["self", "admin:auth_state!user"]
            },
            {
                'name': 'server',
                'scopes': ["access:servers!user", "read:users:activity!user", "users:activity!user", "admin:auth_state!user"]
            }
        ]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.template_paths = [get_templates()]
        self.log.info("SWAN Custom Environments Hub extension loaded")

    def init_tornado_settings(self):
        self.template_vars['current_year'] = datetime.datetime.now().year # For copyright message
        if datetime.date.today().month == 12:
            # It's Christmas time!
            self.template_vars['swan_logo_filename'] = 'swan_letters_christmas.png' 
        else:
            self.template_vars['swan_logo_filename'] = 'logo_swan_letters.png' 

        super().init_tornado_settings()

    def init_handlers(self):
        super().init_handlers()
        for i, cur_handler in enumerate(self.handlers):
            new_handler = handlers_map.get(cur_handler[1])
            if new_handler:
                cur_handler = list(cur_handler)
                cur_handler[1] = new_handler
                self.handlers[i] = tuple(cur_handler)
        self.handlers.insert(0, (r'/hub/customenvs', SwanCustomEnvironmentsHandler))
        self.log.info("handlers after SWAN customization: %s", self.handlers)

main = SWAN.launch_instance
