# Proceso de release

## Versioning

Seguimos [Semantic Versioning](https://semver.org/):
- `MAJOR`: cambios incompatibles (improbable para una app de escritorio).
- `MINOR`: nueva funcionalidad backward-compatible.
- `PATCH`: bugfixes.

---

## Checklist pre-release

```
[ ] cargo test pasa en Windows, macOS y Linux
[ ] pnpm lint y pnpm test pasan
[ ] CHANGELOG.md actualizado con los cambios de esta versión
[ ] Versión actualizada en:
    [ ] src-tauri/Cargo.toml  (version = "x.y.z")
    [ ] src-tauri/tauri.conf.json  ("version": "x.y.z")
    [ ] ui/package.json  ("version": "x.y.z")
[ ] Tag creado: git tag -a vX.Y.Z -m "Release vX.Y.Z"
[ ] Tag pusheado: git push origin vX.Y.Z
```

---

## Pipeline CI (GitHub Actions)

El workflow `.github/workflows/build.yml` se activa con tags `v*`:

```
push tag v1.2.3
    │
    ▼
matrix job × 3 SO × 2 arquitecturas
    │
    ├── windows-latest / x64   → portview_1.2.3_x64-setup.exe
    │                             portview_1.2.3_x64_en-US.msi
    ├── windows-latest / arm64 → portview_1.2.3_arm64-setup.exe
    ├── macos-latest / x64     → portview_1.2.3_x64.dmg
    ├── macos-latest / arm64   → portview_1.2.3_aarch64.dmg
    ├── ubuntu-latest / x64    → portview_1.2.3_amd64.AppImage
    │                             portview_1.2.3_amd64.deb
    └── ubuntu-latest / arm64  → portview_1.2.3_arm64.AppImage
                                  portview_1.2.3_arm64.deb
    │
    ▼
Draft GitHub Release con todos los artefactos adjuntos
```

---

## Firmado de código

### Windows
- Requiere un certificado Code Signing (EV o normal).
- Configurar en `tauri.conf.json` → `bundle.windows.certificateThumbprint`.
- Sin firmar: SmartScreen muestra advertencia en la primera ejecución.

### macOS
- Requiere Apple Developer ID Application certificate.
- Notarización con `notarytool` (incluida en Tauri bundler si se configuran las variables de entorno).
- Variables necesarias en CI:
  - `APPLE_CERTIFICATE` (base64)
  - `APPLE_CERTIFICATE_PASSWORD`
  - `APPLE_ID`, `APPLE_TEAM_ID`, `APPLE_PASSWORD`

### Linux
- No hay proceso de firma estándar. `.AppImage` puede verificarse con `appimagetool --verify`.

---

## Variables de entorno para CI

Configurar en **GitHub → Settings → Secrets**:

| Secret | Descripción |
|---|---|
| `TAURI_PRIVATE_KEY` | Clave para auto-actualizaciones Tauri |
| `TAURI_KEY_PASSWORD` | Contraseña de la clave |
| `APPLE_CERTIFICATE` | Cert macOS en base64 |
| `APPLE_CERTIFICATE_PASSWORD` | Password del cert |
| `APPLE_ID` | Apple ID para notarización |
| `APPLE_TEAM_ID` | Team ID de Apple Developer |
| `APPLE_PASSWORD` | App-specific password |
| `WINDOWS_CERT` | Cert Windows en base64 (si aplica) |

---

## Auto-actualización (Tauri Updater)

Tauri v2 incluye un sistema de auto-actualización:
1. Configurar `bundle.createUpdaterArtifacts: true` en `tauri.conf.json`.
2. El CI publica un `latest.json` en GitHub Releases.
3. La app comprueba al arrancar si hay versión nueva.
4. Si hay actualización, muestra un diálogo y descarga en background.
