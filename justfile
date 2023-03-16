#!/usr/bin/env just --justfile

picoCssUrl := "https://github.com/picocss/pico/archive/refs/tags/v1.5.7.zip"
picoCssZipPath := "build/picocss.zip"
picoCssFilesPath := "resources/picocss"

default:
    just --list --justfile {{justfile()}}

ci: ci-fmt lint test

clean:
    rm -rf build dist

deps:
    mkdir -p {{picoCssFilesPath}} build
    curl --show-error --location --fail {{picoCssUrl}} --output {{picoCssZipPath}}
    unzip -q -o -d {{picoCssFilesPath}} {{picoCssZipPath}}

update-deps:
    deno run -A https://deno.land/x/udd/main.ts import_map.json

ci-fmt:
    deno fmt --check deno lib tools test

fmt:
    deno fmt deno lib tools test web

lint:
    deno lint deno lib tools test

test:
    deno test --allow-read=./ --allow-run=./resources/punkt deno lib

web-install-deps:
    cd web && npm install

web-check:
    cd web && npx tsc

web-build:
    mkdir -p dist/web
    cp -R resources/punkt dist/web/punkt
    deno run --allow-env --allow-read --allow-write --allow-run web/build.ts

# run development web server for local QA
web-serve:
    deno run --allow-net --allow-read=. web/serve.ts

# for faster iteration when running locally
web-build-and-serve: web-build web-serve
