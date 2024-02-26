#!/usr/bin/env just --justfile

# might come in handy
# RELEASE_NAME := `git rev-parse --abbrev-ref HEAD` + "-" + `git rev-parse --short HEAD`

default:
	just --list --justfile {{justfile()}}

clean:
	npm run clean --workspaces --if-present

ci: ci-lint typecheck build test

ci-lint:
	npm run ci-lint

lint:
	npm run lint

typecheck: pre-build
	npm run typecheck --workspaces --if-present

pre-build:
	npm run pre-build-supported-languages --workspace '@bitextual/web'

build: pre-build
	npm run build --workspace '@bitextual/web'

test: build
	npm run test --workspaces --if-present
