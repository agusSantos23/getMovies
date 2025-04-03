import express from 'express';
import moviesRouter from './movies.js';
import pool from './utils/db.js'; 

const app = express();
const port = 3000;

app.use(express.json());

app.use('/', moviesRouter); 

app.listen(port, async () => {

  try {
    await pool.getConnection();
    console.log('Connection to the correctly established database.');
  } catch (error) {
    console.error('Error connecting to the database:', error);
    process.exit(1); 
  }
  console.log(`Servidor Express escuchando en http://localhost:${port}`);
});