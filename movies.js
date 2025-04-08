import express from 'express';
import { fetchData, saveMovieToDatabase, saveGenreToDatabase, saveMovieGenreRelation, processAndUploadImage } from './utils/apiMovies.js';
import pool from './utils/db.js';

process.loadEnvFile();

const router = express.Router();

const processGenres = async (genresMovie, dbMovieId, connection) => {

  if (genresMovie && genresMovie.length > 0) {

    console.log('Genres of the film:', genresMovie);
    console.log('Genres of the film:', dbMovieId);

    for (const genre of genresMovie) {

      try {
        let dbGenreId;
        console.log('Processing gender:', genre.name);
        const [existingGenre] = await connection.execute('SELECT id FROM genres WHERE name = ?', [genre.name]);

        if (existingGenre.length > 0) {
          dbGenreId = existingGenre[0].id;
          console.log(`Gender "${genre.name}" already exists with ID:`, dbGenreId);
        } else {
          dbGenreId = await saveGenreToDatabase(genre.name, connection);
          console.log(`Gender "${genre.name}" saved with ID:`, dbGenreId);

          
        }

        console.log(`Relationship: ID movie: ${dbMovieId}, Gender ID: ${dbGenreId}`);
        await saveMovieGenreRelation(dbMovieId, dbGenreId, connection);
        console.log('Saved relationship.');
        
      } catch (error) {
        console.error('Error al procesar el género:', error);
        throw error;
      }
    }

  }
};

const getNextMoreMovies = async (startMovieId, size) => {
  const connection = await pool.getConnection();
  let currentMovieId = startMovieId;
  let fetchedCount = 0;

  try {
    await connection.beginTransaction();

    while (fetchedCount < size) {
      console.log("fetchedCount:", fetchedCount);

      try {

        let movieDetails = await fetchData(currentMovieId);


        if (!movieDetails || movieDetails.adult || (movieDetails.title === undefined && !movieDetails.success)) {
          currentMovieId++;
          continue;
        }

        console.log("Film:", movieDetails.title);
        const [existingMovie] = await connection.execute('SELECT id FROM movies WHERE title = ?', [movieDetails.title]);

        if (existingMovie.length > 0) {
          console.log(`The movie ${movieDetails.title} already exists.`);
          currentMovieId++;
          continue;
        } else {
          console.log('Keeping movie:', movieDetails.title);
          const dbMovieId = await saveMovieToDatabase(movieDetails, connection);
          
          if (dbMovieId) {
            await processGenres(movieDetails.genres, dbMovieId, connection);
            console.log(`Genres processed for the film: ${movieDetails.title}`);
          }
          
          fetchedCount++;

          console.log("next");
          
        }
      } catch (error) {
        console.error(`Error processing movie with ID ${currentMovieId}:`, error);
        throw error;
      } finally {
        currentMovieId++;
      }
    }

    await connection.commit();
    console.log('Completed transaction for 20 movies.');

  } catch (error) {
    await connection.rollback();
    console.error('Transaction rollback due to an error:', error);
  } finally {
    connection.release();
  }

  return;
};

router.post('/getM', async (req, res) => {
  try {
    const movieIds = req.body.movieIds;
    const delayBetweenBatches = 5000;

    if (!movieIds || !Array.isArray(movieIds)) {
      return res.status(400).json({ error: 'An array of film IDs is required.' });
    }

    console.log(`Processing movie IDs: ${movieIds}`);

    for (const startMovieId of movieIds) {
      await getNextMoreMovies(startMovieId, 5);

      console.log(`Waiting ${delayBetweenBatches / 1000} seconds before processing the next batch.`);
      await new Promise((resolve) => setTimeout(resolve, delayBetweenBatches));
    }
    

    res.json({ message: 'Films and genres obtained and saved correctly in batches.' });

  } catch (error) {
    console.error('Route /getm error:', error);
    res.status(500).json({ error: 'Error obtaining and saving movies and genres in batches.' });
  }
});

export default router;