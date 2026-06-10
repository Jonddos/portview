# Changelog

Todos los cambios notables de PortView se documentan aquí.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es/1.0.0/) y este proyecto usa [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.3.4] - 2026-06-10

### Añadido
- **CI multiplataforma**: GitHub Actions compila y publica instaladores automáticamente al crear un tag `v*`
  - Windows x64 → `.msi` + `.exe`
  - macOS Apple Silicon (M1/M2/M3) → `.dmg`
  - macOS Intel → `.dmg`
  - Linux x64 → `.AppImage` + `.deb`
- **Soporte Linux nativo**: escaneo de puertos en Linux mediante `ss -tulnp` (con fallback a `netstat`), sin depender de `netstat2`
- **Badge de fuente correcto**: las entradas muestran `macOS` o `Linux` según el sistema operativo real

### Corregido
- **Build Linux**: `netstat2` v0.9.1 tiene un bug de compilación con `libc` moderno en Ubuntu 22.04 (`__be16` ambiguo). Movido a dependencia exclusiva de Windows/macOS; Linux usa `ss` nativo
- **Permisos de CI**: configurados permisos `contents: write` para que el token de GitHub pueda crear releases
- **`beforeBuildCommand` en CI**: el frontend ahora se compila en un paso dedicado antes de `tauri-action`, evitando errores de path en distintos runners
- **Workflow duplicado**: eliminado `build.yml` redundante que causaba dos runs por tag

### Técnico
- `scanner.rs`: compilación condicional — `netstat2` en Windows/macOS, `scan_native_ss_ports()` en Linux
- `wsl.rs`: nueva función `scan_native_ss_ports()` para Linux nativo (reutiliza parser de `ss`)
- `Cargo.toml`: `netstat2` movido a `[target.'cfg(not(target_os = "linux"))'.dependencies]`
- `.github/workflows/release.yml`: build multiplataforma con matrix strategy
- `.github/tauri-ci.conf.json`: override de `beforeBuildCommand` para CI

---

## [0.2.0] - 2026-06-10

### Añadido
- **Soporte WSL2**: los puertos corriendo dentro de subsistemas Linux (Ubuntu, Debian, etc.) ahora son visibles en la tabla con un badge violeta **WSL**
- **Kill de procesos WSL**: al matar un proceso WSL se elimina el grupo de procesos completo (master + workers), evitando que servidores como gunicorn o uvicorn respawneen
- **Parseo multi-worker**: detecta correctamente el proceso master en stacks como `functions-framework`, `gunicorn` y `uvicorn` que muestran múltiples PIDs en `ss -tulnp`
- **Fallback de detección**: si `ss` no está disponible en la distro WSL, hace fallback automático a `netstat`

### Técnico
- Nuevo módulo `core/wsl.rs`: `is_wsl_available()`, `scan_wsl_ports()`, `kill_wsl_process()`
- Campo `source: String` en `PortEntry` (`"Windows"` | `"WSL: Ubuntu"` | …)
- Comandos Tauri nuevos: `kill_wsl_process`, `wsl_available`
- Frontend: `usePorts.killProcess` enruta según `source`

---

## [0.1.0] - 2026-06-09

### Añadido
- **Core Rust**: escaneo de puertos TCP/UDP con `netstat2` + enriquecimiento con `sysinfo`
- **Tabla de puertos**: columnas Puerto, Protocolo, Estado, Dirección local/remota, Proceso, PID, Usuario
- **Avatar de proceso**: letra inicial con color determinista por nombre
- **Badges de estado**: Listen (verde), Established (azul), TimeWait (amarillo), Closing (rojo), etc.
- **Barra de estadísticas**: contadores en tiempo real de Total / Escuchando / Establecido / TCP / UDP
- **Filtros**: búsqueda libre, filtro por protocolo, filtro por estado, opción "Solo escuchando"
- **Ordenamiento**: click en cualquier columna, dirección ascendente/descendente
- **Auto-refresco**: Manual / 2s / 5s / 10s configurables desde la barra superior
- **Panel de detalle**: click en fila → panel lateral con CPU %, memoria, uptime, fecha de inicio, ruta del ejecutable y botón copiar
- **Kill de proceso**: botón "Kill" por fila + diálogo de confirmación con nombre y PID
- **Elevación de privilegios**: banner cuando se ejecuta sin admin, botón "Elevar a Administrador" con UAC (Windows) / osascript (macOS) / pkexec (Linux)
- **Instaladores**: `.msi` y `.exe` NSIS para Windows x64

### Plataformas soportadas
- Windows 10/11 (x64) — testado
- macOS 10.15+ — soporte vía CI (sin firmar en v0.1.0)
- Linux (AppImage, .deb) — soporte vía CI

---

## [Unreleased]

### Planificado
- Vista agrupada por proceso
- Histórico de puertos (últimos N minutos)
- Exportar snapshot a CSV/JSON
- Icono de app personalizado
- Auto-actualización (Tauri Updater)
