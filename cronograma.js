/**
 * Algoritmo de Cronograma de Supervisores de Perforacion Minera
 * 
 * Este modulo genera cronogramas para 3 supervisores asegurando que
 * siempre haya exactamente 2 supervisores perforando.
 * 
 * ESTRATEGIA DEL ALGORITMO:
 * 1. S1 sigue su regimen completo sin modificaciones
 * 2. S3 entra exactamente cuando se necesita para cubrir a S1
 * 3. S2 se ajusta dinamicamente para SIEMPRE mantener exactamente 2 perforando
 */

// Estados posibles de un supervisor en un dia dado
const Estado = {
    LIBRE: "-",       // No ha entrado aun / sin actividad
    SUBIDA: "S",      // Viaje al campo (1 dia)
    INDUCCION: "I",   // Capacitacion (configurable 1-5 dias)
    PERFORACION: "P", // Trabajo efectivo
    BAJADA: "B",      // Retorno (1 dia)
    DESCANSO: "D"     // Dias libres
};

/**
 * Configuracion del regimen de trabajo
 */
class ConfiguracionRegimen {
    constructor(diasTrabajo, diasLibresTotal, diasInduccion, diasPerforacionTotal) {
        this.diasTrabajo = diasTrabajo;           // N en NxM
        this.diasLibresTotal = diasLibresTotal;   // M en NxM
        this.diasInduccion = diasInduccion;       // Dias de induccion (1-5)
        this.diasPerforacionTotal = diasPerforacionTotal;  // Total de dias a visualizar
    }

    // Dias de descanso reales = M - 2 (restando subida y bajada)
    get diasDescansoReal() {
        return this.diasLibresTotal - 2;
    }

    // Dias de perforacion en el primer ciclo
    get diasPerforacionPrimerCiclo() {
        return this.diasTrabajo - this.diasInduccion - 1;  // -1 por subida
    }
}

/**
 * Generador de cronogramas para 3 supervisores
 */
class GeneradorCronograma {
    constructor(config) {
        this.config = config;
        this.totalDias = config.diasPerforacionTotal + 20;

        // Cronogramas como arrays de estados
        this.s1 = new Array(this.totalDias).fill(Estado.LIBRE);
        this.s2 = new Array(this.totalDias).fill(Estado.LIBRE);
        this.s3 = new Array(this.totalDias).fill(Estado.LIBRE);
    }

    /**
     * Genera un ciclo completo en el cronograma
     * @returns {number} El dia siguiente al fin del ciclo
     */
    generarCiclo(cronograma, diaInicio, incluirInduccion = true, limiteVisualizacion = null) {
        let dia = diaInicio;
        const limite = limiteVisualizacion || cronograma.length;

        // Calcular si este ciclo tendrá al menos 2 días de perforación
        const diasHastaFin = limite - diaInicio;
        const diasNecesariosParaPerforar = 1 + (incluirInduccion ? this.config.diasInduccion : 0);
        const diasPerforacionPosibles = diasHastaFin - diasNecesariosParaPerforar;

        // Si no tendremos al menos 2 días de perforación, no iniciar el ciclo
        if (diasPerforacionPosibles < 2) {
            return cronograma.length; // Terminar generación
        }

        // Subida (1 dia)
        if (dia < cronograma.length) {
            cronograma[dia] = Estado.SUBIDA;
        }
        dia++;

        // Induccion (si aplica)
        if (incluirInduccion) {
            for (let i = 0; i < this.config.diasInduccion; i++) {
                if (dia < cronograma.length) {
                    cronograma[dia] = Estado.INDUCCION;
                }
                dia++;
            }
        }

        // Perforacion
        let diasPerf = this.config.diasTrabajo - 1;  // -1 por subida
        if (incluirInduccion) {
            diasPerf -= this.config.diasInduccion;
        }

        for (let i = 0; i < diasPerf; i++) {
            if (dia < cronograma.length) {
                cronograma[dia] = Estado.PERFORACION;
            }
            dia++;
        }

        // Bajada (1 dia)
        if (dia < cronograma.length) {
            cronograma[dia] = Estado.BAJADA;
        }
        dia++;

        // Descanso
        for (let i = 0; i < this.config.diasDescansoReal; i++) {
            if (dia < cronograma.length) {
                cronograma[dia] = Estado.DESCANSO;
            }
            dia++;
        }

        return dia;
    }

    /**
     * Genera cronograma completo para S1 (referencia fija)
     */
    generarS1() {
        let dia = 0;
        let ciclo = 0;
        while (dia < this.totalDias) {
            const incluirInduccion = ciclo === 0;
            dia = this.generarCiclo(this.s1, dia, incluirInduccion);
            ciclo++;
        }
    }

    /**
     * Encuentra el primer dia que S1 baja
     */
    encontrarPrimerDiaBajadaS1() {
        for (let d = 0; d < this.s1.length; d++) {
            if (this.s1[d] === Estado.BAJADA) {
                return d;
            }
        }
        return this.totalDias;
    }

    /**
     * Genera cronograma para S3
     * S3 debe empezar a perforar exactamente cuando S1 baja por primera vez
     */
    generarS3() {
        const diaBajadaS1 = this.encontrarPrimerDiaBajadaS1();

        // S3 empieza a perforar el dia que S1 baja
        // Entonces S3 entra: diaBajadaS1 - diasInduccion - 1 (subida)
        const diaEntradaS3 = diaBajadaS1 - this.config.diasInduccion - 1;

        // Generar ciclos de S3 con límite de visualización
        let dia = diaEntradaS3;
        let ciclo = 0;
        while (dia < this.totalDias) {
            const incluirInduccion = ciclo === 0;
            const diaAnterior = dia;
            dia = this.generarCiclo(this.s3, dia, incluirInduccion, this.config.diasPerforacionTotal);
            // Si no se generó nada nuevo (ciclo abortado), salir
            if (dia === this.s3.length || dia === diaAnterior) {
                break;
            }
            ciclo++;
        }
    }

    /**
     * Encuentra el primer dia que cualquier supervisor perfora
     */
    encontrarPrimerDiaPerforacionGlobal() {
        for (let d = 0; d < this.totalDias; d++) {
            if (this.estaPerforando(this.s1, d) || this.estaPerforando(this.s2, d) || this.estaPerforando(this.s3, d)) {
                return d;
            }
        }
        return this.totalDias;
    }

    /**
     * Encuentra el primer dia que S3 perfora
     */
    encontrarPrimerDiaS3Perfora() {
        for (let d = 0; d < this.s3.length; d++) {
            if (this.s3[d] === Estado.PERFORACION) {
                return d;
            }
        }
        return this.totalDias;
    }

    /**
     * Verifica si un supervisor esta perforando en un dia
     */
    estaPerforando(cronograma, dia) {
        return dia >= 0 && dia < cronograma.length && cronograma[dia] === Estado.PERFORACION;
    }

    /**
     * Cuenta cuantos de S1 y S3 estan perforando
     */
    contarPerforandoS1S3(dia) {
        let count = 0;
        if (this.estaPerforando(this.s1, dia)) count++;
        if (this.estaPerforando(this.s3, dia)) count++;
        return count;
    }

    /**
     * Genera S2 de forma dinamica para SIEMPRE tener 2 perforando
     */
    generarS2Dinamico() {
        const diaS3Perfora = this.encontrarPrimerDiaS3Perfora();

        let dia = 0;

        while (dia < this.totalDias) {
            if (dia < diaS3Perfora) {
                // Fase 1: Antes de que S3 perfore, S1 y S2 perforando juntos
                this.generarS2FaseInicial(dia, diaS3Perfora);
                dia = diaS3Perfora;
            } else {
                // Fase 2: Despues de que S3 perfore, S2 complementa
                dia = this.generarS2FaseComplemento(dia);
            }
        }
    }

    /**
     * Genera S2 para la fase inicial (antes de que S3 perfore)
     */
    generarS2FaseInicial(diaInicio, diaFin) {
        let dia = diaInicio;

        // Subida
        this.s2[dia] = Estado.SUBIDA;
        dia++;

        // Induccion
        for (let i = 0; i < this.config.diasInduccion; i++) {
            if (dia < diaFin) {
                this.s2[dia] = Estado.INDUCCION;
                dia++;
            }
        }

        // Perforacion hasta diaFin - 1 (para bajar justo antes de que S3 perfore)
        while (dia < diaFin - 1) {
            this.s2[dia] = Estado.PERFORACION;
            dia++;
        }

        // Bajada el dia antes de que S3 perfore
        if (dia < this.s2.length) {
            this.s2[dia] = Estado.BAJADA;
        }
    }

    /**
     * Genera S2 para complementar S1 y S3
     * S2 perfora SOLO cuando S1+S3 tienen menos de 2 perforando
     */
    generarS2FaseComplemento(diaInicio) {
        let dia = diaInicio;

        while (dia < this.totalDias) {
            const countS1S3 = this.contarPerforandoS1S3(dia);

            if (countS1S3 < 2) {
                // S2 debe perforar para completar los 2
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
                // S1 y S3 ya tienen 2, S2 debe NO perforar
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

    /**
     * Ajusta las transiciones de S2 para que sean validas
     */
    ajustarTransicionesS2() {
        for (let dia = 0; dia < this.totalDias; dia++) {
            const estadoActual = this.s2[dia];
            const estadoAnterior = dia > 0 ? this.s2[dia - 1] : Estado.LIBRE;

            // Si empieza a perforar despues de descanso, necesita subida
            if (estadoActual === Estado.PERFORACION && estadoAnterior === Estado.DESCANSO) {
                this.s2[dia - 1] = Estado.SUBIDA;
            }

            // Si pasa de perforacion a descanso, necesita bajada
            if (estadoActual === Estado.DESCANSO && estadoAnterior === Estado.PERFORACION) {
                this.s2[dia] = Estado.BAJADA;
            }
        }
    }

    /**
     * Cuenta cuantos supervisores estan perforando
     */
    contarPerforando(dia) {
        let count = 0;
        if (this.estaPerforando(this.s1, dia)) count++;
        if (this.estaPerforando(this.s2, dia)) count++;
        if (this.estaPerforando(this.s3, dia)) count++;
        return count;
    }

    /**
     * Correccion final para garantizar exactamente 2 perforando
     */
    correccionFinal() {
        const diaInicio = this.encontrarPrimerDiaPerforacionGlobal();

        for (let dia = diaInicio; dia < this.config.diasPerforacionTotal; dia++) {
            const count = this.contarPerforando(dia);

            if (count < 2) {
                // Forzar S2 a perforar
                this.s2[dia] = Estado.PERFORACION;
            } else if (count > 2) {
                // Forzar S2 a no perforar
                if (this.estaPerforando(this.s2, dia)) {
                    this.s2[dia] = Estado.BAJADA;
                }
            }
        }
    }

    /**
     * Elimina perforaciones flash (solo 1 dia de P) - Error E-04
     * Si un supervisor tiene solo 1 dia de P, lo extiende o elimina
     */
    eliminarPerforacionFlash() {
        const cronogramas = [
            { nombre: 's2', cron: this.s2 },
            { nombre: 's3', cron: this.s3 }
        ];
        // No modificamos S1 porque debe mantener su regimen completo

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
                        // Perforacion flash detectada
                        let corregido = false;

                        // Intentar extender hacia adelante primero
                        if (d < this.config.diasPerforacionTotal &&
                            (cron[d] === Estado.BAJADA || cron[d] === Estado.DESCANSO || cron[d] === Estado.LIBRE)) {
                            const countSinEste = this.contarPerforandoSin(d, nombre);
                            if (countSinEste < 2) {
                                cron[d] = Estado.PERFORACION;
                                corregido = true;
                            }
                        }

                        // Si no pudimos extender hacia adelante, intentar hacia atrás
                        if (!corregido && inicioPerf > 0) {
                            const diaAnterior = inicioPerf - 1;
                            if (cron[diaAnterior] === Estado.SUBIDA ||
                                cron[diaAnterior] === Estado.INDUCCION ||
                                cron[diaAnterior] === Estado.DESCANSO) {
                                // Extender hacia atrás convirtiendo en perforación
                                const countSinEste = this.contarPerforandoSin(diaAnterior, nombre);
                                if (countSinEste < 2) {
                                    cron[diaAnterior] = Estado.PERFORACION;
                                    corregido = true;
                                }
                            }
                        }

                        // Si aun no pudimos corregir, la perforación flash 
                        // se mantiene pero será cubierta por otro supervisor
                        if (!corregido) {
                            // El día flash se queda como perforación
                            // La corrección final se encargará de mantener 2 perforando
                        }
                    }
                    enPerforacion = false;
                }
            }
        });
    }

    /**
     * Cuenta perforando excluyendo un supervisor especifico
     */
    contarPerforandoSin(dia, excluir) {
        let count = 0;
        if (excluir !== 's1' && this.estaPerforando(this.s1, dia)) count++;
        if (excluir !== 's2' && this.estaPerforando(this.s2, dia)) count++;
        if (excluir !== 's3' && this.estaPerforando(this.s3, dia)) count++;
        return count;
    }

    /**
     * Genera el cronograma completo
     */
    generar() {
        // 1. Generar S1 (referencia fija)
        this.generarS1();

        // 2. Generar S3 (entra para cubrir cuando S1 baja)
        this.generarS3();

        // 3. Generar S2 dinamicamente
        this.generarS2Dinamico();

        // 4. Ajustar transiciones
        this.ajustarTransicionesS2();

        // 5. Correccion final para garantizar 2 perforando
        this.correccionFinal();

        // 6. Eliminar perforaciones flash (E-04)
        this.eliminarPerforacionFlash();

        // 7. Segunda correccion para mantener 2 perforando despues de eliminar flash
        this.correccionFinal();

        return this.obtenerResultado();
    }

    /**
     * Valida el cronograma
     */
    validar() {
        const violaciones = {
            menosDe2: [],
            masDe2: []
        };

        const diaS3Perfora = this.encontrarPrimerDiaS3Perfora();

        for (let d = diaS3Perfora; d < this.config.diasPerforacionTotal; d++) {
            const count = this.contarPerforando(d);
            if (count < 2) {
                violaciones.menosDe2.push(d);
            } else if (count > 2) {
                violaciones.masDe2.push(d);
            }
        }

        return violaciones;
    }

    /**
     * Obtiene el resultado del cronograma
     */
    obtenerResultado() {
        const diasMostrar = this.config.diasPerforacionTotal;
        const violaciones = this.validar();
        const esValido = violaciones.menosDe2.length === 0 && violaciones.masDe2.length === 0;

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
            validacion: {
                esValido,
                violaciones
            }
        };
    }

    /**
     * Imprime el cronograma en consola (para testing)
     */
    imprimir(diasMostrar = 30) {
        console.log("\n" + "=".repeat(80));
        console.log(`CRONOGRAMA - Regimen ${this.config.diasTrabajo}x${this.config.diasLibresTotal}`);
        console.log(`Induccion: ${this.config.diasInduccion} dias`);
        console.log("=".repeat(80));

        for (let bloque = 0; bloque < diasMostrar; bloque += 15) {
            const fin = Math.min(bloque + 15, diasMostrar);

            // Encabezado
            let header = "Dia |";
            for (let d = bloque; d < fin; d++) {
                header += `${d.toString().padStart(3)} |`;
            }
            console.log("\n" + header);
            console.log("----|" + "----|".repeat(fin - bloque));

            // S1
            let lineS1 = " S1 |";
            for (let d = bloque; d < fin; d++) {
                lineS1 += `  ${this.s1[d]} |`;
            }
            console.log(lineS1);

            // S2
            let lineS2 = " S2 |";
            for (let d = bloque; d < fin; d++) {
                lineS2 += `  ${this.s2[d]} |`;
            }
            console.log(lineS2);

            // S3
            let lineS3 = " S3 |";
            for (let d = bloque; d < fin; d++) {
                lineS3 += `  ${this.s3[d]} |`;
            }
            console.log(lineS3);

            // Contador
            let lineP = " #P |";
            for (let d = bloque; d < fin; d++) {
                lineP += `  ${this.contarPerforando(d)} |`;
            }
            console.log(lineP);
        }

        const violaciones = this.validar();
        console.log("\n" + "-".repeat(40));
        if (violaciones.menosDe2.length === 0 && violaciones.masDe2.length === 0) {
            console.log("[OK] CRONOGRAMA VALIDO: Siempre hay exactamente 2 perforando");
        } else {
            if (violaciones.menosDe2.length > 0) {
                console.log(`[X] Dias con menos de 2 perforando: ${violaciones.menosDe2}`);
            }
            if (violaciones.masDe2.length > 0) {
                console.log(`[X] Dias con mas de 2 perforando: ${violaciones.masDe2}`);
            }
        }
        console.log("-".repeat(40));
    }
}

/**
 * Funcion para generar un cronograma con los parametros dados
 * @param {number} diasTrabajo - Dias de trabajo (N en NxM)
 * @param {number} diasLibresTotal - Dias libres totales (M en NxM)
 * @param {number} diasInduccion - Dias de induccion (1-5)
 * @param {number} diasPerforacionTotal - Total de dias a mostrar
 * @returns {Object} Resultado del cronograma
 */
function generarCronograma(diasTrabajo, diasLibresTotal, diasInduccion, diasPerforacionTotal = 30) {
    const config = new ConfiguracionRegimen(diasTrabajo, diasLibresTotal, diasInduccion, diasPerforacionTotal);
    const generador = new GeneradorCronograma(config);
    return generador.generar();
}

/**
 * Funcion principal para probar las 3 casuisticas
 */
function main() {
    console.log("\n" + "#".repeat(80));
    console.log("# CASUISTICA 1: Regimen 14x7, Induccion 5 dias, 30 dias perforacion");
    console.log("#".repeat(80));

    const config1 = new ConfiguracionRegimen(14, 7, 5, 30);
    const generador1 = new GeneradorCronograma(config1);
    generador1.generar();
    generador1.imprimir(30);

    console.log("\n" + "#".repeat(80));
    console.log("# CASUISTICA 2: Regimen 21x7, Induccion 3 dias, 30 dias perforacion");
    console.log("#".repeat(80));

    const config2 = new ConfiguracionRegimen(21, 7, 3, 30);
    const generador2 = new GeneradorCronograma(config2);
    generador2.generar();
    generador2.imprimir(30);

    console.log("\n" + "#".repeat(80));
    console.log("# CASUISTICA 3: Regimen 10x5, Induccion 2 dias, 30 dias perforacion");
    console.log("#".repeat(80));

    const config3 = new ConfiguracionRegimen(10, 5, 2, 30);
    const generador3 = new GeneradorCronograma(config3);
    generador3.generar();
    generador3.imprimir(30);
}

// Exportar para uso en Node.js o React
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        Estado,
        ConfiguracionRegimen,
        GeneradorCronograma,
        generarCronograma
    };
}

// Ejecutar si se corre directamente
if (typeof require !== 'undefined' && require.main === module) {
    main();
}
