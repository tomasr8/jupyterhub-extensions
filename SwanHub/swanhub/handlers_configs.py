
from jupyterhub.app import JupyterHub
from traitlets import Bool, Unicode, default
from traitlets.config.configurable import Config, SingletonConfigurable


class SpawnHandlersConfigs(SingletonConfigurable):
    """SwanHub's own configuration."""

    # Name of the URL query arg / form field used to request TN access.
    # Not a user_options key -- it's checked against the raw request body
    # in _validate_mandatory_options to prevent TN access requests on a
    # non-TN deployment (and vice-versa).
    use_tn_field = 'use-tn'

    tn_enabled = Bool(
        default_value=False,
        config=True,
        help="True if this SWAN deployment is exposed to the Technical Network."
    )

    local_home = Bool(
        default_value=False,
        config=True,
        help="If True, a physical directory on the host will be the home and not eos."
    )

    maintenance_file = Unicode(
        default_value='/etc/nologin',
        config=True,
        help='Path of the file that, when present, enables maintenance mode'
    )

    spawn_error_message = Unicode(
        default_value='Error spawning your session',
        config=True,
        help='Message to display when Spawn fails'
    )

    @default('config')
    def _config_default(self):
        # load application config by default
        if JupyterHub.initialized():
            return JupyterHub.instance().config
        else:
            return Config()
