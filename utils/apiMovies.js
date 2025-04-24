import fetch from 'node-fetch';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

process.loadEnvFile();


const tmdbApiKey = process.env.TMDB_API_KEY;
const imgbbApiKey = process.env.IMG_BB_API_KEY;

export const fetchData = async (movieId) => {
  try {
    const delay = Math.floor(Math.random() * 5000) + 2000;
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

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbApiKey}`,
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
        return null;
      }

    } else {
      console.error('INVALID IMGBB RESPONSE:', data);
      return null;
    }
  } catch (error) {
    console.error('Error when IMGBB image upload:', error);
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
      console.error('Error when processing the image with Sharp:', sharpError);
      return null;
    }
  } catch (error) {
    console.error('Error obtaining the image:', error);
    return null;
  }
};

export const saveMovieToDatabase = async (movie, connection) => {
  
  const movieId = uuidv4();
  let posterId = null;
  let backdropId = null;
  console.log("movie start save img");
  
  try {
    if (movie.poster_path !== undefined && movie.poster_path !== null) {
      posterId = await processAndUploadImage(`https://image.tmdb.org/t/p/w500/${movie.poster_path}`);
    }
  } catch (error) {
    console.error('Error when processing poster:', error);
  }

  try {
    if (movie.backdrop_path !== undefined && movie.backdrop_path !== null) {
      backdropId = await processAndUploadImage(`https://image.tmdb.org/t/p/w500/${movie.backdrop_path}`);
    }
  } catch (error) {
    console.error('Backdrop process error:', error);
  }

  try {
    console.log("movie start save data");

    const [result] = await connection.execute(
      'INSERT INTO movies (id, title, original_title, overview, original_language, score, release_date, budget, revenue, runtime, status, poster_id, backdrop_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
      [movieId, movie.title, movie.original_title, movie.overview, movie.original_language, movie.vote_average, movie.release_date || null, movie.budget, movie.revenue, movie.runtime, 'enabled', posterId, backdropId]
    );
  
    console.log('Resultado de la inserción:', result);
  
    if (result.affectedRows > 0) {
      console.log(`Movie "${movie.title}" Saved correctly with ID: ${movieId}`);
      return movieId;
    } else {
      console.log(`La película "${movie.title}" ya existía o no se pudo guardar.`);
    }
    
  } catch (error) {
    console.error('Movie save error:', error);

  }
    

};

export const saveGenreToDatabase = async (name, connection) => {
  const genreId = uuidv4();
  try {
    await connection.execute('INSERT IGNORE INTO genres (id, name, created_at, updated_at) VALUES (?, ?, NOW(), NOW())', [genreId, name]);
    return genreId;
  } catch (error) {
    console.error('Error by saving gender:', error);
    throw error;
  }
};

export const saveMovieGenreRelation = async (movieId, genreId, connection) => {
  console.log('saveMovieGenreRelation', movieId, genreId);

  console.log('connection');
  
  try {
    await connection.execute('INSERT IGNORE INTO movie_genres (movie_id, genre_id) VALUES (?, ?)', [movieId, genreId]);
  } catch (error) {
    console.error('Error by saving the film-gender relationship:', error);
    throw error;
  }
};