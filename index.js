import express from 'express';
import moviesRouter from './movies.js';

const app = express();
const port = 3000;

app.use(express.json());

app.use('/', moviesRouter); 

app.listen(port, () => {
  console.log(`Servidor Express escuchando en http://localhost:${port}`);
});