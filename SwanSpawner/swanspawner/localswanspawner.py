import os
import json
import yaml
from jinja2 import Environment, FileSystemLoader

from jupyterhub.spawner import LocalProcessSpawner

from swanspawner.swanspawner import define_SwanSpawner_from


_LocalSwanSpawner = define_SwanSpawner_from(LocalProcessSpawner)


class LocalSwanSpawner(_LocalSwanSpawner):
    """A SwanSpawner variant for local process spawning (for testing/development)."""
    
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
            conf = options_form_config["optionsform"]
            return template.render(options_form_config=conf,
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

    def options_from_form(self, formdata: dict) -> dict:
        return {}
