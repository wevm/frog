#!/bin/sh
set -eu

installer_url='https://github.com/wevm/frog/releases/latest/download/install.sh'
install_dir="${FROG_INSTALL_DIR:-${INSTALL_DIR:-}}"

fail() {
  printf '%s\n' "error: $*" >&2
  exit 1
}

command -v curl >/dev/null 2>&1 || fail 'required command not found: curl'
if [ -z "$install_dir" ]; then
  [ -n "${HOME:-}" ] || fail 'HOME is unset; set INSTALL_DIR explicitly'
  install_dir="$HOME/.local/bin"
fi

curl --proto '=https' --tlsv1.2 --fail --silent --show-error --location "$installer_url" |
  FROG_INSTALL_DIR="$install_dir" sh

if ! : </dev/tty 2>/dev/null; then
  fail "Frog was installed to $install_dir, but frog init requires a terminal"
fi
exec "$install_dir/frog" init </dev/tty
