#!/usr/bin/env just --justfile

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

# write the sample alignments to the file system
write-alignments:
    deno run --allow-read=./ --allow-write=./ test/write-alignments.ts

web-ci: web-install-deps web-check web-build web-test-e2e-dev

web-install-deps:
    cd web && npm install

web-check:
    cd web && npx tsc && deno check build.ts worker.ts lang-worker.ts

web-build: web-build-copy-resources web-bundle-ts web-copy-dev web-move-prod-sourcemaps

web-build-copy-resources:
    mkdir -p dist/web/
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
    cp web/node_modules/@picocss/pico/css/pico.min.css dist/web
    cp web/node_modules/@picocss/pico/css/pico.min.css.map dist/web

web-bundle-ts:
    deno run --check --allow-net --allow-env --allow-read --allow-write --allow-run web/build.ts

web-copy-dev:
    # web-dev is still identical to prod, but with sourcemaps
    cp -R dist/web dist/web-dev

web-move-prod-sourcemaps:
    mkdir -p dist/web-sourcemaps
    mv dist/web/*.map dist/web-sourcemaps

# run development web server for local QA
web-serve:
    cd web && npx wrangler pages dev ../dist/web --live-reload

# for faster iteration when running locally
web-build-and-serve: web-build web-serve

web-deploy-prod: web-publish-prod web-test-post-deploy web-test-e2e-post-deploy

web-publish-prod:
    cd web && npx wrangler pages deploy ../dist/web

web-test-post-deploy:
    deno test --allow-net --allow-read=./web web/post-deploy.test.ts

web-test-e2e-dev $BITEXTUAL_TEST_BASE_URL="http://localhost:8787":
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
