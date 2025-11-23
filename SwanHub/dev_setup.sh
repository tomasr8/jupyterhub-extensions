#!/bin/bash

# Store the path
STATIC_DIR=$(python -c "import sys; print(sys.prefix + '/share/jupyterhub/static')")

# Remove existing directory/symlink if present
rm -r "$STATIC_DIR/swanhub"

# Create symlink from your source files to the install location
ln -s "$(pwd)/swanhub/static" "$STATIC_DIR/swanhub"