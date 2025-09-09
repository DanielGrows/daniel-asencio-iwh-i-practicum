
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();

// ----- Vista y estáticos
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ----- Config API HubSpot
const PRIVATE_APP_ACCESS = process.env.HUBSPOT_PRIVATE_APP_TOKEN || '';
const OBJECT_ID = process.env.CUSTOM_OBJECT_ID; 

// Internal names reales (en minúsculas)
const PROP_NAME = process.env.PROP_NAME || 'pet_name';
const PROP_TYPE = process.env.PROP_TYPE || 'type_of_pet';
const PROP_GENRE = process.env.PROP_GENRE || 'genre';
const PROP_AGE = process.env.PROP_AGE || 'age';
const PROP_COLOR = process.env.PROP_COLOR || 'color';

const hubspot = axios.create({
  baseURL: 'https://api.hubapi.com',
  headers: {
    Authorization: `Bearer ${PRIVATE_APP_ACCESS}`,
    'Content-Type': 'application/json'
  },
  timeout: 15000
});

// =====================================================
// ROUTE 1: Homepage "/" → lista registros de Pets
// =====================================================
app.get('/', async (req, res) => {
  try {
    const params = {
      properties: [PROP_NAME, PROP_TYPE, PROP_GENRE, PROP_AGE, PROP_COLOR].join(','),
      limit: 100,
      archived: false
    };

    const { data } = await hubspot.get(`/crm/v3/objects/${OBJECT_ID}`, { params });

    const rows = (data.results || []).map(r => ({
      id: r.id,
      pet_name: r.properties?.[PROP_NAME] || '',
      type_of_pet: r.properties?.[PROP_TYPE] || '',
      genre: r.properties?.[PROP_GENRE] || '',
      age: r.properties?.[PROP_AGE] || '',
        color: r.properties?.[PROP_COLOR] || ''
    }));

    res.render('homepage', {
      title: 'Pets List',
      columns: ['Name', 'Type of Pet', 'Genre', 'Age', 'Color'],
      rows
    });
  } catch (error) {
    console.error(error?.response?.data || error.message);
    res.status(500).send('Error loading Pets from HubSpot. Revisa tu .env, permisos y objectTypeId.');
  }
});

// ====================================================================
// ROUTE 2: Formulario GET "/update-cobj" → crear nuevo Pet
// ====================================================================
app.get('/update-cobj', (req, res) => {
  res.render('updates', {
    title: 'Add a Pet | Practicum',
    labels: {
      pet_name: 'Name',         // Label visible
      type_of_pet: 'Type of Pet',
      genre: 'Genre',
      age: 'Age',
      color: 'Color'
    },
    action: '/update-cobj'
  });
});

// ==================================================================================
// ROUTE 3: Formulario POST "/update-cobj" → crea registro y redirige al homepage
// ==================================================================================
app.post('/update-cobj', async (req, res) => {
  try {
    const { pet_name, type_of_pet, genre, age, color } = req.body;

    const payload = {
      properties: {
        [PROP_NAME]: pet_name,
        [PROP_TYPE]: type_of_pet,
        [PROP_GENRE]: genre,
        [PROP_AGE]: age,
        [PROP_COLOR]: color
      }
    };

    await hubspot.post(`/crm/v3/objects/${OBJECT_ID}`, payload);

    res.redirect('/');
  } catch (error) {
    console.error('HubSpot error:', error?.response?.data || error.message);
    res.status(500).send('Error creating Pet in HubSpot. Verifica internal names.');
  }
});

// * Localhost
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on http://localhost:${port}`));
