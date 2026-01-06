/**
 * Algoritmo de Cronograma de Supervisores de Perforacion Minera
 * Adaptado para React
 */

export const Estado = {
  LIBRE: "-",
  SUBIDA: "S",
  INDUCCION: "I",
  PERFORACION: "P",
  BAJADA: "B",
  DESCANSO: "D"
};

class ConfiguracionRegimen {
  constructor(diasTrabajo, diasLibresTotal, diasInduccion, diasPerforacionTotal) {
    this.diasTrabajo = diasTrabajo;
    this.diasLibresTotal = diasLibresTotal;
    this.diasInduccion = diasInduccion;
    this.diasPerforacionTotal = diasPerforacionTotal;
  }

  get diasDescansoReal() {
    return this.diasLibresTotal - 2;
  }

  get diasPerforacionPrimerCiclo() {
    return this.diasTrabajo - this.diasInduccion - 1;
  }
}

class GeneradorCronograma {
  constructor(config) {
    this.config = config;
    this.totalDias = config.diasPerforacionTotal + 20;
    this.s1 = new Array(this.totalDias).fill(Estado.LIBRE);
    this.s2 = new Array(this.totalDias).fill(Estado.LIBRE);
    this.s3 = new Array(this.totalDias).fill(Estado.LIBRE);
  }

  generarCiclo(cronograma, diaInicio, incluirInduccion = true, limiteVisualizacion = null) {
    let dia = diaInicio;
    const limite = limiteVisualizacion || cronograma.length;

    const diasHastaFin = limite - diaInicio;
    const diasNecesariosParaPerforar = 1 + (incluirInduccion ? this.config.diasInduccion : 0);
    const diasPerforacionPosibles = diasHastaFin - diasNecesariosParaPerforar;

    if (diasPerforacionPosibles < 2) {
      return cronograma.length;
    }

    if (dia < cronograma.length) {
      cronograma[dia] = Estado.SUBIDA;
    }
    dia++;

    if (incluirInduccion) {
      for (let i = 0; i < this.config.diasInduccion; i++) {
        if (dia < cronograma.length) {
          cronograma[dia] = Estado.INDUCCION;
        }
        dia++;
      }
    }

    let diasPerf = this.config.diasTrabajo - 1;
    if (incluirInduccion) {
      diasPerf -= this.config.diasInduccion;
    }

    for (let i = 0; i < diasPerf; i++) {
      if (dia < cronograma.length) {
        cronograma[dia] = Estado.PERFORACION;
      }
      dia++;
    }

    if (dia < cronograma.length) {
      cronograma[dia] = Estado.BAJADA;
    }
    dia++;

    for (let i = 0; i < this.config.diasDescansoReal; i++) {
      if (dia < cronograma.length) {
        cronograma[dia] = Estado.DESCANSO;
      }
      dia++;
    }

    return dia;
  }

  generarS1() {
    let dia = 0;
    let ciclo = 0;
    while (dia < this.totalDias) {
      const incluirInduccion = ciclo === 0;
      dia = this.generarCiclo(this.s1, dia, incluirInduccion);
      ciclo++;
    }
  }

  encontrarPrimerDiaBajadaS1() {
    for (let d = 0; d < this.s1.length; d++) {
      if (this.s1[d] === Estado.BAJADA) {
        return d;
      }
    }
    return this.totalDias;
  }

  generarS3() {
    const diaBajadaS1 = this.encontrarPrimerDiaBajadaS1();
    const diaEntradaS3 = diaBajadaS1 - this.config.diasInduccion - 1;

    let dia = diaEntradaS3;
    let ciclo = 0;
    while (dia < this.totalDias) {
      const incluirInduccion = ciclo === 0;
      const diaAnterior = dia;
      dia = this.generarCiclo(this.s3, dia, incluirInduccion, this.config.diasPerforacionTotal);
      if (dia === this.s3.length || dia === diaAnterior) {
        break;
      }
      ciclo++;
    }
  }

  encontrarPrimerDiaPerforacionGlobal() {
    for (let d = 0; d < this.totalDias; d++) {
      if (this.estaPerforando(this.s1, d) || this.estaPerforando(this.s2, d) || this.estaPerforando(this.s3, d)) {
        return d;
      }
    }
    return this.totalDias;
  }

  encontrarPrimerDiaS3Perfora() {
    for (let d = 0; d < this.s3.length; d++) {
      if (this.s3[d] === Estado.PERFORACION) {
        return d;
      }
    }
    return this.totalDias;
  }

  estaPerforando(cronograma, dia) {
    return dia >= 0 && dia < cronograma.length && cronograma[dia] === Estado.PERFORACION;
  }

  contarPerforandoS1S3(dia) {
    let count = 0;
    if (this.estaPerforando(this.s1, dia)) count++;
    if (this.estaPerforando(this.s3, dia)) count++;
    return count;
  }

  generarS2Dinamico() {
    const diaS3Perfora = this.encontrarPrimerDiaS3Perfora();
    let dia = 0;

    while (dia < this.totalDias) {
      if (dia < diaS3Perfora) {
        this.generarS2FaseInicial(dia, diaS3Perfora);
        dia = diaS3Perfora;
      } else {
        dia = this.generarS2FaseComplemento(dia);
      }
    }
  }

  generarS2FaseInicial(diaInicio, diaFin) {
    let dia = diaInicio;

    this.s2[dia] = Estado.SUBIDA;
    dia++;

    for (let i = 0; i < this.config.diasInduccion; i++) {
      if (dia < diaFin) {
        this.s2[dia] = Estado.INDUCCION;
        dia++;
      }
    }

    while (dia < diaFin - 1) {
      this.s2[dia] = Estado.PERFORACION;
      dia++;
    }

    if (dia < this.s2.length) {
      this.s2[dia] = Estado.BAJADA;
    }
  }

  generarS2FaseComplemento(diaInicio) {
    let dia = diaInicio;

    while (dia < this.totalDias) {
      const countS1S3 = this.contarPerforandoS1S3(dia);

      if (countS1S3 < 2) {
        if (this.s2[dia] === Estado.LIBRE || this.s2[dia] === Estado.DESCANSO) {
          if (dia > 0 && this.s2[dia - 1] === Estado.DESCANSO) {
            this.s2[dia - 1] = Estado.SUBIDA;
            this.s2[dia] = Estado.PERFORACION;
          } else if (this.s2[dia - 1] === Estado.LIBRE) {
            this.s2[dia] = Estado.SUBIDA;
            dia++;
            if (dia < this.totalDias) {
              this.s2[dia] = Estado.PERFORACION;
            }
          } else {
            this.s2[dia] = Estado.PERFORACION;
          }
        } else if (this.s2[dia] === Estado.BAJADA) {
          this.s2[dia] = Estado.PERFORACION;
        }
        dia++;
      } else {
        if (this.s2[dia] === Estado.PERFORACION ||
            (dia > 0 && this.s2[dia - 1] === Estado.PERFORACION)) {
          this.s2[dia] = Estado.BAJADA;
        } else {
          this.s2[dia] = Estado.DESCANSO;
        }
        dia++;
      }
    }

    return dia;
  }

  ajustarTransicionesS2() {
    for (let dia = 0; dia < this.totalDias; dia++) {
      const estadoActual = this.s2[dia];
      const estadoAnterior = dia > 0 ? this.s2[dia - 1] : Estado.LIBRE;

      if (estadoActual === Estado.PERFORACION && estadoAnterior === Estado.DESCANSO) {
        this.s2[dia - 1] = Estado.SUBIDA;
      }

      if (estadoActual === Estado.DESCANSO && estadoAnterior === Estado.PERFORACION) {
        this.s2[dia] = Estado.BAJADA;
      }
    }
  }

  contarPerforando(dia) {
    let count = 0;
    if (this.estaPerforando(this.s1, dia)) count++;
    if (this.estaPerforando(this.s2, dia)) count++;
    if (this.estaPerforando(this.s3, dia)) count++;
    return count;
  }

  correccionFinal() {
    const diaInicio = this.encontrarPrimerDiaPerforacionGlobal();
    const diaS3Perfora = this.encontrarPrimerDiaS3Perfora();

    for (let dia = diaInicio; dia < this.config.diasPerforacionTotal; dia++) {
      const count = this.contarPerforando(dia);

      if (count < 2) {
        this.s2[dia] = Estado.PERFORACION;
      } else if (count > 2) {
        if (this.estaPerforando(this.s2, dia)) {
          this.s2[dia] = Estado.BAJADA;
        }
      }
    }
  }

  eliminarPerforacionFlash() {
    const cronogramas = [
      { nombre: 's2', cron: this.s2 },
      { nombre: 's3', cron: this.s3 }
    ];

    cronogramas.forEach(({ nombre, cron }) => {
      let enPerforacion = false;
      let inicioPerf = -1;

      for (let d = 0; d <= this.config.diasPerforacionTotal; d++) {
        const actual = d < cron.length ? cron[d] : null;

        if (actual === Estado.PERFORACION && !enPerforacion) {
          enPerforacion = true;
          inicioPerf = d;
        } else if (actual !== Estado.PERFORACION && enPerforacion) {
          const diasPerf = d - inicioPerf;

          if (diasPerf === 1) {
            let corregido = false;

            if (d < this.config.diasPerforacionTotal &&
                (cron[d] === Estado.BAJADA || cron[d] === Estado.DESCANSO || cron[d] === Estado.LIBRE)) {
              const countSinEste = this.contarPerforandoSin(d, nombre);
              if (countSinEste < 2) {
                cron[d] = Estado.PERFORACION;
                corregido = true;
              }
            }

            if (!corregido && inicioPerf > 0) {
              const diaAnterior = inicioPerf - 1;
              if (cron[diaAnterior] === Estado.SUBIDA ||
                  cron[diaAnterior] === Estado.INDUCCION ||
                  cron[diaAnterior] === Estado.DESCANSO) {
                const countSinEste = this.contarPerforandoSin(diaAnterior, nombre);
                if (countSinEste < 2) {
                  cron[diaAnterior] = Estado.PERFORACION;
                  corregido = true;
                }
              }
            }
          }
          enPerforacion = false;
        }
      }
    });
  }

  contarPerforandoSin(dia, excluir) {
    let count = 0;
    if (excluir !== 's1' && this.estaPerforando(this.s1, dia)) count++;
    if (excluir !== 's2' && this.estaPerforando(this.s2, dia)) count++;
    if (excluir !== 's3' && this.estaPerforando(this.s3, dia)) count++;
    return count;
  }

  generar() {
    this.generarS1();
    this.generarS3();
    this.generarS2Dinamico();
    this.ajustarTransicionesS2();
    this.correccionFinal();
    this.eliminarPerforacionFlash();
    this.correccionFinal();
    return this.obtenerResultado();
  }

  validar() {
    const violaciones = {
      menosDe2: [],
      masDe2: []
    };

    const diaInicio = this.encontrarPrimerDiaPerforacionGlobal();

    for (let d = diaInicio; d < this.config.diasPerforacionTotal; d++) {
      const count = this.contarPerforando(d);
      if (count < 2) {
        violaciones.menosDe2.push(d);
      } else if (count > 2) {
        violaciones.masDe2.push(d);
      }
    }

    return violaciones;
  }

  validarPatrones() {
    const patronesInvalidos = [];
    const cronogramas = [
      { nombre: 'S1', cron: this.s1 },
      { nombre: 'S2', cron: this.s2 },
      { nombre: 'S3', cron: this.s3 }
    ];

    // Solo validar S-S y S-B como indica el QA (E-03)
    const transicionesInvalidas = [
      ['S', 'S'],
      ['S', 'B']
    ];

    cronogramas.forEach(({ nombre, cron }) => {
      for (let d = 0; d < this.config.diasPerforacionTotal - 1; d++) {
        const actual = cron[d];
        const siguiente = cron[d + 1];
        
        if (actual === Estado.LIBRE || siguiente === Estado.LIBRE) continue;

        for (const [a, b] of transicionesInvalidas) {
          if (actual === a && siguiente === b) {
            patronesInvalidos.push({
              supervisor: nombre,
              dia: d,
              patron: `${a}-${b}`
            });
          }
        }
      }
    });

    return patronesInvalidos;
  }

  obtenerResultado() {
    const diasMostrar = this.config.diasPerforacionTotal;
    const violaciones = this.validar();
    const patronesInvalidos = this.validarPatrones();
    const esValido = violaciones.menosDe2.length === 0 && 
                     violaciones.masDe2.length === 0 && 
                     patronesInvalidos.length === 0;

    return {
      config: {
        diasTrabajo: this.config.diasTrabajo,
        diasLibresTotal: this.config.diasLibresTotal,
        diasInduccion: this.config.diasInduccion,
        diasPerforacionTotal: this.config.diasPerforacionTotal
      },
      cronogramas: {
        s1: this.s1.slice(0, diasMostrar),
        s2: this.s2.slice(0, diasMostrar),
        s3: this.s3.slice(0, diasMostrar)
      },
      conteoPerforando: Array.from({ length: diasMostrar }, (_, d) => this.contarPerforando(d)),
      diaS3Perfora: this.encontrarPrimerDiaS3Perfora(),
      validacion: {
        esValido,
        violaciones,
        patronesInvalidos
      }
    };
  }
}

export function generarCronograma(diasTrabajo, diasLibresTotal, diasInduccion, diasPerforacionTotal = 30) {
  const config = new ConfiguracionRegimen(diasTrabajo, diasLibresTotal, diasInduccion, diasPerforacionTotal);
  const generador = new GeneradorCronograma(config);
  return generador.generar();
}
