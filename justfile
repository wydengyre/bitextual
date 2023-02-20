#!/usr/bin/env just --justfile

default:
    just --list --justfile {{justfile()}}

update-deps:
    deno run -A https://deno.land/x/udd/main.ts import_map.json

fmt:
    deno fmt src tools test

lint:
    deno lint src test

test:
    deno test --allow-read=./ --allow-run=./resources/punkt src
