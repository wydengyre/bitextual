#!/usr/bin/env just --justfile

default:
    just --list --justfile {{justfile()}}

ci: ci-fmt lint test

clean:
    rm -rf build dist

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
