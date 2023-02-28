#!/usr/bin/env just --justfile

picoCssUrl := "https://github.com/picocss/pico/archive/refs/tags/v1.5.7.zip"
picoCssZipPath := "build/picocss.zip"
picoCssFilesPath := "resources/picocss"

default:
    just --list --justfile {{justfile()}}

ci: ci-fmt lint test

deps:
    mkdir -p {{picoCssFilesPath}} build
    curl --show-error --location --fail {{picoCssUrl}} --output {{picoCssZipPath}}
    unzip -q -o -d {{picoCssFilesPath}} {{picoCssZipPath}}

update-deps:
    deno run -A https://deno.land/x/udd/main.ts import_map.json

ci-fmt:
    deno fmt --check deno lib tools test

fmt:
    deno fmt deno lib tools test

lint:
    deno lint deno lib tools test

test:
    deno test --allow-read=./ --allow-run=./resources/punkt deno lib
