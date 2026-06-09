# Contribuyendo a PortView

¡Gracias por tu interés en contribuir! Lee esto antes de abrir un PR.

---

## Flujo de trabajo

1. **Fork** el repositorio.
2. Crea una rama descriptiva: `git checkout -b feat/kill-confirmation-dialog` o `fix/windows-udp-scan`.
3. Haz tus cambios siguiendo los estándares de código de abajo.
4. Ejecuta los tests: `cargo test` (backend) y `pnpm test` (frontend).
5. Abre un **Pull Request** contra `main` con descripción clara de qué cambia y por qué.

---

## Estándares de código

### Rust (backend)
- `cargo fmt` antes de cada commit.
- `cargo clippy -- -D warnings` debe pasar sin errores.
- Documenta funciones públicas con `///`.
- Usa `thiserror` para tipos de error personalizados.

### TypeScript/React (frontend)
- `pnpm lint` (ESLint) debe pasar.
- Componentes en PascalCase, hooks con prefijo `use`.
- Props tipadas con interfaces explícitas, no `any`.

---

## Reportar bugs

Abre un issue con:
- **SO y arquitectura** (ej. Windows 11 x64, macOS 14 arm64).
- **Versión de PortView**.
- **Pasos para reproducir**.
- **Comportamiento esperado vs. actual**.
- **Logs** si aplica (menú Help > Show Logs).

---

## Proponer features

Abre un issue con la etiqueta `enhancement`. Describe:
- El problema que resuelve.
- La solución propuesta (con bocetos si aplica).
- Alternativas consideradas.

---

## Convenciones de commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: añadir filtro por estado de conexión
fix: corregir crash en Linux al leer /proc sin permisos
docs: actualizar sección de instalación en README
chore: actualizar dependencias Cargo
```

Tipos válidos: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `ci`, `perf`.

---

## Código de conducta

Sé respetuoso. Crítica técnica es bienvenida; ataques personales no.
