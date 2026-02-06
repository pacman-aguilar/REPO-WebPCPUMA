# Planificador de eventos formativos — Conéctate con PC PUMA

Aplicación web ligera (HTML/CSS/JS) para gestionar eventos formativos, sus acciones operativas y el seguimiento de avance con vista tipo Gantt.

## Funcionalidades implementadas

- CRUD de eventos formativos:
  - Crear, visualizar, editar y eliminar eventos.
  - Datos por evento: nombre, descripción, modalidad, responsable, fecha de inicio y término.
- Gestión de acciones por evento:
  - Se crean acciones predefinidas al registrar un evento.
  - Se pueden eliminar acciones predefinidas, agregar acciones personalizadas y actualizar su estado/avance/fechas.
- Seguimiento de avance:
  - Porcentaje por acción (0–100%).
  - Porcentaje global del evento calculado como promedio de avance de sus acciones.
- Gantt por evento:
  - Selector de evento.
  - Visualización de acciones con rango de fechas, estado y porcentaje.

## Modelo de datos propuesto

La app usa `localStorage` para persistencia local, pero el modelo ya está pensado para escalar a BD relacional o NoSQL.

### Entidad `EventoFormativo`

```ts
EventoFormativo {
  id: string;
  nombre: string;
  descripcion?: string;
  modalidad: 'presencial' | 'en_linea' | 'hibrido';
  responsable?: string;
  fechaInicio: string; // YYYY-MM-DD
  fechaFin: string;    // YYYY-MM-DD
  acciones: AccionEvento[];
}
```

### Entidad `AccionEvento`

```ts
AccionEvento {
  id: string;
  eventoId?: string; // implícito cuando vive anidada en EventoFormativo
  nombre: string;
  descripcion?: string;
  estado: 'no_iniciado' | 'iniciado' | 'en_proceso' | 'completado';
  porcentajeAvance: number; // 0..100
  fechaInicio: string;      // YYYY-MM-DD
  fechaFin: string;         // YYYY-MM-DD
}
```

## Justificación del estado `Completado`

Se incluye `Completado` porque facilita consistencia operativa y analítica:

- Permite distinguir entre “en proceso al 100%” (dato potencialmente incorrecto) y cierre validado.
- Mejora reportes de cumplimiento por hito.
- Ayuda en control de calidad cuando se requiere evidencia de cierre administrativo.

## Oportunidades de mejora (si se migra a backend)

- Catálogos:
  - `catalogo_estados_accion` para parametrizar estados.
  - `catalogo_tipo_accion` para reutilizar plantillas de acciones por tipo de evento.
- Reglas de negocio:
  - `porcentajeAvance = 100` fuerza sugerencia de `estado = completado`.
  - Validar que `fechaInicio <= fechaFin` en evento y acción.
- Auditoría:
  - `createdAt`, `updatedAt`, `updatedBy` en ambas entidades.
- Multiusuario:
  - Roles (`operativo`, `coordinador`, `admin`) y permisos por evento.

## Ejecución

Como es una app estática:

1. Abrir `index.html` directamente en el navegador, o
2. Servir localmente con cualquier static server.

Ejemplo:

```bash
python3 -m http.server 8000
```

Luego entrar a `http://localhost:8000`.
