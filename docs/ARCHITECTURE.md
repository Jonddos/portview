# Arquitectura de PortView

## Visión general

```
┌─────────────────────────────────────────────────────┐
│                  UI (React + Vite)                   │
│  PortTable · FilterBar · KillDialog · AutoRefresh    │
└──────────────────┬──────────────────────────────────┘
                   │  Tauri IPC (invoke / listen)
┌──────────────────▼──────────────────────────────────┐
│              Tauri Commands Layer (Rust)              │
│   list_ports()   kill_port(pid)   get_privileges()   │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│                  Core Library (Rust)                  │
│                                                       │
│  scanner.rs  ──►  netstat2 crate                     │
│                   sysinfo crate                       │
│  process.rs  ──►  sysinfo::Process::kill()           │
└──────────────────────────────────────────────────────┘
                   │
        ┌──────────┼──────────┐
        ▼          ▼          ▼
     Windows     macOS      Linux
  GetExtendedTcp  lsof    /proc/net/tcp
  Table (WinAPI)  -nP      netlink sockets
```

---

## Estructura de datos principal

```rust
/// Un entry por socket encontrado en el sistema
#[derive(Debug, Clone, Serialize)]
pub struct PortEntry {
    pub port: u16,              // puerto local
    pub protocol: Protocol,     // TCP | UDP
    pub state: ConnectionState, // Listen | Established | TimeWait | ...
    pub pid: Option<u32>,       // PID del proceso dueño
    pub process_name: String,   // nombre del ejecutable
    pub exe_path: Option<String>,
    pub user: Option<String>,
    pub local_addr: String,     // "0.0.0.0:8080"
    pub remote_addr: String,    // "192.168.1.1:443" o ""
}
```

---

## Fases del roadmap

### Fase 1 — Core CLI (MVP sin UI)
**Objetivo**: Tener `scanner.rs` y `process.rs` funcionales y testeados en los 3 SO.

- Integrar `netstat2` para obtener sockets TCP/UDP con PID.
- Integrar `sysinfo` para enriquecer cada socket con nombre, ruta y usuario.
- Función `kill_process(pid: u32) -> Result<()>`.
- Tests unitarios de parseo + test de integración (requiere ejecutarse con privilegios).

**Criterio de éxito**: `cargo test` pasa en Windows/macOS/Linux.

---

### Fase 2 — UI básica Tauri
**Objetivo**: Ventana con tabla de todos los puertos, botón Refrescar.

- Scaffolding Tauri v2 + React + Vite + Tailwind.
- Componente `PortTable`: columnas Puerto, Protocolo, Estado, PID, Proceso.
- Comando Tauri `list_ports()` invocado desde el frontend.
- Loading state y mensaje de error si falla el escaneo.

---

### Fase 3 — Kill + confirmación
**Objetivo**: Poder terminar un proceso desde la UI con confirmación.

- Botón "Matar" por fila en la tabla.
- `KillDialog`: muestra nombre del proceso, puerto afectado, pide confirmación.
- Comando Tauri `kill_port(pid)` con manejo de error de permisos.
- Toast de éxito/error tras la acción.

---

### Fase 4 — Filtros y auto-refresco
**Objetivo**: Hacer la tabla útil cuando hay muchos puertos.

- `FilterBar`: búsqueda por número de puerto, nombre de proceso, protocolo, estado.
- Auto-refresco cada N segundos (configurable: 2s, 5s, 10s, manual).
- Highlight de filas nuevas/desaparecidas entre refrescos.
- Ordenamiento por cualquier columna.

---

### Fase 5 — Elevación de privilegios
**Objetivo**: Ver y matar procesos de otros usuarios sin pedir contraseña a cada acción.

- **Windows**: manifiesto UAC (`requestedExecutionLevel asInvoker`) con re-launch a `requireAdministrator` si el usuario lo acepta.
- **macOS**: ServiceManagement o re-launch con `AuthorizationExecuteWithPrivileges`.
- **Linux**: re-launch con `pkexec` / `sudo` y re-conexión al frontend vía socket local.
- Indicador visual del nivel de privilegio actual.

---

### Fase 6 — Empaquetado e instaladores
**Objetivo**: Binarios distribuibles para todas las plataformas y arquitecturas.

- CI en GitHub Actions con matrix: `[windows-latest, macos-latest, ubuntu-latest]` × `[x64, arm64]`.
- Windows: `.msi` + `.exe` NSIS.
- macOS: `.dmg` (universal binary x64+arm64 con `lipo` si es posible, o binarios separados).
- Linux: `.AppImage` + `.deb` + `.rpm`.
- Draft de GitHub Release automático al hacer tag `v*`.

---

### Fase 7 (opcional) — Visualización avanzada
- Vista "por proceso": agrupa puertos bajo su proceso padre.
- Mini heat-map de puertos 0-65535 coloreado por estado.
- Histórico de puertos: qué proceso ocupó qué puerto en los últimos N minutos.
- Exportar snapshot a CSV/JSON.

---

## Decisiones de diseño

### ¿Por qué Tauri y no Electron?
- Binarios **~10× más pequeños** (5-10 MB vs 100+ MB).
- Usa la webview nativa del SO → menos RAM, arranque más rápido.
- Rust en el backend → acceso nativo a APIs del sistema sin wrappers JS frágiles.

### ¿Por qué `netstat2` y no parsear la salida de `netstat`?
- Llamar a un proceso externo es frágil (output varía por idioma/versión del SO).
- `netstat2` usa las APIs del sistema directamente → más robusto y sin spawning de procesos.
- Si `netstat2` falla en alguna arquitectura, el fallback a comandos del sistema está documentado en `docs/DEVELOPMENT.md`.

### ¿Por qué `sysinfo` para info de procesos?
- Abstracción multiplataforma madura, mantenida activamente.
- Cubre nombre, ruta, usuario, memoria, CPU — todo lo que necesitamos.
- `Process::kill()` funciona en los 3 SO de forma uniforme.
