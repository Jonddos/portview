# Changelog

Todos los cambios notables de PortView se documentan aquí.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es/1.0.0/) y este proyecto usa [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
