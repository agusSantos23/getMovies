import fetch from 'node-fetch';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

const tmdbApiKey = process.env.TMDB_API_KEY;
const imgbbApiKey = process.env.IMG_BB_API_KEY;

export const fetchData = async (movieId) => {
  try {
    // block the code for 0.5s to 5s, so as not to block the API
    const delay = Math.floor(Math.random() * 5000) + 500;
    await new Promise((resolve) => setTimeout(resolve, delay));

    const response = await fetch(`https://api.themoviedb.org/3/movie/${movieId}?api_key=${tmdbApiKey}&language=en-US`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error obtaining TMDB data:', error);
    throw error;
  }
};

export const uploadImageToImgBB = async (imageBuffer) => {
  try {
    const formData = new FormData();
    formData.append('image', imageBuffer.toString('base64'));
    formData.append('name', 'img');

    const response = await fetch(
      `https://api.imgbb.com/1/upload?key=${imgbbApiKey}`,
      {
        method: 'POST',
        body: formData,
      }
    );

    const data = await response.json();
    if (data && data.data && data.data.url) {
      const parts = data.data.url.split('/');
      if (parts.length >= 5) {
        return parts[3];
      } else {
        console.error('URL de imgBB incompleta:', data.data.url);
        return null;
      }
    } else {
      console.error('Respuesta de imgBB inválida:', data);
      return null;
    }
  } catch (error) {
    console.error('Error al subir la imagen a imgBB:', error);
    return null;
  }
};

export const processAndUploadImage = async (imageUrl) => {
  try {
    const response = await fetch(imageUrl);
    const imageBuffer = await response.arrayBuffer();

    try {
      const processedImage = await sharp(imageBuffer).webp({ quality: 80 }).toBuffer();
      return await uploadImageToImgBB(processedImage);
    } catch (sharpError) {
      console.error('Error al procesar la imagen con sharp:', sharpError);
      return null;
    }
  } catch (error) {
    console.error('Error al obtener la imagen:', error);
    return null;
  }
};

export const saveMovieToDatabase = async (movie) => {
  const connection = await pool.getConnection(); 
  const movieId = uuidv4();

  let posterId = null;
  let backdropId = null;

  try {
    if (movie.poster_path !== undefined && movie.poster_path !== null) {
      setTimeout(async () => {
        posterId = await processAndUploadImage(`https://image.tmdb.org/t/p/w500/${movie.poster_path}`);
      }, Math.floor(Math.random() * 1000) + 100);
      
    }
  } catch (error) {
    console.error('Error when processing poster:', error);
  }

  try {
    if (movie.backdrop_path !== undefined && movie.backdrop_path !== null) {
      setTimeout(async() => {
        backdropId = await processAndUploadImage(`https://image.tmdb.org/t/p/w500/${movie.backdrop_path}`);
      }, Math.floor(Math.random() * 5000) + 100);
      
    }
  } catch (error) {
    console.error('Backdrop process error:', error);
  }


  await connection.execute(
    'INSERT IGNORE INTO movies (id, title, original_title, overview, original_language, score, release_date, budget, revenue, runtime, status, tagline, poster_id, backdrop_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
    [
      movieId,
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

  return movieId;
};

export const saveGenreToDatabase = async (name) => {
  const connection = await pool.getConnection(); 
  const genreId = uuidv4();
  try {

    await connection.execute('INSERT IGNORE INTO genres (id, name, created_at, updated_at) VALUES (?, ?, NOW(), NOW())', [genreId, name]);

    return genreId;
    
  } catch (error) {
    console.error('Error by saving gender:', error);
    throw error; 
  }

  
};

export const saveMovieGenreRelation = async (movieId, genreId) => {
  const connection = await pool.getConnection(); 
  try {
    await connection.execute('INSERT IGNORE INTO movie_genres (movie_id, genre_id) VALUES (?, ?)', [movieId, genreId]);
  } catch (error) {
    console.error('Error by saving the film-gender relationship:', error);
    throw error; 
  }
};