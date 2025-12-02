c.JupyterHub.authenticator_class = "keycloakauthenticator.auth.KeyCloakAuthenticator"
c.KeyCloakAuthenticator.username_claim = 'preferred_username'

# URL to redirect to after logout is complete with auth provider.
c.KeyCloakAuthenticator.logout_redirect_url = 'https://cern.ch/swan'
c.KeyCloakAuthenticator.oauth_callback_url = 'http://localhost:8000/hub/oauth_callback'

# Specify the issuer url, to get all the endpoints automatically from .well-known/openid-configuration
c.KeyCloakAuthenticator.oidc_issuer = 'https://auth.cern.ch/auth/realms/cern'

# If you need to set a different scope, like adding the offline option for longer lived refresh token
c.KeyCloakAuthenticator.scope = ['profile', 'email', 'offline_access', 'openid']
# Only allow users with this specific roles (none, to allow all)
c.KeyCloakAuthenticator.allowed_roles = []
# Specify the role to set a user as admin
c.KeyCloakAuthenticator.admin_role = 'swan-admins'

# c.JupyterHub.authenticator_class = "dummy"
# c.Authenticator.allow_all = True

# Set the spawner class to SwanSpawner
c.JupyterHub.spawner_class = "swanspawner.localswanspawner.LocalSwanSpawner"
# c.JupyterHub.spawner_class = "swanspawner.localdockerspawner.LocalDockerSwanSpawner"
# c.JupyterHub.spawner_class = "simple"

c.ConfigurableHTTPProxy.should_start = False
c.ConfigurableHTTPProxy.auth_token = 'aaaa'