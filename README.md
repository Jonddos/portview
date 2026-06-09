# PortView

> Visor gráfico multiplataforma de puertos de red — Windows · macOS · Linux

PortView es una aplicación de escritorio que te permite **ver, filtrar y terminar** cualquier proceso que ocupe un puerto en tu máquina, con una interfaz clara y actualización en tiempo real.

![PortView screenshot placeholder](docs/assets/screenshot-placeholder.png)

---

## Características

| Funcionalidad | Estado |
|---|---|
| Listar puertos TCP/UDP activos | ✅ Fase 1 |
| Ver PID, proceso, ruta y usuario | ✅ Fase 1 |
| Matar proceso por puerto | ✅ Fase 1 |
| UI gráfica con tabla interactiva | 🔄 Fase 2 |
| Filtros y búsqueda | 🔄 Fase 4 |
| Auto-refresco configurable | 🔄 Fase 4 |
| Elevación de privilegios UAC/sudo | 🔄 Fase 5 |
| Instaladores para todas las arquitecturas | 🔄 Fase 6 |

---

## Stack

- **Backend/Core**: [Rust](https://www.rust-lang.org/) — escaneo de puertos con `netstat2` + info de procesos con `sysinfo`
- **Framework de escritorio**: [Tauri v2](https://tauri.app/) — binarios pequeños (~5-10 MB), webview nativa
- **Frontend**: React + TypeScript + Vite
- **Estilos**: Tailwind CSS
- **Empaquetado**: Tauri Bundler (`.msi`, `.dmg`, `.AppImage`, `.deb`)

---

## Requisitos previos

| Herramienta | Versión mínima | Instalación |
|---|---|---|
| Rust + Cargo | 1.77+ | https://rustup.rs |
| Node.js | 20+ | https://nodejs.org |
| pnpm | 9+ | `npm i -g pnpm` |
| Tauri CLI | 2.x | `cargo install tauri-cli` |

### Dependencias del sistema por SO

**Windows**: Visual Studio Build Tools (C++ workload) — Tauri lo indica en su setup.

**macOS**: Xcode Command Line Tools (`xcode-select --install`).

**Linux (Debian/Ubuntu)**:
```bash
sudo apt install libwebkit2gtk-4.1-dev libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
```

---

## Instalación rápida (desarrollo)

```bash
# 1. Clonar
git clone https://github.com/TU_USUARIO/portview.git
cd portview

# 2. Instalar dependencias del frontend
cd ui && pnpm install && cd ..

# 3. Lanzar en modo desarrollo (hot-reload)
cargo tauri dev

# 4. Construir para producción
cargo tauri build
```

---

## Estructura del proyecto

```
portview/
├── src-tauri/               # Backend Rust + configuración Tauri
│   ├── src/
│   │   ├── core/
│   │   │   ├── scanner.rs   # Escaneo de puertos (netstat2 + sysinfo)
│   │   │   ├── process.rs   # Info de proceso + kill(pid)
│   │   │   └── mod.rs
│   │   ├── commands/
│   │   │   ├── ports.rs     # Comandos Tauri expuestos al frontend
│   │   │   └── mod.rs
│   │   ├── lib.rs
│   │   └── main.rs
│   ├── Cargo.toml
│   └── tauri.conf.json
├── ui/                      # Frontend React + Vite
│   ├── src/
│   │   ├── components/
│   │   │   ├── PortTable.tsx
│   │   │   ├── FilterBar.tsx
│   │   │   └── KillDialog.tsx
│   │   ├── hooks/
│   │   │   └── usePorts.ts
│   │   ├── types/
│   │   │   └── port.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
├── docs/                    # Documentación adicional
│   ├── ARCHITECTURE.md
│   ├── DEVELOPMENT.md
│   ├── PERMISSIONS.md
│   └── RELEASING.md
├── scripts/                 # Scripts de utilidad
│   └── check-deps.sh
├── .github/
│   └── workflows/
│       └── build.yml        # CI multiplataforma
├── CHANGELOG.md
├── CONTRIBUTING.md
└── README.md
```

---

## Permisos y privilegios

Para ver **todos** los procesos (no solo los del usuario actual) se requieren privilegios elevados:

- **Windows**: el instalador puede solicitar UAC, o se puede re-lanzar con `runas`.
- **macOS/Linux**: la app funciona sin root pero muestra solo procesos propios; botón "Reiniciar con sudo" disponible.

Ver [docs/PERMISSIONS.md](docs/PERMISSIONS.md) para detalle completo.

---

## Roadmap

Ver [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) para el plan de fases detallado.

---

## Contribuir

Ver [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Licencia

MIT — ver [LICENSE](LICENSE).
