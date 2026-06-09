# Guía de desarrollo

## Setup del entorno

### 1. Instalar Rust
```bash
curl --proto '=https' --tlsv1.2 -sSf https://rustup.rs | sh
# Windows: descargar rustup-init.exe desde https://rustup.rs
rustup update stable
```

### 2. Instalar Node.js + pnpm
```bash
# Recomendado: usar nvm (Linux/macOS) o nvm-windows
node --version   # debe ser >= 20
npm install -g pnpm
```

### 3. Instalar Tauri CLI
```bash
cargo install tauri-cli --version "^2"
cargo tauri --version  # verificar
```

### 4. Dependencias por SO

**Windows**
- Visual Studio Build Tools 2022 con workload "Desarrollo para escritorio con C++"
- WebView2 (incluido en Windows 10/11 por defecto)

**macOS**
```bash
xcode-select --install
```

**Linux (Debian/Ubuntu)**
```bash
sudo apt update
sudo apt install \
  libwebkit2gtk-4.1-dev \
  libssl-dev \
  libgtk-3-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  build-essential \
  curl \
  wget
```

**Linux (Arch)**
```bash
sudo pacman -S webkit2gtk-4.1 gtk3 librsvg libayatana-appindicator base-devel
```

---

## Comandos del día a día

```bash
# Desarrollo con hot-reload (frontend + backend)
cargo tauri dev

# Solo compilar el core Rust (más rápido para iterar en lógica)
cargo build --manifest-path src-tauri/Cargo.toml

# Tests del core
cargo test --manifest-path src-tauri/Cargo.toml

# Tests con output visible (útil para debug)
cargo test --manifest-path src-tauri/Cargo.toml -- --nocapture

# Frontend solo (sin Tauri, para iterar en UI)
cd ui && pnpm dev

# Lint frontend
cd ui && pnpm lint

# Construir para producción
cargo tauri build

# Construir para arquitectura específica (requiere target instalado)
rustup target add aarch64-apple-darwin
cargo tauri build --target aarch64-apple-darwin
```

---

## Organización del código Rust

### `src-tauri/src/core/scanner.rs`
Responsabilidad única: **devolver la lista de sockets activos**.

```rust
pub fn scan_ports() -> Result<Vec<PortEntry>, ScanError>
```

Flujo interno:
1. Llamar a `netstat2::iterate_sockets_info()` para obtener sockets TCP y UDP.
2. Para cada socket, extraer PID si está disponible.
3. Usar `sysinfo::System` para enriquecer cada PID con nombre, ruta, usuario.
4. Devolver `Vec<PortEntry>`.

**Fallback por SO** (si `netstat2` no funciona en alguna arquitectura):
- Windows: `iphlpapi::GetExtendedTcpTable` + `GetExtendedUdpTable` vía `windows` crate.
- macOS: parsear salida de `lsof -i -P -n -w`.
- Linux: leer `/proc/net/tcp` + `/proc/net/tcp6` + `/proc/net/udp` + mapear inodos.

### `src-tauri/src/core/process.rs`
Responsabilidad única: **gestionar procesos** (info + kill).

```rust
pub fn get_process_info(pid: u32) -> Option<ProcessInfo>
pub fn kill_process(pid: u32) -> Result<(), KillError>
```

### `src-tauri/src/commands/ports.rs`
Puente entre el frontend y el core. Todos los `#[tauri::command]` van aquí.

```rust
#[tauri::command]
pub async fn list_ports() -> Result<Vec<PortEntry>, String>

#[tauri::command]
pub async fn kill_port(pid: u32) -> Result<(), String>

#[tauri::command]
pub async fn check_privileges() -> bool
```

---

## Variables de entorno útiles

| Variable | Efecto |
|---|---|
| `PORTVIEW_LOG=debug` | Activa logs verbosos del core |
| `PORTVIEW_MOCK=1` | Usa datos falsos en el frontend (sin escaneo real) |
| `RUST_LOG=portview=debug` | Logs de `tracing` del backend |
| `RUST_BACKTRACE=1` | Backtrace completo en panics |

---

## Debugging

### Backend (Rust)
```bash
# Logs con tracing
RUST_LOG=portview=debug cargo tauri dev

# Abrir DevTools en modo desarrollo
# En la ventana Tauri: Ctrl+Shift+I (Windows/Linux) o Cmd+Option+I (macOS)
```

### Frontend (React)
- Los DevTools del navegador están disponibles en modo `cargo tauri dev`.
- `console.log` aparece en la terminal donde corre `cargo tauri dev`.

### Errores comunes

**`netstat2` devuelve error en Linux sin sudo**
→ Normal. La app mostrará los puertos accesibles y avisará que se necesitan más privilegios.

**WebView2 no encontrado en Windows**
→ Instalar desde https://developer.microsoft.com/microsoft-edge/webview2/

**`cargo tauri dev` falla con "no se puede conectar al frontend"**
→ Asegúrate de que `cd ui && pnpm install` fue ejecutado antes.

---

## Convención de errores

Usamos `thiserror` para errores tipados en el core:

```rust
#[derive(Debug, thiserror::Error)]
pub enum ScanError {
    #[error("Acceso denegado — se requieren privilegios de administrador")]
    PermissionDenied,
    #[error("Error de sistema: {0}")]
    SystemError(#[from] std::io::Error),
}
```

Los `#[tauri::command]` convierten los errores a `String` para cruzar la IPC:
```rust
.map_err(|e| e.to_string())
```
