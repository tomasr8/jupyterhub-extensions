from jupyterhub.spawner import SimpleLocalProcessSpawner

from swanspawner.swanspawner import define_SwanSpawner_from


class LocalSwanSpawner(define_SwanSpawner_from(SimpleLocalProcessSpawner)):
    """A SwanSpawner variant for local process spawning (for testing/development)."""

    def get_env(self):
        # Skip SwanSpawnwer.get_env which is incompatible with SimpleLocalProcessSpawner
        return SimpleLocalProcessSpawner.get_env(self)

    def _render_templated_options_form(self, spawner):
        # Simulate GPU access for local testing
        self._dynamic_form_info = {
            'gpu_flavours': ['A100 partition (10GB)', 'T4 GPU (10GB)'],
            # 'free_gpu_flavours': ['A100 partition (10GB)', 'T4 GPU (10GB)']
            'free_gpu_flavours': []

        }
        return super()._render_templated_options_form(spawner)
