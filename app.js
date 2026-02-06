const STORAGE_KEY = 'pc-puma-eventos-v1';

const DEFAULT_ACTIONS = [
  { nombre: 'Convocatoria y difusión', descripcion: 'Difusión del evento con público objetivo' },
  { nombre: 'Registro de participantes', descripcion: 'Apertura y gestión del registro' },
  { nombre: 'Preparación de materiales', descripcion: 'Diseño y revisión de contenidos' },
  { nombre: 'Ejecución del evento', descripcion: 'Realización de la sesión formativa' },
  { nombre: 'Evaluación y cierre', descripcion: 'Encuesta de satisfacción y reporte final' }
];

const ESTADOS = [
  { value: 'no_iniciado', label: 'No iniciado' },
  { value: 'iniciado', label: 'Iniciado' },
  { value: 'en_proceso', label: 'En proceso' },
  { value: 'completado', label: 'Completado' }
];

const eventForm = document.getElementById('event-form');
const eventList = document.getElementById('event-list');
const eventTemplate = document.getElementById('event-template');
const gantt = document.getElementById('gantt');
const ganttSelect = document.getElementById('gantt-event-select');

let events = loadEvents();
let editEventId = null;

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());
}

function clampPercentage(value) {
  const v = Number(value);
  return Number.isFinite(v) ? Math.min(100, Math.max(0, v)) : 0;
}

function loadEvents() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistEvents() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

function computeEventProgress(event) {
  if (!event.acciones.length) return 0;
  const total = event.acciones.reduce((acc, a) => acc + clampPercentage(a.porcentajeAvance), 0);
  return Math.round(total / event.acciones.length);
}

function createDefaultActions(fechaInicio, fechaFin) {
  return DEFAULT_ACTIONS.map(a => ({
    id: uid(),
    nombre: a.nombre,
    descripcion: a.descripcion,
    estado: 'no_iniciado',
    porcentajeAvance: 0,
    fechaInicio,
    fechaFin
  }));
}

function saveEvent(data) {
  if (editEventId) {
    const target = events.find(e => e.id === editEventId);
    Object.assign(target, data);
    editEventId = null;
  } else {
    events.push({ id: uid(), ...data, acciones: createDefaultActions(data.fechaInicio, data.fechaFin) });
  }
  persistEvents();
  render();
  eventForm.reset();
}

function deleteEvent(id) {
  events = events.filter(e => e.id !== id);
  persistEvents();
  render();
}

function renderEvent(event) {
  const node = eventTemplate.content.firstElementChild.cloneNode(true);
  node.querySelector('h3').textContent = event.nombre;
  node.querySelector('.meta').textContent = `Modalidad: ${event.modalidad} | Responsable: ${event.responsable || 'Sin asignar'} | ${event.fechaInicio} → ${event.fechaFin}`;
  node.querySelector('.desc').textContent = event.descripcion || 'Sin descripción';
  node.querySelector('.global-progress').textContent = `Avance global: ${computeEventProgress(event)}%`;

  node.querySelector('[data-action="edit"]').onclick = () => {
    editEventId = event.id;
    eventForm.nombre.value = event.nombre;
    eventForm.descripcion.value = event.descripcion;
    eventForm.modalidad.value = event.modalidad;
    eventForm.responsable.value = event.responsable;
    eventForm.fechaInicio.value = event.fechaInicio;
    eventForm.fechaFin.value = event.fechaFin;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  node.querySelector('[data-action="delete"]').onclick = () => deleteEvent(event.id);

  const actionForm = node.querySelector('.action-form');
  actionForm.onsubmit = (e) => {
    e.preventDefault();
    event.acciones.push({
      id: uid(),
      nombre: actionForm.nombre.value,
      descripcion: actionForm.descripcion.value,
      estado: 'no_iniciado',
      porcentajeAvance: 0,
      fechaInicio: actionForm.fechaInicio.value,
      fechaFin: actionForm.fechaFin.value
    });
    persistEvents();
    render();
  };

  const actionList = node.querySelector('.action-list');
  event.acciones.forEach(action => {
    const li = document.createElement('li');
    li.className = 'action-item';

    const statusOptions = ESTADOS.map(s => `<option value="${s.value}" ${s.value === action.estado ? 'selected' : ''}>${s.label}</option>`).join('');

    li.innerHTML = `
      <div><strong>${action.nombre}</strong><div>${action.descripcion || ''}</div></div>
      <select data-key="estado">${statusOptions}</select>
      <input data-key="porcentajeAvance" type="number" min="0" max="100" value="${clampPercentage(action.porcentajeAvance)}" />
      <input data-key="fechaInicio" type="date" value="${action.fechaInicio}" />
      <input data-key="fechaFin" type="date" value="${action.fechaFin}" />
      <button data-remove="1" type="button">Eliminar</button>
      <div class="progress-bar" style="grid-column: 1 / -1"><span style="width:${clampPercentage(action.porcentajeAvance)}%"></span></div>
    `;

    li.querySelectorAll('[data-key]').forEach(input => {
      input.onchange = () => {
        const key = input.dataset.key;
        action[key] = key === 'porcentajeAvance' ? clampPercentage(input.value) : input.value;
        persistEvents();
        render();
      };
    });

    li.querySelector('[data-remove]').onclick = () => {
      event.acciones = event.acciones.filter(a => a.id !== action.id);
      persistEvents();
      render();
    };

    actionList.appendChild(li);
  });

  return node;
}

function renderGantt() {
  const selected = events.find(e => e.id === ganttSelect.value);
  gantt.innerHTML = '';
  if (!selected || !selected.acciones.length) {
    gantt.innerHTML = '<p>Sin acciones para mostrar.</p>';
    return;
  }

  const dates = selected.acciones.flatMap(a => [new Date(a.fechaInicio), new Date(a.fechaFin)]).filter(d => !Number.isNaN(d));
  const minDate = new Date(Math.min(...dates));
  const maxDate = new Date(Math.max(...dates));
  const total = Math.max(1, maxDate - minDate);

  selected.acciones.forEach(action => {
    const start = new Date(action.fechaInicio);
    const end = new Date(action.fechaFin);
    const left = ((start - minDate) / total) * 100;
    const width = Math.max(2, ((end - start) / total) * 100);

    const row = document.createElement('div');
    row.className = 'gantt-row';
    row.innerHTML = `
      <div>${action.nombre}<br><small>${action.fechaInicio} - ${action.fechaFin}</small></div>
      <div class="gantt-track">
        <div class="gantt-bar estado-${action.estado}" style="left:${left}%; width:${width}%">${clampPercentage(action.porcentajeAvance)}%</div>
      </div>
    `;
    gantt.appendChild(row);
  });
}

function renderEventSelector() {
  const current = ganttSelect.value;
  ganttSelect.innerHTML = events.map(e => `<option value="${e.id}">${e.nombre}</option>`).join('');
  if (events.some(e => e.id === current)) ganttSelect.value = current;
  ganttSelect.onchange = renderGantt;
}

function render() {
  eventList.innerHTML = '';
  events.forEach(e => eventList.appendChild(renderEvent(e)));
  renderEventSelector();
  renderGantt();
}

eventForm.onsubmit = (e) => {
  e.preventDefault();
  saveEvent({
    nombre: eventForm.nombre.value.trim(),
    descripcion: eventForm.descripcion.value.trim(),
    modalidad: eventForm.modalidad.value,
    responsable: eventForm.responsable.value.trim(),
    fechaInicio: eventForm.fechaInicio.value,
    fechaFin: eventForm.fechaFin.value
  });
};

render();
