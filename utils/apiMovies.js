import fetch from 'node-fetch';
import sharp from 'sharp';
process.loadEnvFile()

const tmdbApiKey = process.env.TMDB_API_KEY;
const imgbbApiKey = process.env.IMG_BB_API_KEY;

// Funciones auxiliares para TMDB
export const fetchData = async (url) => {
  try {
    // Retraso aleatorio entre 3 y 8 segundos (3000-8000 milisegundos)
    const delay = Math.floor(Math.random() * 5000) + 3000;
    await new Promise(resolve => setTimeout(resolve, delay));

    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error al obtener datos de TMDB:', error);
    throw error;
  }
};

// Funciones auxiliares para imgBB
export const uploadImageToImgBB = async (imageBuffer) => {
  const formData = new FormData();
  formData.append('image', imageBuffer.toString('base64'));

  const response = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbApiKey}`, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();
  return data.data.id;
};

export const processAndUploadImage = async (imageUrl) => {
  try {
    const response = await fetch(imageUrl);
    const imageBuffer = await response.arrayBuffer();
    const processedImage = await sharp(imageBuffer).webp({ quality: 80 }).toBuffer();
    return uploadImageToImgBB(processedImage);
  } catch (error) {
    console.error('Error al procesar y subir imagen:', error);
    return null;
  }
};