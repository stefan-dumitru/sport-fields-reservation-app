require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const axios = require('axios');
const bodyParser = require('body-parser');
const cors = require('cors');

// const { Translate } = require("@google-cloud/translate").v2;

const crypto = require('crypto');
const nodemailer = require('nodemailer');
// const bcrypt = require('bcrypt');
const path = require('path');

const app = express();
const PORT = process.env.PORT;

const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

app.use(cors());
app.use(express.json());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const db = mysql.createConnection({
    host: process.env.HOST,
    user: process.env.USER,
    password: process.env.PASSWORD,
    database: process.env.DATABASE
});
  
db.connect((err) => {
  if (err) throw err;
  console.log('Connected to MySQL database!');
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;

  const query = 'SELECT username, statut FROM SPORTIVI WHERE email = ? AND parola = ?';

  db.query(query, [email, password], (err, results) => {
      if (err) {
          res.status(500).json({ success: false, message: 'Error connecting to the database' });
          return;
      }

      if (results.length > 0) {
          const user = results[0];
          res.json({ success: true, message: 'Login successful!', username: user.username, statut: user.statut });
      } else {
        const queryOwners = 'SELECT username, statut FROM PROPRIETARI WHERE email = ? AND parola = ?';
        db.query(queryOwners, [email, password], (err, resultsOwners) => {
            if (err) {
                res.status(500).json({ success: false, message: 'Error connecting to the database' });
                return;
            }

            if (resultsOwners.length > 0) {
                const owner = resultsOwners[0];
                res.json({ success: true, message: 'Login successful!', username: owner.username, statut: owner.statut });
            } else {
                res.json({ success: false, message: 'Invalid credentials. Please try again.' });
            }
        });
      }
  });
});

app.get('/get-user-profile/:username', (req, res) => {
  const { username } = req.params;

  const query = 'SELECT username, nume, prenume, email, sporturi_preferate FROM SPORTIVI WHERE username = ?';

  db.query(query, [username], (err, results) => {
      if (err) {
          res.status(500).json({ success: false, message: 'Error retrieving user profile' });
          return;
      }

      if (results.length > 0) {
          res.json({ success: true, user: results[0] });
      } else {
          const queryOwners = 'SELECT username, nume, prenume, email FROM PROPRIETARI WHERE username = ?';

          db.query(queryOwners, [username], (err, resultsOwners) => {
            if (err) {
                res.status(500).json({ success: false, message: 'Error retrieving user profile' });
                return;
            }

            if (resultsOwners.length > 0) {
                res.json({ success: true, user: resultsOwners[0] });
            } else {
                res.json({ success: false, message: 'User not found' });
            }
        });
      }
  });
});

app.post('/register', (req, res) => {
  const { nume, prenume, email, parola } = req.body;

  const username = email.split('@')[0];

  const query = `INSERT INTO sportivi (username, nume, prenume, email, parola, statut, sporturi_preferate)
               VALUES (?, ?, ?, ?, ?, 0, '')`;
  
  const values = [username, nume, prenume, email, parola];

  db.query(query, values, (err, result) => {
      if (err) {
          console.error('Error inserting user:', err);
          res.json({ success: false, message: 'An error occurred. Please try again.' });
      } else {
          console.log('User registered:', result);
          res.json({ success: true, message: 'Registration successful!', username });
      }
  });
});

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
      user: process.env.USER_EMAIL,
      pass: process.env.PASS
  }
});

app.post('/reset-password', (req, res) => {
  const { email } = req.body;

  const query = 'SELECT * FROM sportivi WHERE email = ?';

  db.query(query, [email], (err, result) => {
      if (err) {
          console.error('Error executing query:', err);
          return res.json({ success: false, message: 'An error occurred. Please try again.' });
      }
      
      if (result.length > 0) {
        const resetToken = crypto.randomBytes(20).toString('hex');
        const currentTime = new Date();

        currentTime.setHours(currentTime.getHours() + 3);

        const resetExpires = currentTime.toISOString().slice(0, 19).replace('T', ' ');

        const updateQuery = 'UPDATE sportivi SET reset_token = ?, reset_expires = ? WHERE email = ?';
        db.query(updateQuery, [resetToken, resetExpires, email], (err) => {
            if (err) {
                console.error('Error updating the database:', err);
                return res.json({ success: false, message: 'Failed to generate reset token.' });
            }

            const resetLink = `http://localhost:8080/set-new-password?token=${resetToken}`;
            const mailOptions = {
                from: process.env.USER_EMAIL,
                to: email,
                subject: 'Resetare parola',
                text: `Apasa pe acest link pentru a-ti reseta parola: ${resetLink}`
            };

            transporter.sendMail(mailOptions, (error) => {
                if (error) {
                    console.error('Error sending email:', error);
                    return res.json({ success: false, message: 'Failed to send email.' });
                }

                res.json({ success: true, message: 'Reset link sent to email.' });
            });
        });
    } else {
        res.json({ success: false, message: 'Email not found. Please try again.' });
    }
  });
});

app.post('/confirm-password-reset', async (req, res) => {
  const { token, password } = req.body;

  const query = 'SELECT * FROM sportivi WHERE reset_token = ? AND reset_expires > NOW()';
  db.query(query, [token], async (err, result) => {
      if (err || result.length === 0) {
          return res.json({ success: false, message: 'Invalid or expired token.' });
      }

      const updateQuery = 'UPDATE sportivi SET parola = ?, reset_token = NULL, reset_expires = NULL WHERE reset_token = ?';
      db.query(updateQuery, [password, token], (err) => {
          if (err) {
              return res.json({ success: false, message: 'Error updating password.' });
          }

          res.json({ success: true, message: 'Password updated successfully!' });
      });
  });
});

app.put("/update-favourite-sports/:username", async (req, res) => {
  const { username } = req.params;
  const { sporturi_preferate } = req.body;

  const query = 'UPDATE sportivi SET sporturi_preferate = ? WHERE username = ?';
  db.query(query, [sporturi_preferate, username], async (err, result) => {
    if (err) {
      console.error('Error updating favourite sports:', err);
      res.json({ success: false, message: 'An error occurred. Please try again.' });
    } else {
      console.log('Favourite sports updated successfully:', result);
      res.json({ success: true, message: 'Favourite sports successfully changed!' });
    }
  });
});

app.get('/get-reservations/:username', async (req, res) => {
  const { username } = req.params;

  const query = `
    SELECT r.id_rezervare, t.denumire_teren, r.data_rezervare, r.ora_inceput, r.ora_sfarsit
    FROM rezervari r
    JOIN terenuri_sportive t ON r.id_teren = t.id_teren
    WHERE r.username_sportiv = ?`;

  db.query(query, [username], (err, result) => {
    if (err) {
      console.error('Error fetching reservations:', err);
      res.json({ success: false, message: 'An error occurred. Please try again.' });
    } else {
      console.log('Reservations fetched:', result);
      res.json({ success: true, reservations: result });
    }
  });
});

app.get('/get-statut/:username', async (req, res) => {
  const { username } = req.params;
  const query = `SELECT statut FROM sportivi WHERE username = ?`;
  db.query(query, [username], (err, result) => {
      if (err) {
          console.error('Error fetching user statut:', err);
          return res.status(500).json({ success: false, message: 'An error occurred.' });
      }
      if (result.length > 0) {
          res.json({ success: true, statut: result[0].statut });
      } else {
          res.json({ success: false, message: 'User not found.' });
      }
  });
});

app.post('/add-field', async (req, res) => {
  const { username, denumire_sport, adresa, pret_ora, denumire_teren, program, sector } = req.body;

  const id_teren = Math.floor(Math.random() * 1000000); 

  const statut = 'confirmat';
  const oras = 'Bucharest';
  const insertQuery = `
      INSERT INTO terenuri_sportive (id_teren, denumire_sport, adresa, pret_ora, statut, denumire_teren, program, oras, sector, username_proprietar)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  db.query(insertQuery, [id_teren, denumire_sport, adresa, pret_ora, statut, denumire_teren, program, oras, sector, username], (err) => {
      if (err) {
          console.error('Error inserting field:', err);
          return res.status(500).json({ success: false, message: 'An error occurred.' });
      }
      res.json({
      success: true, 
      message: statut === 'confirmat' 
          ? 'Field added successfully!' 
          : 'Field added to the pending list. We will let you know when a trusted user approves it!' 
      });
  });
});

app.get('/pending-fields', (_req, res) => {
  const query = `SELECT id_teren, denumire_sport, adresa, pret_ora, denumire_teren, program, sector 
                 FROM terenuri_sportive 
                 WHERE statut = 'asteptare'`;
  db.query(query, (err, result) => {
      if (err) {
          console.error('Error fetching pending fields:', err);
          res.json({ success: false, message: 'An error occurred.' });
      } else {
          res.json({ success: true, fields: result });
      }
  });
});

app.get('/user-status/:username', (req, res) => {
  const { username } = req.params;

  const query = 'SELECT statut FROM sportivi WHERE username = ?';
  db.query(query, [username], (err, result) => {
      if (err) {
          console.error('Error fetching user status:', err);
          return res.status(500).json({ success: false, message: 'An error occurred while fetching user status.' });
      }

      if (result.length > 0) {
          res.json({ success: true, statut: result[0].statut });
      } else {
          res.json({ success: false, message: 'User not found.' });
      }
  });
});

app.put('/confirm-field/:id', (req, res) => {
  const { id } = req.params;

  const query = "UPDATE terenuri_sportive SET statut = 'confirmat' WHERE id_teren = ?";
  db.query(query, [id], (err, result) => {
      if (err) {
          console.error('Error confirming field:', err);
          return res.status(500).json({ success: false, message: 'Error confirming the field.' });
      }

      if (result.affectedRows > 0) {
          res.json({ success: true, message: 'Field confirmed successfully!' });
      } else {
          res.json({ success: false, message: 'Field not found.' });
      }
  });
});

app.delete('/reject-field/:id', (req, res) => {
  const { id } = req.params;

  const query = "DELETE FROM terenuri_sportive WHERE id_teren = ?";
  db.query(query, [id], (err, result) => {
      if (err) {
          console.error('Error rejecting field:', err);
          return res.status(500).json({ success: false, message: 'Error rejecting the field.' });
      }

      if (result.affectedRows > 0) {
          res.json({ success: true, message: 'Field rejected successfully!' });
      } else {
          res.json({ success: false, message: 'Field not found.' });
      }
  });
});

app.delete('/cancel-reservation/:id', (req, res) => {
  const { id } = req.params;

  const query = "DELETE FROM rezervari WHERE id_rezervare = ?";
  db.query(query, [id], (err, result) => {
      if (err) {
          console.error('Error canceling reservation:', err);
          return res.status(500).json({ success: false, message: 'Error canceling reservation.' });
      }

      if (result.affectedRows > 0) {
          res.json({ success: true, message: 'Reservation canceled successfully!' });
      } else {
          res.json({ success: false, message: 'Reservation not found.' });
      }
  });
});

app.post('/search-fields', async (req, res) => {
  const { sport, sector } = req.body;

  let query = `SELECT id_teren, denumire_sport, adresa, pret_ora, denumire_teren, program, sector 
               FROM terenuri_sportive WHERE statut = 'confirmat'`;
  const params = [];

  if (sport) {
      query += ` AND denumire_sport = ?`;
      params.push(sport);
  }

  if (sector) {
      query += ` AND sector = ?`;
      params.push(sector);
  }

  try {
      const fields = await new Promise((resolve, reject) => {
          db.query(query, params, (err, result) => {
              if (err) return reject(err);
              resolve(result);
          });
      });

      const fieldReservations = await Promise.all(
          fields.map(async (field) => {
              const reservations = await getFutureReservations(field.id_teren);
              return { ...field, reservations };
          })
      );

      res.json({ success: true, fields: fieldReservations });
  } catch (error) {
      console.error("Error fetching fields:", error);
      res.status(500).json({ success: false, message: "An error occurred. Please try again." });
  }
});

function getFutureReservations(id_teren) {
    return new Promise((resolve, reject) => {
        db.query(
            `SELECT data_rezervare, ora_inceput, ora_sfarsit
              FROM REZERVARI
              WHERE id_teren = ?
              ORDER BY data_rezervare, ora_inceput`,
            [id_teren],
            (err, results) => {
                if (err) {
                    console.error('Error fetching reservations:', err);
                    return reject(err);
                }
                resolve(results);
            }
        );
    });
}

app.post("/make-reservation", async (req, res) => {
    const { id_teren, data_rezervare, ora_inceput, ora_sfarsit, username } = req.body;

    const id_rezervare = Math.floor(Math.random() * 1000000);

    const today = new Date();
    const reservationDate = new Date(data_rezervare);
    const currentTime = `${today.getHours().toString().padStart(2, "0")}:${today.getMinutes().toString().padStart(2, "0")}`;
    const parsedStartTime = new Date(ora_inceput);
    const newOra_inceput = `${parsedStartTime.getHours().toString().padStart(2, "0")}:${parsedStartTime.getMinutes().toString().padStart(2, "0")}`;

    const oraInceputDatetime = `${data_rezervare} ${ora_inceput}:00`;
    const oraSfarsitDatetime = `${data_rezervare} ${ora_sfarsit}:00`;
    
    if (reservationDate < today.setHours(0, 0, 0, 0)) {
        return res.json({ success: false, message: "Nu poti face rezervari pentru zilele din trecut!" });
    }

    if (reservationDate.toDateString() === today.toDateString() && newOra_inceput <= currentTime) {
        return res.json({ success: false, message: "Nu poti face rezervari inainte de ora de astazi!" });
    }

    try {
        const query = `
            INSERT INTO rezervari (id_rezervare, username_sportiv, id_teren, data_rezervare, ora_inceput, ora_sfarsit)
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        db.query(query, [id_rezervare, username, id_teren, data_rezervare, oraInceputDatetime, oraSfarsitDatetime], (err) => {
            if (err) {
                console.error("Error inserting reservation:", err);
                res.json({ success: false, message: "Error making reservation." });
            } else {
                res.json({ success: true, message: "Reservation made successfully!" });
            }
        });
    } catch (err) {
        console.error("Error processing reservation:", err);
        res.status(500).json({ success: false, message: "Failed to process reservation." });
    }
});

app.get('/get-field-reservations/:id_teren', async (req, res) => {
    try {
        const { id_teren } = req.params;

        const reservations = await getFutureReservations(id_teren);

        res.json({ success: true, reservations });
    } catch (err) {
        console.error('Error in /get-field-reservations route:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch reservations.' });
    }
});

app.post('/get-owner-fields', async (req, res) => {
    const { username } = req.body;

    if (!username) {
        return res.status(400).json({ success: false, message: 'Username is required.' });
    }

    try {
        const fields = await new Promise((resolve, reject) => {
            db.query(
                `SELECT id_teren, denumire_sport, adresa, pret_ora, denumire_teren, program, sector 
                 FROM terenuri_sportive 
                 WHERE statut = 'confirmat' AND username_proprietar = ?`,
                [username],
                (err, result) => {
                    if (err) return reject(err);
                    resolve(result);
                }
            );
        });

        const fieldReservations = await Promise.all(
            fields.map(async (field) => {
                const reservations = await getFutureReservations(field.id_teren);
                return { ...field, reservations };
            })
        );

        res.json({ success: true, fields: fieldReservations });
    } catch (error) {
        console.error("Error fetching owner's fields:", error);
        res.status(500).json({ success: false, message: "An error occurred. Please try again." });
    }
});

app.get("/get-sports-fields", (_req, res) => {
    const query = `SELECT id_teren, denumire_teren, adresa, program, pret_ora FROM terenuri_sportive WHERE statut = 'confirmat'`;

    db.query(query, (err, results) => {
        if (err) {
            console.error("Error fetching sports fields:", err);
            return res.status(500).json({ success: false, message: "Failed to fetch sports fields" });
        }

        res.json(results);
    });
});

app.get("/get-owner-sports-fields/:username", (req, res) => { 
    const username = req.params.username;

    const query = `
        SELECT id_teren, denumire_teren, denumire_sport, adresa, program, pret_ora
        FROM terenuri_sportive
        WHERE username_proprietar = ?`;

    db.query(query, [username], (err, results) => {
        if (err) {
            console.error("Error fetching owner's fields:", err);
            return res.status(500).json({ success: false, message: "Failed to fetch owner's sports fields" });
        }

        res.json(results);
    });
});

app.put('/update-field', (req, res) => {
    const { id_teren, pret_ora, program } = req.body;

    const query = `UPDATE terenuri_sportive SET pret_ora = ?, program = ? WHERE id_teren = ?`;

    db.query(query, [pret_ora, program, id_teren], (err) => {
        if (err) {
            console.error('Error updating field:', err);
            return res.status(500).json({ success: false, message: 'Failed to update field' });
        }

        res.json({ success: true, message: 'Field updated successfully' });
    });
});

app.get("/get-coordinates", async (req, res) => {
    const { address } = req.query;

    try {
        const response = await axios.get(
            `https://maps.googleapis.com/maps/api/geocode/json`,
            {
                params: {
                    address: address,
                    key: process.env.GOOGLE_MAPS_API_KEY,
                },
            }
        );

        if (response.data.results.length > 0) {
            const location = response.data.results[0].geometry.location;
            res.json({ success: true, lat: location.lat, lng: location.lng });
        } else {
            res.json({ success: false, message: "No coordinates found for this address." });
        }
    } catch (error) {
        console.error("Error fetching coordinates:", error);
        res.json({ success: false, message: "Error fetching coordinates." });
    }
});

app.get("/get-user-reservations", async (req, res) => {
    const { username, date } = req.query;

    const query = `SELECT * FROM REZERVARI WHERE username_sportiv = ? AND data_rezervare = ?`;
    db.query(query, [username, date], (err, result) => {
        if (err) {
            console.error('Error getting user reservations:', err);
            return res.status(500).json({ success: false, message: 'Error canceling reservation.' });
        }
        
        res.json({ success: true, result });
    });
});

app.get("/get-user-reservations-for-field", async (req, res) => {
    const { username, date, fieldId } = req.query;

    const query = `SELECT * FROM REZERVARI WHERE username_sportiv = ? AND data_rezervare = ? AND id_teren = ?`;
    db.query(query, [username, date, fieldId], (err, result) => {
        if (err) {
            console.error('Error getting user reservations:', err);
            return res.status(500).json({ success: false, message: 'Error canceling reservation.' });
        }
        
        res.json({ success: true, result });
    });
});

async function translateText(text, targetLanguage = "en") {
    const exerciseDictionary = {
        "incalzire": "warming-up",
        "sut": "shooting",
        "genuflexiuni": "squats",
        "flotari": "push-ups",
        "abdomen": "core exercises",
        "alergare": "running",
        "sarituri": "jumping",
        "jonglerii": "juggling",
        "pasare": "passing",
        "pase": "passing",
        "dribbling": "dribbling"
    };

    const normalizedText = text.trim().toLowerCase();

    if (exerciseDictionary[normalizedText]) {
        return exerciseDictionary[normalizedText];
    }

    try {
        const response = await axios.get(
            `https://translation.googleapis.com/language/translate/v2`,
            {
                params: {
                    q: text,
                    target: targetLanguage,
                    key: process.env.GOOGLE_TRANSLATE_API_KEY
                }
            }
        );
        return response.data.data.translations[0].translatedText;
    } catch (error) {
        console.error("Translation error:", error);
        return text;
    }
}

function extractExerciseName(text) {
    let match = text.match(/(?:Exercitiu \d+ - |\* )?([^:-]+)/);
    return match ? match[1].trim() : null;
}

async function fetchYouTubeVideo(exerciseName, sportName) {
    const translatedExercise = await translateText(exerciseName, "en");
    const translatedSport = await translateText(sportName, "en");

    console.log("Exeritiu tradus : ", translatedExercise);
    console.log("Sport tradus : ", translatedSport);

    try {
        const sportChannels = {
            fotbal: ["UC5SQGzkWyQSW_fe-URgq7xw", "UC0Ik25PHaiHCbfGrzu-lBFQ", "UC4bvZoXoM-9_ITecvZ2U0BQ"], // AllAttack, Unisport, Improved Football
            baschet: ["UCqjq2Zq6QUwpDR45Ns89YDw", "UC3jwvC1HTXpdvrlHFMFTdYg"], // ShotMechanics, Pro Training Basketball
            tenis: ["UCvQvcthQRTWwkkRgTGrtpsg", "UCTK9oKMGU0XIQpLJYDs45fw"] // TennisUnleashed, Feel Tennis Instruction
        };

        const channels = sportChannels[sportName.toLowerCase()];
        if (!channels) {
            console.error("Invalid sport name provided:", sportName);
            return null;
        }

        const searchQuery = `Tutorial ${translatedExercise} for ${translatedSport}`;

        for (const channelId of channels) {
            const response = await axios.get("https://www.googleapis.com/youtube/v3/search", {
                params: {
                    part: "snippet",
                    q: searchQuery,
                    type: "video",
                    maxResults: 1,
                    key: process.env.YOUTUBE_API_KEY,
                    order: "relevance",
                    publishedAfter: "2020-01-01T00:00:00Z",
                    channelId: channelId
                }
            });

            if (response.data.items.length > 0) {
                console.log("Raspuns : ", `https://www.youtube.com/watch?v=${response.data.items[0].id.videoId}`);
                return `https://www.youtube.com/watch?v=${response.data.items[0].id.videoId}`;
            }
        }

        return null;
    } catch (error) {
        console.error("Error fetching YouTube video:", error.message);
        return null;
    }
}

app.get('/get-training-plan', async (req, res) => {
    const {
        sport,
        experience,
        age,
        gender,
        lastPracticed,
        weight,
        height,
        physicalLevel,
        trainingHours,
        objectives,
        preferredPosition,
        availabilityDays
    } = req.query;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 50000);

    req.on('close', () => {
        clearTimeout(timeout);
        controller.abort();
    });

    try {
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: "gpt-4",
                messages: [
                    {
                        role: "system",
                        content: "You are a professional trainer creating personalized weekly training schedules."
                    },
                    {
                        role: "user",
                        content: `Creeaza un program de antrenament saptamanal personalizat. Detaliile sportivului sunt:
- Sport: ${sport}
- Cat de des practica acest sport: ${experience}
- Varsta: ${age}
- Gen: ${gender}
- Ultima data cand a practicat sportul: ${lastPracticed}
- Greutate: ${weight} kg
- Inaltime: ${height} cm
- Nivel de pregatire fizica: ${physicalLevel}
- Ore alocate pentru antrenament pe saptamana: ${trainingHours}
- Obiectivul principal al sportivului: ${objectives}
- Pozitia pe care prefera sa joace: ${preferredPosition}
- Zile disponibile pentru antrenamente: ${availabilityDays}

Formateaza raspunsul astfel:
1. Luni
  - Exercitii de incalzire (durata totala)
      * exercitiul 1 (durata + explicare detaliata : in ce consta exercitiul, cum se realizeaza).
      * exercitiul 2 (durata + explicare detaliata : in ce consta exercitiul, cum se realizeaza).
      * ...
  - Exercitiu 1 - denumire (durata + explicare detaliata : in ce consta exercitiul, cum se realizeaza).
  - Exercitiu 2 - denumire (durata + explicare detaliata : in ce consta exercitiul, cum se realizeaza).
  - ...

(Continua asa pentru restul zilelor selectate de sportiv. Raspunsul trebuie sa nu aiba diacritice si sa inceapa cu o propozitie scurta. Exercitiile trebuie sa fie cat mai simple.)`
                    }
                ],
                max_tokens: 700,
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                },
                signal: controller.signal,
            }
        );

        clearTimeout(timeout);

        const rawTrainingPlan = response.data.choices[0].message.content;

        const days = rawTrainingPlan.split(/\n(?=\d+\.\s?[A-Z][a-z]+)/).slice(1);
        const trainingPlan = {};

        for (const daySection of days) {
            const [dayLine, ...exerciseLines] = daySection.trim().split('\n');
            const dayName = dayLine.replace(/^\d+\.\s?/, '').trim();

            const exercises = [];
            for (const line of exerciseLines) {
                let formattedLine = line.replace(/^\s*-\s*/, '').trim();

                const exerciseName = formattedLine.split('(')[0].trim();
                const extractedName = extractExerciseName(exerciseName);

                if (!extractedName) {
                    console.log("Skipping empty or invalid line.");
                    continue;
                }

                const videoLink = await fetchYouTubeVideo(extractedName, sport);

                if (videoLink) {
                    formattedLine += ` <a href="${videoLink}" target="_blank">[Video]</a>`;
                }

                exercises.push(formattedLine);
            }

            trainingPlan[dayName] = exercises;
        }

        res.write(`data: ${JSON.stringify({ success: true, trainingPlan })}\n\n`);
        res.end();
    } catch (error) {
        console.error("Error fetching training plan:", error.message || error);

        if (error.name === 'AbortError') {
            res.write(`data: ${JSON.stringify({ success: false, message: "No internet connection. Please try again." })}\n\n`);
        } else {
            res.write(`data: ${JSON.stringify({ success: false, message: "Failed to retrieve training plan." })}\n\n`);
        }
        res.end();
    }
});

app.post("/create-checkout-session", async (req, res) => {
    try {
        const { id_teren, totalPrice } = req.body;

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [{
                price_data: {
                    currency: "ron",
                    product_data: { name: `Field Reservation - ${id_teren}` },
                    unit_amount: totalPrice * 100,
                },
                quantity: 1,
            }],
            mode: "payment",
            success_url: "http://127.0.0.1:8080/fields-map.html?payment=success",
            cancel_url: "http://127.0.0.1:8080/fields-map.html?payment=cancel",
        });

        res.json({ url: session.url });
    } catch (error) {
        console.error("Error creating checkout session:", error);
        res.status(500).json({ error: "Failed to create checkout session" });
    }
});

app.post("/create-checkout-session-new", async (req, res) => {
    try {
        const { id_teren, totalPrice } = req.body;

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [{
                price_data: {
                    currency: "ron",
                    product_data: { name: `Field Reservation - ${id_teren}` },
                    unit_amount: totalPrice * 100,
                },
                quantity: 1,
            }],
            mode: "payment",
            success_url: "http://127.0.0.1:8080/search-fields.html?payment=success",
            cancel_url: "http://127.0.0.1:8080/search-fields.html?payment=cancel",
        });

        res.json({ url: session.url });
    } catch (error) {
        console.error("Error creating checkout session:", error);
        res.status(500).json({ error: "Failed to create checkout session" });
    }
});

app.get('/get-google-maps-key', (_req, res) => {
    res.json({ apiKey: process.env.GOOGLE_MAPS_API_KEY });
});

app.get('/set-new-password', (_req, res) => {
    res.sendFile(path.join(__dirname, 'frontend-files', 'set-new-password.html'));
});

app.get('/login-page', (_req, res) => {
  res.sendFile(path.join(__dirname, 'log-in-page.html'));
});

app.get('/dashboard-page', (_req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.get('/my-profile-page', (_req, res) => {
  res.sendFile(path.join(__dirname, 'my-profile.html'));
});

app.listen(PORT, () => {
  console.log('Server running on http://localhost:${PORT}');
});