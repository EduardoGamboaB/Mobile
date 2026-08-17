import { createApp } from './app';

const PORT = parseInt(process.env.PORT ?? '3000', 10);
const DB_PATH = process.env.DB_PATH ?? './data/pos-sync.db';
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.warn(
    '⚠️  API_KEY no definida: el servicio aceptará peticiones sin autenticación. ' +
      'Define API_KEY en producción.',
  );
}

const { app } = createApp({ dbPath: DB_PATH, apiKey: API_KEY });

app.listen(PORT, () => {
  console.log(`g3-pos-backend escuchando en :${PORT} · DB: ${DB_PATH}`);
});
