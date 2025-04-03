import express from 'express';
import { fetchData, saveMovieToDatabase, saveGenreToDatabase, saveMovieGenreRelation} from './utils/apiMovies.js';
import pool from './utils/db.js';

process.loadEnvFile();

const router = express.Router();



const processGenres = async (genresMovie, dbMovieId) => {
  const connection = await pool.getConnection(); 

  if (genresMovie && genresMovie.length > 0) {

    console.log('Genres of the film:', genresMovie);

    for (const genre of genresMovie) {
      try {
        let dbGenreId;

        console.log('Processing gender:', genre.name);

        const [existingGenre] = await connection.execute('SELECT id FROM genres WHERE name = ?',[genre.name]);

        if (existingGenre.length > 0) {
          //Get Id
          dbGenreId = existingGenre[0].id;
          console.log(`Gender "${genre.name}" already exists with ID:`, dbGenreId);

        } else {
          //Save and Get Id
          dbGenreId = await saveGenreToDatabase(genre.name, connection);
          console.log(`Gender "${genre.name}" saved with ID:`, dbGenreId);

        }

        console.log(`Relationship: ID movie: ${dbMovieId}, Gender ID: ${dbGenreId}`);

        await saveMovieGenreRelation(dbMovieId, dbGenreId);

        console.log('Saved relationship.');
      } catch (error) {
        console.error('Error al procesar el género:', error);
        throw error;
      }
    }
  }
};

const getNext20Movies = async (startMovieId) => {
  const connection = await pool.getConnection(); 
  const movies = [];
  let currentMovieId = startMovieId;
  let fetchedCount = 0;

  try {
    await connection.beginTransaction(); 

    while (movies.length < 20) {
      try {
        const movieDetails = fetchData(currentMovieId);

        if ( !movieDetails || movieDetails.adult || (movieDetails.title === undefined && !movieDetails.success) ) {
          currentMovieId++;
          continue;
        }

        console.log("Film:", movieDetails.title);

        const [existingMovie] = await connection.execute('SELECT id FROM movies WHERE title = ?',[movieDetails.title]);

        if (existingMovie.length > 0) {

          console.log(`The movie ${movieDetails.title} already exists.`);
          currentMovieId++;
          continue;

        } else {
          console.log('Keeping movie:', movieDetails.title);
          const dbMovieId = await saveMovieToDatabase(movieDetails); 

          await processGenres(movieDetails.genre, dbMovieId);

          console.log(`Genres processed for the film: ${movieDetails.title}`);

          movies.push(movieDetails);
          fetchedCount++;
          console.log(`Movie and generos aggregates: ${movieDetails.title}`);
        }
      } catch (error) {
        console.error(`Error al obtener o guardar la película con ID ${currentMovieId}:`,error);
        throw error; 

      } finally {
        currentMovieId++;
      }
    }

    await connection.commit();
    console.log('Completed transaction.');

  } catch (error) {
    await connection.rollback(); 
    console.error('Reversal transaction due to an error:', error);
  } finally {
    connection.release(); 
  }

  return movies;
};

router.post('/getM', async (req, res) => {
  try {
    const movieIds = req.body.movieIds;

    if (!movieIds || !Array.isArray(movieIds)) {
      return res.status(400).json({ error: 'An array of films IDS is required.' });
    }

    for (const startMovieId of movieIds) {
      await getNext20Movies(startMovieId);
    }

    res.json({ message: 'Films and genres obtained and saved correctly.' });

  } catch (error) {
    console.error('Route /getm error:', error);
    res.status(500).json({ error: 'Error obtaining and saving movies and genres.' });
  }
});

export default router;