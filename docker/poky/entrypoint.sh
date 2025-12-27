#!/bin/bash
set -e

# Default command - can be overridden
if [ $# -eq 0 ]; then
    exec /bin/bash
else
    exec "$@"
fi

