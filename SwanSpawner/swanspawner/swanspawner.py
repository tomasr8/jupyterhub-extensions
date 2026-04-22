# Author: Danilo Piparo, Enric Tejedor, Diogo Castro 2015
# Copyright CERN

"""CERN Specific Spawner class"""

import json
import os
import re
import time
from socket import gethostname

import yaml
from jinja2 import Environment, FileSystemLoader
from traitlets import Bool, Int, List, Unicode


# ── Wire format (browser → server) ────────────────────────────────────────────
# The options form POSTs a single JSON payload with the keys below. All fields
# that can be derived server-side (platform, rse mount path, etc.) are NOT sent.
#
# {
#   "source":           "lcg" | "customenv",
#   "release":          "LCG_109_swan",            # lcg only
#   "builder":          "venv:default",            # customenv only
#   "repository":       "https://...",             # customenv only
#   "scriptEnv":        "$CERNBOX_HOME/...",       # lcg only
#   "cores":            4,                         # int
#   "memory":           8,                         # int (GB)
#   "gpu":              "v100" | "none",
#   "cluster":          "hadoop-analytix" | "none",
#   "condor":           "cern_condor" | "none",    # lcg only
#   "rucio":            "atlas" | "none",          # lcg only
#   "rucioRse":         "CERN-PROD_DAQ" | "none",  # lcg only
#   "useJupyterLab":    true | false,
#   "useLocalPackages": true | false               # lcg only
# }
#
# ── Internal format (self.user_options, consumed by get_env + subclasses) ─────
# Keys are snake_case. Derived fields (platform, rucio_rse_mount_path,
# rucio_path_begins_at, builder_version) are populated by options_from_form.
# See _process_lcg / _process_customenv for the full set.



def get_repo_name_from_options(user_options: dict) -> str:
    """
    Extract repository name from the full repository URL
    and return the SWAN working directory.
    """
    repo_url = user_options.get('repository', '')
    if not repo_url:
        return ""

    repo_name = repo_url.removesuffix("/").removesuffix(".git").split("/")[-1]
    return os.path.join("SWAN_projects", repo_name)


def define_SwanSpawner_from(base_class):
    """
    The Spawner needs to inherit from a proper upstream Spawner (i.e Docker or Kube).
    But since our personalization, added on top of those, is exactly the same for all,
    by allowing a dynamic inheritance we can re-use the same code on all cases.
    This function returns our SwanSpawner, inheriting from a class (upstream Spawner)
    given as parameter.
    """

    class SwanSpawner(base_class):

        # ── Traits ──────────────────────────────────────────────────────────

        options_form_config = Unicode(
            config=True,
            help='Path to configuration file for options_form rendering.'
        )

        general_domain_name = Unicode(
            default_value='swan.cern.ch',
            config=True,
            help='Domain name of the general SwanHub instance.'
        )

        ats_domain_name = Unicode(
            default_value='ats.swan.cern.ch',
            config=True,
            help='Domain name of the ATS SwanHub instance.'
        )

        stacks_for_customenvs = List(
            default_value=[],
            config=True,
            help='List of software stacks that will use customenvs extension for building the environment'
        )

        ats_role = Unicode(
            default_value='swan-ats',
            config=True,
            help='Role to allow creation of ATS sessions.'
        )

        lcg_view_path = Unicode(
            default_value='/cvmfs/sft.cern.ch/lcg/views',
            config=True,
            help='Path where LCG views are stored in CVMFS.'
        )

        local_home = Bool(
            default_value=False,
            config=True,
            help="If True, a physical directory on the host will be the scratch space, otherwise EOS."
        )

        eos_path_format = Unicode(
            default_value='/eos/user/{username[0]}/{username}/',
            config=True,
            help='Path format of the users home folder in EOS.'
        )

        extended_timeout = Int(
            default_value=120,
            config=True,
            help="Extended timeout for users using environment script"
        )

        def __init__(self, **kwargs):
            super().__init__(**kwargs)
            self.this_host = gethostname().split('.')[0]
            if not self.options_form and self.options_form_config:
                # if options_form not provided, use templated options form based on configuration file
                self.options_form = self._render_templated_options_form
            # Dictionary with dynamic information to insert in the options form
            self._dynamic_form_info = {}

        # ── YAML config helpers ─────────────────────────────────────────────

        # NB: do NOT name this _load_config — that's an existing method on
        # traitlets.config.Configurable (signature _load_config(cfg, traits=,
        # section_names=)) called whenever the .config trait changes.
        def _load_options_form_config(self) -> dict:
            """Load and parse the options_form_config YAML file."""
            with open(self.options_form_config) as yaml_file:
                return yaml.safe_load(yaml_file) or {}

        def _build_release_index(self, config: dict) -> dict:
            """
            Flatten lcg_releases into a {release_value: {profile, platform, label, category}}
            lookup. This is the inverse of the nested-category layout used in the YAML.
            """
            idx = {}
            for cat_key, cat in (config.get('lcg_releases') or {}).items():
                for rel in cat.get('releases', []) or []:
                    idx[rel['value']] = {
                        'profile':  rel['profile'],
                        'platform': rel['platform'],
                        'label':    rel.get('label', rel['value']),
                        'category': cat_key,
                    }
            return idx

        def _build_builder_index(self, config: dict) -> dict:
            """Flatten custom_environments.builders into a {builder_value: {profile, label}} lookup."""
            idx = {}
            for b in (config.get('custom_environments') or {}).get('builders') or []:
                idx[b['value']] = {
                    'profile': b['profile'],
                    'label':   b.get('label', b['value']),
                }
            return idx

        def _get_profile(self, config: dict, profile_name: str) -> dict:
            """Return the named resource profile, or raise if unknown."""
            p = (config.get('resource_profiles') or {}).get(profile_name)
            if p is None:
                raise ValueError(f'Unknown resource profile: {profile_name!r}')
            return p

        # ── Validation ──────────────────────────────────────────────────────

        @staticmethod
        def _allowed_values(items: list) -> set:
            """
            Normalize a profile field (plain-value list like [2, 4] or {value,label}
            list like [{value:k8s,label:"..."}]) into a set of legal values.
            """
            return {item['value'] if isinstance(item, dict) else item for item in (items or [])}

        def _validate_profile_fields(self, profile: dict, payload: dict, fields: list) -> None:
            """
            For each (payload_key, profile_field) pair, check the submitted value
            is legal per the profile definition.
            """
            for payload_key, profile_field in fields:
                allowed = self._allowed_values(profile.get(profile_field, []))
                if not allowed:
                    # Nothing declared ⇒ accept anything (typically 'none').
                    continue
                value = payload.get(payload_key)
                if value not in allowed:
                    raise ValueError(f'Invalid {payload_key} selection: {value!r}')

        # ── Rucio resolution (server-side) ──────────────────────────────────

        def _resolve_rucio(self, config: dict, instance_name: str, rse_name: str) -> dict:
            """
            Resolve the Rucio instance + RSE selection against the global rucio
            config. Returns a dict of the 4 rucio_* internal-dict keys.
            """
            if instance_name == 'none':
                return {
                    'rucio_instance':       'none',
                    'rucio_rse':            'none',
                    'rucio_rse_mount_path': '',
                    'rucio_path_begins_at': 0,
                }

            instances = (config.get('rucio') or {}).get('instances') or []
            instance = next((i for i in instances if i.get('value') == instance_name), None)
            if instance is None:
                raise ValueError(f'Invalid Rucio instance: {instance_name!r}')

            rse_opts = instance.get('rse_options') or []
            rse = next((r for r in rse_opts if r.get('value') == rse_name), None)
            if rse is None:
                valid = ', '.join(r.get('value', '') for r in rse_opts) or '(none)'
                raise ValueError(
                    f'Invalid RSE selection: {rse_name!r} for Rucio instance '
                    f'{instance_name!r}. Valid options are: {valid}'
                )

            return {
                'rucio_instance':       instance_name,
                'rucio_rse':            rse_name,
                'rucio_rse_mount_path': rse.get('mount_path', ''),
                'rucio_path_begins_at': int(rse.get('path_begins_at', 0)),
            }

        # ── Form processing ─────────────────────────────────────────────────

        def options_from_form(self, formdata: dict) -> dict:
            """
            Read the form's JSON payload, validate against the YAML config, and
            return a normalized internal options dict (snake_case keys, proper
            types, server-derived fields filled in).
            """
            try:
                payload = json.loads(formdata['payload'][0])
            except (KeyError, IndexError, TypeError, json.JSONDecodeError) as e:
                raise ValueError(f'Invalid spawn form submission: {e}')

            config = self._load_options_form_config()
            source = payload.get('source')

            if source == 'lcg':
                return self._process_lcg(config, payload)
            elif source == 'customenv':
                return self._process_customenv(config, payload)
            else:
                raise ValueError(f'Invalid source: {source!r}')

        def _process_lcg(self, config: dict, payload: dict) -> dict:
            """Validate and normalize an LCG release selection."""
            release = payload.get('release')
            release_meta = self._build_release_index(config).get(release)
            if release_meta is None:
                raise ValueError(f'Invalid release: {release!r}')

            profile = self._get_profile(config, release_meta['profile'])
            self._validate_profile_fields(profile, payload, [
                ('cores',   'cores'),
                ('memory',  'memory'),
                ('cluster', 'clusters'),
                ('condor',  'condor'),
            ])

            rucio = self._resolve_rucio(
                config,
                payload.get('rucio', 'none'),
                payload.get('rucioRse', 'none'),
            )

            options = {
                # user's declared intent (preserved even if source is flipped below)
                'user_source':        'lcg',
                # effective build mode (may be flipped to 'customenv' for lhcb-* etc.)
                'source':             'lcg',
                'release':            release,
                'platform':           release_meta['platform'],  # server-derived
                'script_env':         payload.get('scriptEnv', ''),
                'cores':              payload['cores'],
                'memory':             payload['memory'],
                'gpu':                payload.get('gpu', 'none'),
                'cluster':            payload.get('cluster', 'none'),
                'condor':             payload.get('condor', 'none'),
                'use_jupyterlab':     bool(payload.get('useJupyterLab')),
                'use_local_packages': bool(payload.get('useLocalPackages')),
                'file':               payload.get('file', ''),
                **rucio,
            }

            # Some LCG releases (e.g. lhcb-default) are actually custom-env builds;
            # flip the effective build mode so downstream logic takes the customenv
            # path. `user_source` above preserves the user's actual card selection.
            # `user_interface` is consumed by SwanHub for these overridden sessions.
            # We also pre-populate builder + builder_version from the release name
            # (e.g. "lhcb-default" → builder="lhcb", builder_version="default") so
            # downstream consumers see a uniform customenv shape.
            if release.split('-')[0] in self.stacks_for_customenvs:
                options['source'] = 'customenv'
                options['user_interface'] = 'lab' if options['use_jupyterlab'] else 'projects'
                builder_name, _, builder_version = release.partition('-')
                options['builder'] = builder_name
                options['builder_version'] = builder_version

            self._finalize(options)
            return options

        def _process_customenv(self, config: dict, payload: dict) -> dict:
            """Validate and normalize a custom-environment builder selection."""
            builder_spec = (payload.get('builder') or '').lower()
            builder_meta = self._build_builder_index(config).get(builder_spec)
            if builder_meta is None:
                raise ValueError(f'Invalid builder: {builder_spec!r}')

            profile = self._get_profile(config, builder_meta['profile'])
            self._validate_profile_fields(profile, payload, [
                ('cores',   'cores'),
                ('memory',  'memory'),
                ('cluster', 'clusters'),
            ])

            # Builder values are "name:version" (e.g. "venv:default")
            if builder_spec.count(':') == 1:
                builder_name, builder_version = builder_spec.split(':')
            else:
                builder_name, builder_version = builder_spec, ''

            repository = payload.get('repository', '')
            if not repository and builder_name not in self.stacks_for_customenvs:
                raise ValueError('Cannot create custom software environment: no repository specified')

            options = {
                'user_source':        'customenv',
                'source':             'customenv',
                'builder':            builder_name,
                'builder_version':    builder_version,
                'repository':         repository,
                'cores':              payload['cores'],
                'memory':             payload['memory'],
                'gpu':                payload.get('gpu', 'none'),
                'cluster':            payload.get('cluster', 'none'),
                'use_jupyterlab':     bool(payload.get('useJupyterLab')),
                'file':               payload.get('file', ''),
                # Customenv has no condor, no local packages, no rucio.
                # Set defaults so downstream get_env() / subclasses can read them safely.
                'condor':               'none',
                'use_local_packages':   False,
                'rucio_instance':       'none',
                'rucio_rse':            'none',
                'rucio_rse_mount_path': '',
                'rucio_path_begins_at': 0,
            }

            self._finalize(options)
            return options

        def _finalize(self, options: dict) -> None:
            """Common post-processing shared by both LCG and customenv paths."""
            self.offload = options.get('cluster', 'none') != 'none'

        # ── Runtime / env plumbing ──────────────────────────────────────────

        def get_env(self):
            """Set base environmental variables for swan jupyter docker image"""
            env = super().get_env()

            username = self.user.name
            if self.local_home:
                homepath = "/home/%s" % (username)
            else:
                homepath = self.eos_path_format.format(username=username)

            if not hasattr(self, 'user_uid'):
                raise Exception('Authenticator needs to set user uid (in pre_spawn_start)')

            opts = self.user_options

            # FIXME remove userrid and username and just use jovyan
            # FIXME clean JPY env variables
            env.update(dict(
                SOFTWARE_SOURCE        = opts['source'],
                CODE_WORKING_DIRECTORY = os.path.join(homepath, get_repo_name_from_options(opts)),
                STACKS_FOR_CUSTOMENVS  = " ".join(self.stacks_for_customenvs),
                USER                   = username,
                NB_USER                = username,
                USER_ID                = self.user_uid,
                NB_UID                 = self.user_uid,
                HOME                   = homepath,
                EOS_PATH_FORMAT        = self.eos_path_format,
                SERVER_HOSTNAME        = os.uname().nodename,
            ))

            # LCG-specific environment
            if opts['source'] == 'lcg':
                env.update(dict(
                    ROOT_LCG_VIEW_NAME     = opts['release'],
                    ROOT_LCG_VIEW_PLATFORM = opts['platform'],
                    USER_ENV_SCRIPT        = opts['script_env'],
                    ROOT_LCG_VIEW_PATH     = self.lcg_view_path,
                ))

                if opts.get('use_local_packages'):
                    env['SWAN_USE_LOCAL_PACKAGES'] = 'true'

                if opts.get('condor', 'none') != 'none':
                    env['CERN_HTCONDOR'] = 'true'

                if opts.get('rucio_instance', 'none') != 'none':
                    env.update(dict(
                        SWAN_USE_RUCIO                = 'true',
                        SWAN_RUCIO_INSTANCE           = opts['rucio_instance'],
                        SWAN_RUCIO_RSE                = opts['rucio_rse'],
                        SWAN_RUCIO_RSE_PATH           = opts['rucio_rse_mount_path'],
                        SWAN_RUCIO_RSE_PATH_BEGINS_AT = str(opts['rucio_path_begins_at']),
                    ))

            if opts.get('use_jupyterlab'):
                env['SWAN_USE_JUPYTERLAB'] = 'true'

            return env

        async def stop(self, now=False):
            """Overwrite default spawner to report stop of the container"""

            if self._spawn_future and not self._spawn_future.done():
                # Return 124 (timeout) exit code as container got stopped by jupyterhub before successful spawn
                container_exit_code = "124"
            else:
                # Return 0 exit code as container got stopped after spawning correctly
                container_exit_code = "0"

            stop_result = await super().stop(now)

            self.log_metric(
                self.user.name,
                self.this_host,
                "exit_container_code",
                container_exit_code
            )

            return stop_result

        async def poll(self):
            """Overwrite default poll to get status of container"""
            container_exit_code = await super().poll()

            # None if single - user process is running.
            # Integer exit code status, if it is not running and not stopped by JupyterHub.
            if container_exit_code is not None:
                exit_return_code = str(container_exit_code)
                if exit_return_code.isdigit():
                    value_cleaned = exit_return_code
                else:
                    result = re.search(r'ExitCode=(\d+)', exit_return_code)
                    if not result:
                        raise Exception("unknown exit code format for this Spawner")
                    value_cleaned = result.group(1)

                self.log_metric(
                    self.user.name,
                    self.this_host,
                    "exit_container_code",
                    value_cleaned
                )

                if int(value_cleaned) == 127:
                    self.log.warning(
                        "Detected user environment script setup failure (exit code 127)")
                    raise RuntimeError(
                        f"User environment script failed: "
                        f"Could not find the script '{self.user_options.get('script_env', '')}'."
                    )

            return container_exit_code

        async def start(self):
            """Start the container"""
            start_time_start_container = time.time()

            # If the user script exists, we allow extended timeout
            if self.user_options.get('script_env', '').strip() != '':
                self.start_timeout = self.extended_timeout

            # start configured container
            startup = await super().start()

            self.log_metric(
                self.user.name,
                self.this_host,
                "start_container_duration_sec",
                time.time() - start_time_start_container
            )

            return startup

        def log_metric(self, user, host, metric, value):
            """Function allowing for logging formatted metrics"""
            self.log.info("user: %s, host: %s, metric: %s, value: %s" % (user, host, metric, value))

        def _render_templated_options_form(self, spawner):
            """
            Render the mount-point template for the options form.

            The form's JS and CSS are emitted by SwanHub's spawn.html via
            JupyterHub's ``static_url()`` helper — that handles cache-busting
            with a content-hash query param. All this template does is inject
            a mount <div> and the server-provided data as JSON script tags;
            the TS app wires itself up after DOMContentLoaded.
            """
            templates_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'templates')
            env = Environment(loader=FileSystemLoader(templates_dir))
            template = env.get_template('options_form_template.html')

            try:
                config = self._load_options_form_config()
                return template.render(
                    config_json       = json.dumps(config),
                    dynamic_form_info = json.dumps(self._dynamic_form_info),
                    domains_json      = json.dumps({
                        'general': self.general_domain_name,
                        'ats':     self.ats_domain_name,
                    }),
                )
            except Exception as ex:
                self.log.error("Could not initialize form: %s", ex, exc_info=True)
                raise RuntimeError(
                    """
                    Could not initialize form, invalid format
                    """)

    return SwanSpawner
