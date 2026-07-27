#!/usr/bin/env bash
#
# Converts a GitHub App private key to the format the Worker can use, and optionally stores it.
#
# GitHub hands out PKCS#1 (`BEGIN RSA PRIVATE KEY`). WebCrypto, which is all a Worker has, only reads
# PKCS#8 (`BEGIN PRIVATE KEY`), so the App fails per delivery with "Private Key is in PKCS#1 format".
#
# Usage:
#   ./private-key.sh <key.pem>            convert, write <key>.pkcs8.pem
#   ./private-key.sh <key.pem> --set      also store it as the FROG_PRIVATE_KEY repository secret
set -euo pipefail

key=${1:-}
if [[ -z $key || ! -f $key ]]; then
  echo "usage: $0 <path-to-github-app-key.pem> [--set]" >&2
  exit 1
fi

out=${key%.pem}.pkcs8.pem

case $(head -1 "$key") in
  *"BEGIN RSA PRIVATE KEY"*)
    openssl pkcs8 -topk8 -inform PEM -outform PEM -nocrypt -in "$key" -out "$out"
    echo "converted PKCS#1 -> PKCS#8: $out"
    ;;
  *"BEGIN PRIVATE KEY"*)
    cp "$key" "$out"
    echo "already PKCS#8, copied: $out"
    ;;
  *)
    echo "not a PEM private key: $key" >&2
    exit 1
    ;;
esac

# Prove the result is a key the Worker can load, without printing any of it.
openssl pkey -in "$out" -noout -check >/dev/null
chmod 600 "$out"
echo "verified, and readable only by you"

if [[ ${2:-} == "--set" ]]; then
  gh secret set FROG_PRIVATE_KEY --repo wevm/frog < "$out"
  echo "stored as the FROG_PRIVATE_KEY secret on wevm/frog"
fi
