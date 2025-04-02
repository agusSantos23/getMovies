import express from 'express';
import { fetchData, processAndUploadImage } from './utils/apiMovies.js';
import pool from './utils/db.js';

process.loadEnvFile()

const router = express.Router();
console.log("aqui", process.env.TMDB_API_KEY);

const getMovieDetails = async (movieId) => {
  
  return fetchData(
    `https://api.themoviedb.org/3/movie/${movieId}?api_key=${process.env.TMDB_API_KEY}&language=en-US`
  );
};

const saveMovieToDatabase = async (movie) => {
  const connection = await pool.getConnection();
  console.log(movie);
  
  const posterId = await processAndUploadImage(
    `https://image.tmdb.org/t/p/w500/${movie.poster_path}`
  );
  const backdropId = await processAndUploadImage(
    `https://image.tmdb.org/t/p/w500/${movie.backdrop_path}`
  );

  await connection.execute(
    'INSERT IGNORE INTO movies (id, title, original_title, overview, original_language, score, release_date, budget, revenue, runtime, status, tagline, poster_id, backdrop_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
    [
      movie.id,
      movie.title,
      movie.original_title,
      movie.overview,
      movie.original_language,
      movie.vote_average,
      movie.release_date,
      movie.budget,
      movie.revenue,
      movie.runtime,
      'enabled',
      movie.tagline,
      posterId,
      backdropId,
    ]
  );

  connection.release();
};

const getNext20Movies = async (startMovieId) => {
  const movies = [];
  let currentMovieId = startMovieId;

  for (let i = 0; i < 2; i++) {
    try {
      const movieDetails = await getMovieDetails(currentMovieId);
      movies.push(movieDetails);
      currentMovieId++;
    } catch (error) {
      console.error(`Error al obtener la película con ID ${currentMovieId}:`, error);
      currentMovieId++;
    }
  }

  return movies;
};

router.post('/getM', async (req, res) => {
  try {
    const movieIds = req.body.movieIds;

    if (!movieIds || !Array.isArray(movieIds)) {
      return res.status(400).json({ error: 'Se requiere un array de IDs de películas.' });
    }

    const allMovies = [];

    for (const startMovieId of movieIds) {
      const next20Movies = await getNext20Movies(startMovieId);
      allMovies.push(...next20Movies);
    }

    for (const movie of allMovies) {
      if (movie) {
        await saveMovieToDatabase(movie);
      }
    }

    res.json({ message: 'Películas obtenidas y guardadas correctamente.' });
  } catch (error) {
    console.error('Error en la ruta /movies/getM:', error);
    res.status(500).json({ error: 'Error al obtener y guardar películas.' });
  }
});

export default router;