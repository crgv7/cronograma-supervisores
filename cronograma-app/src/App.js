import React, { useState } from 'react';
import { generarCronograma, Estado } from './cronogramaUtils';

function App() {
  const [diasTrabajo, setDiasTrabajo] = useState(14);
  const [diasDescanso, setDiasDescanso] = useState(7);
  const [diasInduccion, setDiasInduccion] = useState(5);
  const [diasPerforacion, setDiasPerforacion] = useState(30);
  const [resultado, setResultado] = useState(null);

  const handleCalcular = () => {
    const result = generarCronograma(
      parseInt(diasTrabajo),
      parseInt(diasDescanso),
      parseInt(diasInduccion),
      parseInt(diasPerforacion)
    );
    setResultado(result);
  };

  const getEstadoLabel = (estado) => {
    const labels = {
      [Estado.SUBIDA]: 'Subida',
      [Estado.INDUCCION]: 'Inducción',
      [Estado.PERFORACION]: 'Perforación',
      [Estado.BAJADA]: 'Bajada',
      [Estado.DESCANSO]: 'Descanso',
      [Estado.LIBRE]: 'Vacío'
    };
    return labels[estado] || estado;
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>⛏️ Cronograma de Supervisores</h1>
        <p>Sistema de planificación para perforación minera</p>
      </header>

      <section className="config-panel">
        <h2>⚙️ Configuración del Régimen</h2>
        <div className="config-grid">
          <div className="config-item">
            <label htmlFor="diasTrabajo">Días de Trabajo (N)</label>
            <input
              type="number"
              id="diasTrabajo"
              value={diasTrabajo}
              onChange={(e) => setDiasTrabajo(e.target.value)}
              min="5"
              max="30"
            />
            <span className="hint">Ejemplo: 14 para régimen 14x7</span>
          </div>

          <div className="config-item">
            <label htmlFor="diasDescanso">Días de Descanso (M)</label>
            <input
              type="number"
              id="diasDescanso"
              value={diasDescanso}
              onChange={(e) => setDiasDescanso(e.target.value)}
              min="3"
              max="14"
            />
            <span className="hint">Ejemplo: 7 para régimen 14x7</span>
          </div>

          <div className="config-item">
            <label htmlFor="diasInduccion">Días de Inducción</label>
            <input
              type="number"
              id="diasInduccion"
              value={diasInduccion}
              onChange={(e) => setDiasInduccion(e.target.value)}
              min="1"
              max="5"
            />
            <span className="hint">De 1 a 5 días</span>
          </div>

          <div className="config-item">
            <label htmlFor="diasPerforacion">Total Días Perforación</label>
            <input
              type="number"
              id="diasPerforacion"
              value={diasPerforacion}
              onChange={(e) => setDiasPerforacion(e.target.value)}
              min="15"
              max="120"
            />
            <span className="hint">Días totales a visualizar</span>
          </div>
        </div>

        <button className="btn-calculate" onClick={handleCalcular}>
          📊 Calcular Cronograma
        </button>
      </section>

      {resultado && (
        <>
          <AlertsSection resultado={resultado} />
          <ScheduleSection resultado={resultado} getEstadoLabel={getEstadoLabel} />
        </>
      )}

      {!resultado && (
        <section className="schedule-panel">
          <div className="no-schedule">
            <div className="no-schedule-icon">📅</div>
            <p>Configura los parámetros y haz clic en "Calcular Cronograma"</p>
          </div>
        </section>
      )}
    </div>
  );
}

function AlertsSection({ resultado }) {
  const { validacion, diaS3Perfora } = resultado;
  const alerts = [];

  if (validacion.esValido) {
    alerts.push({
      type: 'success',
      icon: '✅',
      title: 'Cronograma Válido',
      message: 'Siempre hay exactamente 2 supervisores perforando'
    });
  }

  if (validacion.violaciones.masDe2.length > 0) {
    alerts.push({
      type: 'error',
      icon: '🚨',
      title: 'Error: Días con 3 perforando',
      message: `Días problemáticos: ${validacion.violaciones.masDe2.join(', ')}`
    });
  }

  if (validacion.violaciones.menosDe2.length > 0) {
    alerts.push({
      type: 'error',
      icon: '⚠️',
      title: 'Error: Días con menos de 2 perforando',
      message: `Días problemáticos: ${validacion.violaciones.menosDe2.join(', ')} (después de que S3 entró)`
    });
  }

  if (validacion.patronesInvalidos && validacion.patronesInvalidos.length > 0) {
    const patronesAgrupados = validacion.patronesInvalidos.reduce((acc, p) => {
      if (!acc[p.patron]) acc[p.patron] = [];
      acc[p.patron].push(`${p.supervisor} día ${p.dia}`);
      return acc;
    }, {});

    Object.entries(patronesAgrupados).forEach(([patron, casos]) => {
      alerts.push({
        type: 'warning',
        icon: '⚡',
        title: `Patrón inválido detectado: ${patron}`,
        message: `Casos: ${casos.slice(0, 5).join(', ')}${casos.length > 5 ? ` y ${casos.length - 5} más` : ''}`
      });
    });
  }

  return (
    <div className="alerts-container">
      {alerts.map((alert, index) => (
        <div key={index} className={`alert alert-${alert.type}`}>
          <span className="alert-icon">{alert.icon}</span>
          <div className="alert-content">
            <div className="alert-title">{alert.title}</div>
            <div className="alert-message">{alert.message}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ScheduleSection({ resultado, getEstadoLabel }) {
  const { config, cronogramas, conteoPerforando, diaS3Perfora, validacion } = resultado;

  const errorDays = new Set([
    ...validacion.violaciones.menosDe2,
    ...validacion.violaciones.masDe2
  ]);

  const legendItems = [
    { estado: Estado.SUBIDA, color: 'cell-S' },
    { estado: Estado.INDUCCION, color: 'cell-I' },
    { estado: Estado.PERFORACION, color: 'cell-P' },
    { estado: Estado.BAJADA, color: 'cell-B' },
    { estado: Estado.DESCANSO, color: 'cell-D' },
    { estado: Estado.LIBRE, color: 'cell--' }
  ];

  return (
    <section className="schedule-panel">
      <h2>📋 Cronograma Generado</h2>

      <div className="schedule-info">
        <span className="info-badge">
          <strong>Régimen:</strong> {config.diasTrabajo}x{config.diasLibresTotal}
        </span>
        <span className="info-badge">
          <strong>Inducción:</strong> {config.diasInduccion} días
        </span>
        <span className="info-badge">
          <strong>Total días:</strong> {config.diasPerforacionTotal}
        </span>
        <span className="info-badge">
          <strong>S3 perfora desde:</strong> día {diaS3Perfora}
        </span>
      </div>

      <div className="legend">
        {legendItems.map(({ estado, color }) => (
          <div key={estado} className="legend-item">
            <span className={`legend-color ${color}`}>{estado}</span>
            <span>{getEstadoLabel(estado)}</span>
          </div>
        ))}
      </div>

      <div className="schedule-table-container">
        <table className="schedule-table">
          <thead>
            <tr>
              <th>Día</th>
              {Array.from({ length: config.diasPerforacionTotal }, (_, i) => (
                <th key={i} className={errorDays.has(i) && i >= diaS3Perfora ? 'error-day' : ''}>
                  {i}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>S1</td>
              {cronogramas.s1.map((estado, i) => (
                <td key={i} className={errorDays.has(i) && i >= diaS3Perfora ? 'error-day' : ''}>
                  <span className={`cell cell-${estado}`}>{estado}</span>
                </td>
              ))}
            </tr>
            <tr>
              <td>S2</td>
              {cronogramas.s2.map((estado, i) => (
                <td key={i} className={errorDays.has(i) && i >= diaS3Perfora ? 'error-day' : ''}>
                  <span className={`cell cell-${estado}`}>{estado}</span>
                </td>
              ))}
            </tr>
            <tr>
              <td>S3</td>
              {cronogramas.s3.map((estado, i) => (
                <td key={i} className={errorDays.has(i) && i >= diaS3Perfora ? 'error-day' : ''}>
                  <span className={`cell cell-${estado}`}>{estado}</span>
                </td>
              ))}
            </tr>
            <tr className="row-count">
              <td>#P</td>
              {conteoPerforando.map((count, i) => {
                const isError = i >= diaS3Perfora && count !== 2;
                return (
                  <td key={i} className={`count-cell ${isError ? 'count-error' : 'count-ok'}`}>
                    {count}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default App;
