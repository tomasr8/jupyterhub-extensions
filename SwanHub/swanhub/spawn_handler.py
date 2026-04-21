# Author: Danilo Piparo, Enric Tejedor, Diogo Castro 2016
# Copyright CERN

"""CERN Spawn handler"""

import json
import time
from socket import (
    gethostname,
)

import sentry_sdk
from jupyterhub.handlers.pages import SpawnHandler as JHSpawnHandler
from jupyterhub.scopes import needs_scope
from jupyterhub.utils import maybe_future, url_path_join
from tornado import web
from tornado.httputil import url_concat

from .handlers_configs import SpawnHandlersConfigs


class SpawnHandler(JHSpawnHandler):
    """Handle spawning of single-user servers via form.

    GET renders the form, POST handles form submission.

    Only enabled when Spawner.options_form is defined.
    """

    @web.authenticated
    async def get(self, for_user=None, server_name=''):
        """
        GET renders user-specified options spawn-form or spawns a session if 'always start with this configuration'
        was selected
        """

        self.log.info("Handling spawner GET request")

        configs = SpawnHandlersConfigs.instance()
        user = self.current_user

        spawner = user.get_spawner(server_name)

        if spawner.ready:
            # User has a session running, redirect to the correct page,
            # according to the user's choice and the current session
            spawner_software_source = spawner.user_options.get(configs.software_source)
            next_url = url_path_join("user", user.escaped_name, "customenvs" if spawner_software_source == configs.customenv_special_type else "")

            page = await self.render_template('spawn_conflict.html', for_user=user, spawner=spawner, next_url=next_url)
            self.finish(page)
            return

        elif spawner.pending:
            # If the spawner is pending, show the pending page
            auth_state = await user.get_auth_state()
            page = await self.render_template(
                'spawn_pending.html',
                for_user=user,
                spawner=spawner,
                progress_url=url_concat(spawner._progress_url, {"_xsrf": self.xsrf_token.decode('ascii')}),
                auth_state=auth_state,
            )
            self.finish(page)
            return

        if 'failed' in self.request.query_arguments:
            form = await self._render_form_wrapper(user, message=configs.spawn_error_message)
            self.finish(form)
            return

        try:
            await super().get(for_user, server_name)
        except web.HTTPError as e:
            form = await self._render_form_wrapper(user, message=e.message)
            self.finish(form)
            return

    @web.authenticated
    def post(self, user_name=None, server_name=''):
        """POST spawns with user-specified options"""
        self.log.info("Handling spawner POST request")

        if user_name is None:
            user_name = self.current_user.name
        if server_name is None:
            server_name = ""
        return self._post(user_name=user_name, server_name=server_name)

    @needs_scope("servers")
    async def _post(self, user_name, server_name):
        configs = SpawnHandlersConfigs.instance()
        for_user = user_name
        user = current_user = self.current_user

        if for_user != user.name:
            user = self.find_user(for_user)
            if user is None:
                raise web.HTTPError(404, "No such user: %s" % for_user)

        # Set the user in Sentry as soon as it's resolved so that any exception raised
        # after this point will have the user information attached in Sentry.
        sentry_sdk.set_user({"username": user.name})

        spawner = user.get_spawner(server_name, replace_failed=True)

        if spawner.ready:
            raise web.HTTPError(400, "%s is already running" % (spawner._log_name))
        elif spawner.pending:
            raise web.HTTPError(
                400, f"{spawner._log_name} is pending {spawner.pending}"
            )

        try:
            form_options = json.loads(self.get_body_argument('payload'))
        except json.JSONDecodeError:
            raise web.HTTPError(400, "Invalid JSON in form payload")

        start_time_spawn = time.time()

        options = {}
        try:
            options = await maybe_future(spawner.run_options_from_form(form_options))

            # Set spawn options in Sentry as soon as they are available so that any exception
            # raised after this point will have the spawn options attached in Sentry.
            sentry_set_spawn_tags(options)

            await self.spawn_single_user(user, server_name=server_name, options=options)

            # if spawn future is already done it is success,
            # otherwise add done callback to spawn future
            if spawner._spawn_future and not spawner._spawn_future.done():
                def _finish_spawn(f):
                    """
                    Future done callback called at the termination of user.spawner._spawn_future,
                    used to report spawn metrics
                    """
                    if f.exception() is None:
                        # log successful spawn
                        self._log_spawn_metrics(
                            user, options, time.time() - start_time_spawn)
                    else:
                        # log failed spawn
                        self._log_spawn_metrics(
                            user, options, time.time() - start_time_spawn, f.exception())
                        self.log.error(
                            "Failed to spawn single-user server", exc_info=True)

                user.spawner._spawn_future.add_done_callback(_finish_spawn)
            else:
                self._log_spawn_metrics(
                    user, options, time.time() - start_time_spawn)

        except Exception as e:
            self._log_spawn_metrics(
                user, options, time.time() - start_time_spawn, e)

            if type(e) in (web.HTTPError, TimeoutError):
                error_message = configs.spawn_error_message
                self.log.warning(
                    "Failed to spawn single-user server with known error", exc_info=True)
            else:
                error_message = str(e)
                self.log.error(
                    "Failed to spawn single-user server with form", exc_info=True)

            form = await self._render_form_wrapper(user, message=error_message)
            self.finish(form)
            return

        if current_user is user:
            self.set_login_cookie(user)


        if options.get(configs.software_source) == configs.customenv_special_type:
            # Add the query arguments to the URL
            query_params = {
                configs.repository: options.get(configs.repository, ''),
                configs.builder: options.get(configs.builder),
                configs.file: options.get(configs.file, ''),
                configs.user_interface: options.get(configs.user_interface, 'lab'),
            }
            # If the builder has a version, pass it as an argument of the query
            if options.get(configs.builder_version):
                query_params[configs.builder_version] = options[configs.builder_version]
            elif options.get(configs.lcg_rel_field):
                query_params[configs.builder], query_params[configs.builder_version] = options[configs.lcg_rel_field].split('-')
            if options.get(configs.spark_cluster_field, "none") == "hadoop-nxcals":
                query_params["nxcals"] = True

            # Execution SwanCustomEnvs extension with the corresponding query arguments
            next_url = url_concat(url_path_join("user", user.escaped_name, "customenvs", server_name), query_params)
        else: # LCG release
            next_url = self.get_next_url(user, default=url_path_join(self.hub.base_url, "spawn-pending", user.escaped_name, server_name))
            if options[configs.use_jupyterlab_field]:
                # Open in SWAN (we have "next" argument)
                if 'next' in self.request.query_arguments:
                    next_url += "&use-jupyterlab=true"
                # User requested to open a file
                elif options.get(configs.file):
                    next_url = url_path_join("user", user.escaped_name, "lab", "tree", *options[configs.file].split('/'))

        self.redirect(next_url)

    async def _render_form_wrapper(self, for_user, message=''):
        spawner_options_form = await for_user.spawner.get_options_form()
        form = await self._render_form(for_user, spawner_options_form, message)
        return form

    async def _render_form(self, for_user, spawner_options_form, message='', *args, **kwargs):
        auth_state = await for_user.get_auth_state()

        return await self.render_template('spawn.html',
                                    for_user=for_user,
                                    auth_state=auth_state,
                                    spawner_options_form=spawner_options_form,
                                    error_message=message,
                                    url=url_concat(
                                        self.request.uri, {"_xsrf": self.xsrf_token.decode('ascii')}
                                    ),
                                    spawner=for_user.spawner,
                                    )


    def _log_spawn_metrics(self, user, options, spawn_duration_sec, spawn_exception=None):
        """
        Log and send user chosen options to the metrics server.
        This will allow us to see what users are choosing from within Grafana.
        """

        host = gethostname().split('.')[0]
        configs = SpawnHandlersConfigs.instance()

        for (key, value) in options.items():
            if key == configs.user_env_script_field:
                # For the environment script, we want to log only whether it is set or not, not the actual value
                value_cleaned = 'set' if value else 'not_set'
            else:
                value_cleaned = str(value).replace('/', '_')
            self._log_metric(user.name, host, ".".join(['spawn_form', key]), value_cleaned)

        spawn_context_key = ".".join(
            [options.get(configs.lcg_rel_field, "CustomEnv"), options.get(configs.spark_cluster_field, "none")])
        if not spawn_exception:
            # Add spawn success (no exception) and duration to the log and send as metrics
            spawn_exc_class = "None"
            self._log_metric(user.name, host, ".".join(
                ["spawn", spawn_context_key, "exception_class"]), spawn_exc_class)
            self._log_metric(user.name, host, ".".join(
                ["spawn", spawn_context_key, "duration_sec"]), spawn_duration_sec)
        else:
            # Log spawn exception (send exception as metric)
            spawn_exc_class = spawn_exception.__class__.__name__
            self._log_metric(user.name, host, ".".join(
                ["spawn", spawn_context_key, "exception_class"]), spawn_exc_class)
            self._log_metric(user.name, host, ".".join(
                ["spawn", spawn_context_key, "exception_message"]), str(spawn_exception))

            # Report spawn exception to Sentry. The user and spawn options
            # were already set in the _post method.
            sentry_sdk.capture_exception(spawn_exception)

    def _log_metric(self, user, host, metric, value):
        self.log.info("user: %s, host: %s, metric: %s, value: %s" %
                      (user, host, metric, value))


def sentry_set_spawn_tags(spawn_options: dict):
    for key, value in spawn_options.items():
        if value:  # Sentry does not like empty tag values (shows a warning in the UI)
            sentry_sdk.set_tag(f"spawn_form.{key}", value)
