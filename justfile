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

web-ci: web-install-deps web-check web-build

web-install-deps:
    cd web && npm install

web-check:
    cd web && npx tsc && deno check worker.ts

web-build:
    mkdir -p dist/web
    cp -R resources/punkt dist/web/punkt
    cp -R resources/hunalign/dictionaries dist/web/dictionaries
    cp resources/hunalign/web/hunalign.wasm dist/web
    deno run --allow-env --allow-read --allow-write --allow-run web/build.ts

# run development web server for local QA
web-serve:
    deno run --allow-net --allow-read=. web/serve.ts

# for faster iteration when running locally
web-build-and-serve: web-build web-serve
