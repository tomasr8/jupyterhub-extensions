# Auth configuration
# ================================================
c.JupyterHub.authenticator_class = 'keycloakauthenticator.auth.KeyCloakAuthenticator'
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

# Spawner configuration
# ================================================

# Use a custom local process spawner:
# TODO: Figure out how to use our user image with a docker spawner
c.JupyterHub.spawner_class = 'swanspawner.localswanspawner.LocalSwanSpawner'

# Proxy configuration (Optional)
# ================================================

# Do not start a proxy automatically
# Start your own proxy with: `configurable-http-proxy --insecure`
# This makes it easy to inspect the proxy state (no auth required, you can directly query e.g. /api/routes)
c.ConfigurableHTTPProxy.should_start = False
c.ConfigurableHTTPProxy.auth_token = 'abcd'
