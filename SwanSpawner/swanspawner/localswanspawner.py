import os
import json
import yaml
from jinja2 import Environment, FileSystemLoader

from jupyterhub.spawner import SimpleLocalProcessSpawner

from swanspawner.swanspawner import define_SwanSpawner_from


# https://github.com/jupyterhub/jupyterhub/blob/3800ceaf9edf33a0171922b93ea3d94f87aa8d91/jupyterhub/spawner.py#L1647
_LocalSwanSpawner = define_SwanSpawner_from(SimpleLocalProcessSpawner)

class LocalSwanSpawner(_LocalSwanSpawner):
    """A SwanSpawner variant for local process spawning (for testing/development)."""

    options_form_config = "options_form.yaml"

    def _render_templated_options_form(self, spawner):
        """
        Render a form from a template based on options_form_config yaml config file
        """
        templates_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'templates')
        env = Environment(loader=FileSystemLoader(templates_dir))
        template = env.get_template('options_form_template.html')

        try:
            with open(self.options_form_config) as yaml_file:
                options_form_config = yaml.safe_load(yaml_file)
            return template.render(options_form_config=options_form_config,
                                   dynamic_form_info=json.dumps(self._dynamic_form_info),
                                   general_domain_name=self.general_domain_name,
                                   ats_domain_name=self.ats_domain_name,
                                   # https://github.com/jupyterhub/jupyterhub/pull/2237
                                   static_url=self.handler.static_url)
        except Exception as ex:
            self.log.error("Could not initialize form: %s", ex, exc_info=True)
            raise RuntimeError(
                """
                Could not initialize form, invalid format
                """)

    def get_env(self):
        # Skip the SwanSpawnwer.get_env which incompatible with SimpleLocalProcessSpawner
        return SimpleLocalProcessSpawner.get_env(self)
