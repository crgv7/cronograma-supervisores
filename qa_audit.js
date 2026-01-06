/**
 * QA Test Suite - Auditoría del Algoritmo de Cronogramas Mineros
 * Ejecuta pruebas exhaustivas según el protocolo rulesQA
 */

const {
    Estado,
    ConfiguracionRegimen,
    GeneradorCronograma,
    generarCronograma
} = require('./cronograma.js');

// ============================================================================
// DEFINICIÓN DE ERRORES
// ============================================================================
const ERRORES = {
    'E-01': { desc: 'Tres supervisores perforando simultaneamente', puntos: -20 },
    'E-02': { desc: 'Solo un supervisor perforando tras entrada de S3', puntos: -20 },
    'E-03': { desc: 'Patron de viaje invalido (S-S o S-B)', puntos: -15 },
    'E-04': { desc: 'Perforacion flash (solo 1 dia de P)', puntos: -15 },
    'E-05': { desc: 'S1 no cumple su regimen completo', puntos: -30 }
};

// ============================================================================
// FUNCIONES DE VALIDACIÓN
// ============================================================================

/**
 * A. Análisis de Integridad por Día (Contador de P)
 * Para cada día i desde que S3 entra en el sistema: Count(P) = 2
 */
function validarContadorP(resultado) {
    const errores = [];
    const { s1, s2, s3 } = resultado.cronogramas;

    // Encontrar día en que S3 empieza a perforar
    let diaS3Perfora = -1;
    for (let d = 0; d < s3.length; d++) {
        if (s3[d] === Estado.PERFORACION) {
            diaS3Perfora = d;
            break;
        }
    }

    if (diaS3Perfora === -1) {
        return { valido: false, errores: ['S3 nunca perfora'], diasFalla: [] };
    }

    const diasMenosDe2 = [];
    const diasMasDe2 = [];

    for (let d = diaS3Perfora; d < s1.length; d++) {
        let count = 0;
        if (s1[d] === Estado.PERFORACION) count++;
        if (s2[d] === Estado.PERFORACION) count++;
        if (s3[d] === Estado.PERFORACION) count++;

        if (count < 2) {
            diasMenosDe2.push(d);
            errores.push({ dia: d, count, tipo: 'E-02' });
        } else if (count > 2) {
            diasMasDe2.push(d);
            errores.push({ dia: d, count, tipo: 'E-01' });
        }
    }

    return {
        valido: errores.length === 0,
        diasMenosDe2,
        diasMasDe2,
        errores,
        diaS3Perfora
    };
}

/**
 * B. Validación de Ciclo de Vida S1 (Inmutabilidad)
 * S1 debe mantener N días trabajo + M días libres exacto
 */
function validarCicloS1(resultado, config) {
    const { s1 } = resultado.cronogramas;
    const errores = [];

    // Verificar estructura del primer ciclo
    let dia = 0;
    let ciclo = 0;

    while (dia < s1.length - 10) { // margen para ciclo incompleto al final
        const inicioCliclo = dia;
        const esPromerCiclo = ciclo === 0;

        // Subida (1 día)
        if (s1[dia] !== Estado.SUBIDA) {
            errores.push({ dia, esperado: 'S', recibido: s1[dia], ciclo });
        }
        dia++;

        // Inducción (solo primer ciclo)
        if (esPromerCiclo) {
            for (let i = 0; i < config.diasInduccion; i++) {
                if (dia < s1.length && s1[dia] !== Estado.INDUCCION) {
                    errores.push({ dia, esperado: 'I', recibido: s1[dia], ciclo });
                }
                dia++;
            }
        }

        // Perforación
        const diasPerfEsperados = esPromerCiclo
            ? config.diasTrabajo - config.diasInduccion - 1
            : config.diasTrabajo - 1;

        for (let i = 0; i < diasPerfEsperados; i++) {
            if (dia < s1.length && s1[dia] !== Estado.PERFORACION) {
                errores.push({ dia, esperado: 'P', recibido: s1[dia], ciclo });
            }
            dia++;
        }

        // Bajada (1 día)
        if (dia < s1.length && s1[dia] !== Estado.BAJADA) {
            errores.push({ dia, esperado: 'B', recibido: s1[dia], ciclo });
        }
        dia++;

        // Descanso (M - 2 días)
        const diasDescanso = config.diasLibresTotal - 2;
        for (let i = 0; i < diasDescanso; i++) {
            if (dia < s1.length && s1[dia] !== Estado.DESCANSO) {
                errores.push({ dia, esperado: 'D', recibido: s1[dia], ciclo });
            }
            dia++;
        }

        ciclo++;
        if (ciclo > 50) break; // Prevenir loop infinito
    }

    return {
        valido: errores.length === 0,
        errores,
        ciclosVerificados: ciclo
    };
}

/**
 * C. Detección de Patrones Prohibidos
 * - S-S (subidas consecutivas)
 * - S-B (subida seguida de bajada)
 * - Solo 1 día de P (perforación flash)
 */
function validarPatronesProhibidos(resultado) {
    const errores = [];

    ['s1', 's2', 's3'].forEach(nombre => {
        const cronograma = resultado.cronogramas[nombre];

        for (let d = 0; d < cronograma.length - 1; d++) {
            const actual = cronograma[d];
            const siguiente = cronograma[d + 1];

            // S-S (subidas consecutivas)
            if (actual === Estado.SUBIDA && siguiente === Estado.SUBIDA) {
                errores.push({
                    supervisor: nombre.toUpperCase(),
                    dia: d,
                    patron: 'S-S',
                    tipo: 'E-03'
                });
            }

            // S-B (subida seguida de bajada)
            if (actual === Estado.SUBIDA && siguiente === Estado.BAJADA) {
                errores.push({
                    supervisor: nombre.toUpperCase(),
                    dia: d,
                    patron: 'S-B',
                    tipo: 'E-03'
                });
            }
        }

        // Perforación flash (solo 1 día de P)
        let enPerforacion = false;
        let inicioPerf = -1;

        for (let d = 0; d <= cronograma.length; d++) {
            const actual = d < cronograma.length ? cronograma[d] : null;

            if (actual === Estado.PERFORACION && !enPerforacion) {
                enPerforacion = true;
                inicioPerf = d;
            } else if (actual !== Estado.PERFORACION && enPerforacion) {
                const diasPerf = d - inicioPerf;
                if (diasPerf === 1) {
                    errores.push({
                        supervisor: nombre.toUpperCase(),
                        dia: inicioPerf,
                        diasPerforacion: 1,
                        tipo: 'E-04'
                    });
                }
                enPerforacion = false;
            }
        }
    });

    return {
        valido: errores.length === 0,
        errores
    };
}

/**
 * Ejecuta todas las validaciones para un caso de prueba
 */
function ejecutarAuditoria(nombre, diasTrabajo, diasLibres, diasInduccion, diasPerforacion) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`AUDITORIA: ${nombre}`);
    console.log(`Regimen ${diasTrabajo}x${diasLibres}, Induccion ${diasInduccion} dias, ${diasPerforacion} dias`);
    console.log('='.repeat(80));

    const config = { diasTrabajo, diasLibres, diasInduccion, diasPerforacion };
    const resultado = generarCronograma(diasTrabajo, diasLibres, diasInduccion, diasPerforacion);

    const erroresEncontrados = [];

    // A. Validar Contador P
    console.log('\n[A] VALIDACION CONTADOR P (exactamente 2 perforando)');
    const validacionP = validarContadorP(resultado);
    if (validacionP.valido) {
        console.log('    [OK] Siempre hay exactamente 2 supervisores perforando');
    } else {
        if (validacionP.diasMenosDe2.length > 0) {
            console.log(`    [FALLO E-02] Dias con menos de 2: ${validacionP.diasMenosDe2.slice(0, 10).join(', ')}${validacionP.diasMenosDe2.length > 10 ? '...' : ''}`);
            erroresEncontrados.push('E-02');
        }
        if (validacionP.diasMasDe2.length > 0) {
            console.log(`    [FALLO E-01] Dias con mas de 2: ${validacionP.diasMasDe2.slice(0, 10).join(', ')}${validacionP.diasMasDe2.length > 10 ? '...' : ''}`);
            erroresEncontrados.push('E-01');
        }
    }

    // B. Validar Ciclo S1
    console.log('\n[B] VALIDACION INMUTABILIDAD S1 (ciclo NxM)');
    const validacionS1 = validarCicloS1(resultado, {
        diasTrabajo,
        diasLibresTotal: diasLibres,
        diasInduccion
    });
    if (validacionS1.valido) {
        console.log(`    [OK] S1 mantiene su regimen completo (${validacionS1.ciclosVerificados} ciclos verificados)`);
    } else {
        console.log(`    [FALLO E-05] Errores en ciclo S1: ${validacionS1.errores.length}`);
        validacionS1.errores.slice(0, 5).forEach(e => {
            console.log(`        Dia ${e.dia}: esperado '${e.esperado}', recibido '${e.recibido}'`);
        });
        erroresEncontrados.push('E-05');
    }

    // C. Validar Patrones Prohibidos
    console.log('\n[C] VALIDACION PATRONES PROHIBIDOS (S-S, S-B, P flash)');
    const validacionPatrones = validarPatronesProhibidos(resultado);
    if (validacionPatrones.valido) {
        console.log('    [OK] No se encontraron patrones prohibidos');
    } else {
        const patronesSS = validacionPatrones.errores.filter(e => e.patron === 'S-S');
        const patronesSB = validacionPatrones.errores.filter(e => e.patron === 'S-B');
        const flash = validacionPatrones.errores.filter(e => e.tipo === 'E-04');

        if (patronesSS.length > 0) {
            console.log(`    [FALLO E-03] Patron S-S encontrado ${patronesSS.length} veces`);
            erroresEncontrados.push('E-03');
        }
        if (patronesSB.length > 0) {
            console.log(`    [FALLO E-03] Patron S-B encontrado ${patronesSB.length} veces`);
            if (!erroresEncontrados.includes('E-03')) erroresEncontrados.push('E-03');
        }
        if (flash.length > 0) {
            console.log(`    [FALLO E-04] Perforacion flash encontrada ${flash.length} veces`);
            flash.slice(0, 3).forEach(e => {
                console.log(`        ${e.supervisor} dia ${e.dia}: solo 1 dia de perforacion`);
            });
            erroresEncontrados.push('E-04');
        }
    }

    return {
        nombre,
        config,
        erroresEncontrados,
        detalles: { validacionP, validacionS1, validacionPatrones }
    };
}

// ============================================================================
// EJECUCIÓN DE PRUEBAS
// ============================================================================

console.log('\n' + '#'.repeat(80));
console.log('# QA AUDIT REPORT - Algoritmo de Cronogramas Mineros');
console.log('# QA Engineer: Senior Drilling Schedule Specialist');
console.log('# Fecha: ' + new Date().toISOString().split('T')[0]);
console.log('#'.repeat(80));

const resultados = [];

// Caso 1: Régimen 14x7 (Inducción 5) - 90 días
resultados.push(ejecutarAuditoria('Caso 1', 14, 7, 5, 90));

// Caso 2: Régimen 21x7 (Inducción 3) - 90 días
resultados.push(ejecutarAuditoria('Caso 2', 21, 7, 3, 90));

// Caso 3: Régimen 10x5 (Inducción 2) - 90 días
resultados.push(ejecutarAuditoria('Caso 3', 10, 5, 2, 90));

// Caso 4: Régimen 14x6 (Inducción 4) - 950 días (Escalabilidad)
resultados.push(ejecutarAuditoria('Caso 4 (Escalabilidad)', 14, 6, 4, 950));

// ============================================================================
// RESUMEN Y PUNTUACIÓN
// ============================================================================

console.log('\n' + '='.repeat(80));
console.log('RESUMEN DE AUDITORIA');
console.log('='.repeat(80));

let puntajeTotal = 100;
const erroresUnicos = new Set();

resultados.forEach(r => {
    console.log(`\n${r.nombre}: ${r.erroresEncontrados.length === 0 ? '[APROBADO]' : '[FALLO]'}`);
    r.erroresEncontrados.forEach(e => {
        console.log(`  - ${e}: ${ERRORES[e].desc}`);
        erroresUnicos.add(e);
    });
});

// Calcular puntaje
erroresUnicos.forEach(e => {
    puntajeTotal += ERRORES[e].puntos;
});

console.log('\n' + '-'.repeat(80));
console.log('TABLA DE EVALUACION (100 pts)');
console.log('-'.repeat(80));
console.log('Criterio                                          | Estado    | Puntos');
console.log('-'.repeat(80));

const criterios = [
    { id: 'E-01', criterio: 'No 3 supervisores perforando simultaneamente', puntos: 20 },
    { id: 'E-02', criterio: 'No menos de 2 perforando tras entrada S3', puntos: 20 },
    { id: 'E-03', criterio: 'Sin patrones invalidos (S-S, S-B)', puntos: 15 },
    { id: 'E-04', criterio: 'Sin perforacion flash (1 dia)', puntos: 15 },
    { id: 'E-05', criterio: 'S1 cumple regimen completo', puntos: 30 }
];

criterios.forEach(c => {
    const fallo = erroresUnicos.has(c.id);
    const estado = fallo ? 'FALLO' : 'OK';
    const pts = fallo ? 0 : c.puntos;
    console.log(`${c.criterio.padEnd(50)}| ${estado.padEnd(10)}| ${pts}/${c.puntos}`);
});

console.log('-'.repeat(80));
console.log(`PUNTAJE FINAL: ${Math.max(0, puntajeTotal)}/100 puntos`);
console.log('='.repeat(80));

if (puntajeTotal >= 90) {
    console.log('\n[EXCELENTE] El algoritmo cumple con los estandares de calidad.');
} else if (puntajeTotal >= 70) {
    console.log('\n[ACEPTABLE] El algoritmo tiene areas de mejora.');
} else {
    console.log('\n[CRITICO] El algoritmo requiere correcciones urgentes.');
}
