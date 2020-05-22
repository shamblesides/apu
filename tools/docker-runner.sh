#!/bin/sh
docker build -t apu-builder tools && docker run --init -v $PWD:/srv -u $(id -u) -p 8080:8080 apu-builder "$@"