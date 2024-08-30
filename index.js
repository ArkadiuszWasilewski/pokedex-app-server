const express = require('express');
const app = express();
const Database = require('nedb');
const fetch = require('node-fetch');

// Creating new database for pokemon data (in-memory usage)
const database = new Database('database.db');
database.loadDatabase();

const pokeAPIUrl = `https://pokeapi.co/api/v2/pokemon?offset=0&limit=750`;

app.listen(3000, () => {
    console.log("Listening at port 3000...");
})
app.use(express.json({limit: '1mb'}));

app.get('/', (req, res) => {
    console.log("You are connected, but try another routing");
})

const isDbEmpty = (dbToCheck) => {
    return new Promise((resolve, reject) =>{
        dbToCheck.find({}, (err, data)=>{
            if (err) {
                console.log("Error while checking DB: ", err);
                return reject(err);
            }
            resolve(data.length === 0);
        });
    });
}

const fetchDataFromAPI = async () => {
    try {
        const res = await fetch(pokeAPIUrl);
        const data = await res.json();
        console.log(data.results.length);
        let pokemonDetails = []; //array of objects?

        for(const item of data.results) {
            try {
                const response = await fetch(item.url);
                const detailedData = await response.json();
                //console.log(detailedData);

                const pokemonImportantData = {
                    "name": detailedData.name,
                    "id": detailedData.id,
                    "height": detailedData.height,
                    "base_experience": detailedData.base_experience,
                    "sprites": [
                        detailedData.sprites.front_default, 
                        detailedData.sprites.other["official-artwork"].front_default
                    ],
                    "stats": detailedData.stats,
                    "types": detailedData.types
                }

                pokemonDetails.push(pokemonImportantData);
            } catch (err) {
                console.log("Error during creating pokemon array", err)
            }
        }
        //console.log("Pokemon details: ", pokemonDetails);
        database.insert(pokemonDetails);
    } catch (err) {
        console.log("Error during fetching data: ", err);
    }
}

const initializeServer = async () => {
    try {
        const dbEmpty = await isDbEmpty(database);

        if (dbEmpty) {
            console.log("Database is empty. Fetching data from API...");
            await fetchDataFromAPI();
        } else {
            console.log("Database already has data");
        }
    } catch (err) {
        console.log("Initialization error: ", err)
    } finally {
        console.log("Server initialized correctly");
    }
}

initializeServer();


// database.find({"types.type.name": 'fire'}, (err, docs)=>{
//     console.log(docs);
// })

const findPokemons = (query, res) => {
    database.find(query, (err, docs)=>{
        if (err) {
            console.log("Error while quering the database: ", err);
            return res.status(500).send("Internal Server Error");
        }
        res.json(docs);
    })

}

// Endpoint to retrieve pokemons by type
app.get('/pokemon/type/:type', (req, res)=>{
    const pokemonType = req.params.type;
    console.log(`Searching pokemons by type: ${pokemonType}`);
    findPokemons({"types.type.name": pokemonType}, res);
});

// Endpoint to retrieve pokemons by name or ID
app.get('/pokemon/:name', (req, res)=>{
    const pokemonName = req.params.name;
    console.log(typeof pokemonName);
    if ( isNaN(pokemonName) ) {
        console.log(`Searching pokemons by name: ${pokemonName}`);
        findPokemons({"name": pokemonName}, res);
    } else {
        console.log(`Searching pokemons by ID: ${pokemonName}`);
        findPokemons({"id": Number(pokemonName)}, res);
    }
    
});