#!/usr/bin/env bash
# Instala los hooks de seguridad de G3 en .git/hooks
set -e

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT/.git/hooks"

# Symlink al pre-commit del repo (así se actualiza con git pull)
ln -sf "../../security/hooks/pre-commit" pre-commit
chmod +x ../../security/hooks/pre-commit

echo "✓ Hook pre-commit instalado en $(pwd)/pre-commit"
echo ""
echo "Dependencias recomendadas (macOS):"
echo "  brew install gitleaks semgrep"
echo ""
echo "Dependencias recomendadas (Linux):"
echo "  brew install gitleaks semgrep    # con Linuxbrew"
echo "  o bien:                          pipx install semgrep"
echo "                                   curl -s https://...gitleaks/install.sh | bash"
