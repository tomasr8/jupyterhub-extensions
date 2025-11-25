import subprocess
import sys
from pathlib import Path

import click
from watchfiles import watch, DefaultFilter


REPO_ROOT = Path(__file__).parent.resolve()
JUPYTER_STATIC_DIR = Path(sys.prefix) / "share/jupyterhub/static"

packages = {
    "KeyCloakAuthenticator/keycloackauthenticator": "keycloackauthenticator",
    "SwanCuller/swanculler": "swanculler",
    "SwanHub/swanhub": "swan",
    "SwanNotificationsService/swannotificationsservice": "swannotificationsservice",
    "SwanSpawner/swanspawner": "swanspawner",
}

def create_symlinks():
    for pkg, share_dir in packages.items():
        path = JUPYTER_STATIC_DIR / share_dir

        # Remove existing directories/symlinks if present
        try:
            path.unlink(missing_ok=True)
        except IsADirectoryError:
            import shutil
            shutil.rmtree(path)

        # Create symlink from your source files to the install location
        target = REPO_ROOT / pkg / "static"
        if target.exists():
            path.symlink_to(target, target_is_directory=True)


existing_paths = [REPO_ROOT / pkg / "static" for pkg in packages.keys()]
existing_paths = [p for p in existing_paths if p.exists()]

ignore_filter = DefaultFilter(ignore_paths=[REPO_ROOT / "SwanHub/swanhub/static/css/style.css"])

create_symlinks()

click.secho("Watching for changes...", fg="green")
for _ in watch(*existing_paths, watch_filter=ignore_filter):
    click.secho("Changes detected, rebuilding packages...", fg="yellow")
    for pkg in packages.keys():
        package_json = (REPO_ROOT / pkg / "../package.json").resolve()
        if package_json.exists():
            subprocess.run(
                ["npm", "run", "build"], cwd=REPO_ROOT / pkg, check=True
            )
    click.secho("Watching for changes...", fg="green")
