#!/bin/bash
# Runs the attendance-web karma tests once, headless, inside a throwaway angular.test container.
# Extra arguments are passed through to `ng test`, e.g. `./test-web.sh --include='**/student*.spec.ts'`

set -e

SCRIPT_DIR=$(dirname $(readlink -f $0))
cd ${SCRIPT_DIR}

# CI=1 disables angular's persistent build cache, which would otherwise collide with the cache
# held open by the dev server's ng serve.
docker compose run --rm --build --no-deps -e CI=1 angular.test \
    npx ng test --no-watch --no-progress --browsers=ChromeHeadlessNoSandbox "$@"
