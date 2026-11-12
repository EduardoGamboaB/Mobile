import fs from 'node:fs';
import path from 'node:path';
import type { Slide } from '../components/Carousel';

// Imágenes de dominio público / CC0 (Wikimedia Commons).
// Fuente y licencia de cada una: public/img/carrusel/CREDITOS.md
const img = (slug: string, width: number, height: number) => ({
  src: `/img/carrusel/${slug}.jpg`,
  srcSmall: `/img/carrusel/${slug}-640.jpg`,
  width,
  height,
});

const ALL: Slide[] = [
  {
    ...img('carretera', 1280, 853),
    alt: 'Tractocamión blanco circulando por una carretera de montaña',
    title: 'Flota propia en carretera',
    text: 'Unidades y operadores de G3 en rutas nacionales, con fecha de entrega comprometida.',
  },
  {
    ...img('puerto', 1280, 853),
    alt: 'Vista aérea de una terminal de contenedores con grúas y contenedores apilados',
    title: 'Conexión con puertos',
    text: 'Movemos tu carga desde y hacia los principales puertos del Pacífico.',
  },
  {
    ...img('reparto', 860, 853),
    alt: 'Camión de carga circulando por una calle de la ciudad al amanecer',
    title: 'Entregas a tiempo',
    text: 'Coordinamos citas de carga y descarga con tu almacén, planta o cliente final.',
  },
  {
    ...img('contenedores', 1280, 853),
    alt: 'Patio portuario con grúas y largas filas de contenedores',
    title: 'Logística a la medida',
    text: 'Diseñamos rutas, frecuencias y tipo de unidad a partir de tu operación.',
  },
  {
    ...img('seguimiento', 1280, 912),
    alt: 'Computadora portátil mostrando gráficas e indicadores',
    title: 'Seguimiento de cada etapa',
    text: 'Estatus, ubicación y evidencias de tu viaje de la recolección a la entrega.',
  },
];

// Solo se publican las diapositivas cuya imagen existe en public/ (se
// evalúa al compilar, el sitio es estático).
export const SLIDES: Slide[] = ALL.filter((s) =>
  fs.existsSync(path.join(process.cwd(), 'public', s.src)),
);
