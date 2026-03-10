"""
Integration test: JupyterHub startup time with a large number of pre-existing users.

Starts a real JupyterHub process against a SQLite database pre-populated
with NUM_USERS users, each with an active Spawner + Server record, and
asserts the hub becomes responsive within a time threshold.

Requirements:
    - configurable-http-proxy on PATH  (npm install -g configurable-http-proxy)
    - jupyterhub and swanspawner installed in the current Python environment
"""

import os
import re
import subprocess
import sys
import textwrap
import time
import urllib.error
import urllib.request

import pytest
from jupyterhub import orm

NUM_USERS = 500
STARTUP_TIMEOUT_SECONDS = 30


def get_configurable_http_proxy_version():
    result = subprocess.run(
        ["configurable-http-proxy", "--version"],
        capture_output=True,
        text=True,
        check=True,
    )
    return result.stdout.strip()


def prepopulate_db(db_path: str, num_users: int) -> None:
    """Prepopulate the database with users having active Spawner + Server records."""
    db = orm.new_session_factory(f"sqlite:///{db_path}")()

    with db:
        for i in range(num_users):
            create_user(db, i)
        db.commit()


def create_user(db, user_id):
    server = orm.Server(
        ip="localhost",
        port=20000 + user_id,
        base_url=f"/user/user_{user_id}/",
    )
    db.add(server)
    db.flush()

    user = orm.User(name=f"user_{user_id}")
    db.add(user)
    db.flush()

    spawner = orm.Spawner(
        user_id=user.id,
        name="",
        server_id=server.id,
        state={"pod_name": f"jupyter-user_{user_id}"},
    )
    db.add(spawner)
    db.flush()


def write_hub_config(cfg_path, db_path, hub_port):
    cfg = textwrap.dedent(f"""\
        from jupyterhub.spawner import SimpleLocalProcessSpawner
        from swanspawner.swanspawner import define_SwanSpawner_from

        class TestSpawner(define_SwanSpawner_from(SimpleLocalProcessSpawner)):
            async def stop(self, now=False):
                pass

            async def poll(self):
                return 0

        c.JupyterHub.spawner_class = TestSpawner

        c.JupyterHub.authenticator_class = "dummy"

        c.JupyterHub.db_url = "sqlite:///{db_path}"
        c.JupyterHub.hub_ip  = "localhost"
        c.JupyterHub.hub_port = {hub_port}

        c.JupyterHub.log_level = "DEBUG"
    """)
    cfg_path.write_text(cfg, encoding="utf-8")


def wait_for_hub(url, timeout):
    """Poll until the hub responds to HTTP requests"""
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=2) as response:
                response.read()
            return
        except urllib.error.URLError:
            pass  # Hub not ready yet, keep polling
        time.sleep(0.25)
    raise TimeoutError(f"Hub at {url} did not respond within {timeout}s")


@pytest.fixture(scope="module")
def hub_workspace(tmp_path_factory):
    """
    Prepare a temp directory with:
      - jupyterhub_config.py
      - SQLite DB pre-populated with users
    """
    ws = tmp_path_factory.mktemp("hub_workspace")
    db_path = ws / "jupyterhub.sqlite"
    cfg_path = ws / "jupyterhub_config.py"
    hub_port = 9234

    prepopulate_db(db_path, NUM_USERS)
    write_hub_config(cfg_path, db_path, hub_port)

    return {
        "ws": ws,
        "cfg_path": cfg_path,
        "db_path": db_path,
        "hub_port": hub_port,
    }


def test_configurable_http_proxy_available():
    """configurable-http-proxy must be on PATH for the hub to start"""
    version = get_configurable_http_proxy_version()
    assert version is not None


def test_db_has_prepopulated_correctly(hub_workspace):
    """
    Sanity-check: the pre-populated DB must contain NUM_USERS users and
    NUM_USERS active spawners (server != None).
    """
    db = orm.new_session_factory(f"sqlite:///{hub_workspace['db_path']}")()
    with db:
        user_count = db.query(orm.User).count()
        spawner_count = db.query(orm.Spawner).filter(orm.Spawner.server != None).count()

    assert user_count == NUM_USERS
    assert spawner_count == NUM_USERS


def test_hub_starts_and_serves_traffic(tmp_path, hub_workspace):
    """
    Start SwanHub and make sure it becomes responsive within STARTUP_TIMEOUT_SECONDS
    """
    hub_api_url = f"http://localhost:{hub_workspace['hub_port']}/hub/api"
    timed_out = False
    stderr_file = (tmp_path / "hub_stderr.log").open("w+b")

    proc = subprocess.Popen(
        [sys.executable, "-m", "swanhub", "--config", str(hub_workspace["cfg_path"])],
        env=os.environ.copy(),
        cwd=str(hub_workspace["ws"]),
        stdout=subprocess.DEVNULL,
        stderr=stderr_file,
    )
    try:
        wait_for_hub(hub_api_url, timeout=STARTUP_TIMEOUT_SECONDS)
    except TimeoutError:
        timed_out = True
    finally:
        proc.terminate()
        proc.wait()
        stderr_file.seek(0)
        hub_output = stderr_file.read().decode()
        stderr_file.close()

    if timed_out:
        pytest.fail(f"SwanHub did not start within {STARTUP_TIMEOUT_SECONDS}s ")

    match = re.search(
        rf"Initialized {NUM_USERS} spawners in ([\d.]+) seconds", hub_output
    )
    assert match is not None
    seconds = float(match.group(1))
    assert seconds < STARTUP_TIMEOUT_SECONDS

    match = re.search(r"It took ([\d.]+) seconds for the Hub to start", hub_output)
    assert match is not None
    seconds = float(match.group(1))
    assert seconds < STARTUP_TIMEOUT_SECONDS
