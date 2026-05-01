#!/bin/sh
dir=$(cd "$(dirname "$0")" && pwd)
pkill -f "^$dir/src-tauri/target/release/sudoclip"
    