#!/usr/bin/env just --justfile

RELEASE_NAME := `git rev-parse --abbrev-ref HEAD` + "-" + `git rev-parse --short HEAD`

default:
    just --list --justfile {{justfile()}}

ci: ci-fmt lint test web-ci

clean:
    rm -rf build dist web/node_modules

update-deps:
    deno run -A https://deno.land/x/udd/main.ts import_map.json

ci-fmt:
    deno fmt --check deno lib tools test web

fmt:
    deno fmt deno lib tools test web

lint:
    deno lint deno lib tools test

test:
    deno test --allow-read=./ --allow-run=./resources/punkt deno lib

generate-supported-languages:
    mkdir -p build
    deno run --check --allow-read=./resources/hunalign/dictionaries --allow-write=./build/supported-languages.ts tools/generate-supported-languages.ts

# write the sample alignments to the file system
write-alignments:
    deno run --allow-read=./ --allow-write=./ test/write-alignments.ts

# generate sample epub3 files for testing
sample-epub3-pack:
    cd submodules/epub3-samples && ./pack-all.sh

web-ci: web-install-deps generate-supported-languages web-check web-lint web-build web-test-e2e-dev

web-install-deps:
    cd web && npm install

web-check: web-check-deno web-check-node web-check-functions

web-check-node:
    cd web && npx tsc

web-check-deno:
    cd web && deno check build.ts worker.ts lang-worker.ts

web-check-functions:
    cd web/functions && npx tsc

web-lint:
    deno lint web

web-build: web-build-copy-resources web-bundle-ts web-sentry-inject-debug-id web-move-sourcemaps web-move-esbuild-meta

web-build-copy-resources:
    mkdir -p dist/web/functions
    cp -Rf resources/punkt dist/web/punkt
    cp -Rf resources/hunalign/dictionaries dist/web/dictionaries
    cp resources/hunalign/web/hunalign.wasm dist/web
    cp web/*.png dist/web
    cp web/favicon.ico dist/web
    cp test/*.aligned.html dist/web
    cp web/index.html dist/web
    cp web/robots.txt dist/web
    cp web/404.html dist/web
    cp -Rf web/contact dist/web/contact
    cp -Rf web/tutorial dist/web/tutorial
    cp web/functions/*.ts dist/web/functions
    cp -Rf web/functions/telemetry dist/web/functions/telemetry

web-bundle-ts:
    deno run --allow-net --allow-env --allow-read --allow-write --allow-run --allow-sys web/build.ts {{RELEASE_NAME}}

web-move-sourcemaps:
    mkdir -p dist/web-sourcemaps
    mv dist/web/*.map dist/web-sourcemaps

web-move-esbuild-meta:
    mkdir -p dist/web-esbuild-meta
    mv dist/web/*.meta.json dist/web-esbuild-meta

# run development web server for local QA
web-serve:
    cd web && npx wrangler pages dev ../dist/web --live-reload

# for faster iteration when running locally
web-build-and-serve: web-build web-serve

web-deploy: web-sentry-upload-sourcemaps web-publish web-test-post-deploy web-test-e2e-post-deploy

web-sentry-inject-debug-id:
    cd web && npx sentry-cli sourcemaps inject ../dist

web-sentry-upload-sourcemaps:
    cd web && npx sentry-cli sourcemaps upload --validate --release={{RELEASE_NAME}} ../dist/web-sourcemaps

web-publish:
    cd web && npx wrangler pages deploy ../dist/web

web-test-post-deploy:
    deno test --allow-net --allow-read=./web web/post-deploy.test.ts

web-test-e2e-dev $BITEXTUAL_TEST_BASE_URL="http://127.0.0.1:8787":
    #!/usr/bin/env bash
    set -euxo pipefail
    cd web
    node node_modules/wrangler/wrangler-dist/cli.js pages dev ../dist/web --port 8787 &
    server_pid=$!
    trap "exit" INT TERM ERR
    trap "kill $server_pid" EXIT
    # god forgive me
    sleep 1
    cd e2e-test && node --test --no-warnings=ExperimentalWarning --loader ts-node/esm e2e-test.mts

web-test-e2e-post-deploy $BITEXTUAL_TEST_BASE_URL="https://bitextual.net":
    cd web/e2e-test && node --test --no-warnings=ExperimentalWarning --loader ts-node/esm e2e-test.mts
