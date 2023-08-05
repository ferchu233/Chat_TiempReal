const mysql = require('mysql');
const express = require('express');
const session = require('express-session');
const path = require('path');
const multer = require('multer');
const app = express();
const route = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const bodyParser = require('body-parser');
let senderGlobal;
let recipientGlobal;


// Conectar a la base de datos

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '1234',
  database: 'chats'
});

app.use(session({
  secret: 'secret',
  resave: true,
  saveUninitialized: true
}));
app.use(express.json());
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'static')));



// http://localhost:3000/
app.get('/', function (request, response) {
  // Render login template
  response.sendFile(path.join(__dirname + '/login.html'));
});

route.get('/', function (request, response) {
  // Render login template
  response.sendFile(path.join(__dirname + '/views/main'));
});

// Confirmación de inicio de sesión
app.post('/entrar', function (request, response) {
  let username = request.body.username;
  let password = request.body.password;
  if (username && password) {
    connection.query('SELECT * FROM usuario WHERE nombreUser = ? AND contraseña = ?', [username, password], function (error, results, fields) {
      if (error) throw error;
      if (results.length > 0) {
        request.session.loggedin = true;
        request.session.username = username;
        response.redirect('/main');
      } else {
        response.send('Incorrect Username and/or Password!');
      }
      response.end();
    });
  } else {
    response.send('Please enter Username and Password!');
    response.end();
  }
});

// Mover imagen de carpeta
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Define la carpeta de destino para guardar los archivos adjuntos
    cb(null, '/static/perfil/');
  },
  filename: function (req, file, cb) {
    // Define el nombre del archivo adjunto
    cb(null, file.fieldname + '-' + Date.now());
  }
});

const upload = multer({ storage: storage });

// Agregar nuevo usuario
app.post('/Registrar', function (request, response) {
  let username = request.body.usernameR;
  let password = request.body.passwordR;

  if (username && password) {
    connection.query('INSERT INTO usuario (nombreUser, contraseña, fotoPerfil) VALUES (?, ?, ?)', [username, password, "perfil2.png"], function (error, results, fields) {
      if (error) throw error;
      request.session.loggedin = true;
      request.session.username = username;
      response.json({ success: true, message: 'Registration successful' });
    });
  } else {
    response.status(400).json({ success: false, message: 'Please enter Username, Password, and Profile Picture!' });
  }
});

// Agrega la ruta para /register.html
app.get('/register.html', function (request, response) {
  response.sendFile(path.join(__dirname, 'register.html'));
});



const obtenerUsuarios = (myUser, callback) => {
  connection.query('SELECT * FROM usuario JOIN amigoUser ON usuario.id = amigoUser.receiver_id OR usuario.id = amigoUser.sender_id WHERE usuario.nombreUser <> ? AND amigoUser.EstadoId = 3 AND (amigoUser.sender_id = (SELECT id FROM usuario WHERE nombreUser = ?) OR amigoUser.receiver_id = (SELECT id FROM usuario WHERE nombreUser = ?)) ORDER BY usuario.nombreUser;  ', [myUser, myUser, myUser], function (error, results, fields) {
    if (error) return callback(error);
    const usernames = results.map(user => user.nombreUser);
    callback(null, results, usernames);
  });
};

const obtenerDibujosAntiguos = (myUser, username, callback) => {

  if(username === undefined){

    username = "Mi Galeria"

    console.log(username);

  }
  
  const sqlQuery = `SELECT * FROM dibujo WHERE (sender = ? AND recipient = ?) OR (recipient = ? AND sender = ?) ORDER BY created_at`;
  connection.query(sqlQuery, [myUser, username, myUser, username], function (error, results, fields) {
    if (error) {
      console.error('Error al obtener los dibujos antiguos:', error);
      return callback(error);
    }

    // Creamos un objeto para almacenar los datos de los dibujos
    const drawingsData = {
      sender: username, // Asignamos el valor de 'username' al atributo 'sender'
      drawings: results // Asignamos los resultados directamente al atributo 'drawings'
    };
    // Pasamos el objeto 'drawingsData' a la función de devolución de llamada
    callback(null, drawingsData);
  });
};



const obtenerMensajesAntiguos = (myUser, otherUser, callback) => {

  
  const sqlQuery = 'SELECT * FROM messages WHERE sender = " " ORDER BY created_at';

  connection.query(sqlQuery, [], function (error, messages, fields) {
    if (error) {
      console.error('Error al obtener los mensajes antiguos:', error);
      return callback(error);
    }

    callback(null, messages);
  });
};



const obtenerUsuariosSoli = (myUser, callback) => {
  connection.query(
    `SELECT *
    FROM usuario
    WHERE id <> (SELECT id FROM usuario WHERE nombreUser = ?)
    AND id NOT IN (
      SELECT receiver_id
      FROM amigoUser
      WHERE sender_id = (SELECT id FROM usuario WHERE nombreUser = ?) AND EstadoId IS NOT NULL
    );`,
    [myUser, myUser],
    function (error, results, fields) {
    if (error) {
      console.error('Error al obtener los usuarios sin solicitud:', error);
      return callback(error);
    }
    
    const usersSoli = results.map(userr => userr.nombreUser);
    callback(null,results, usersSoli); // Pasar solo 'usersSoli' a la función de devolución de llamada
  });
};

const MostrarSolicitudesParaAceptarORechazar = (myUser, callback) => {
  connection.query(
    `SELECT DISTINCT *
    FROM amigoUser au
    JOIN usuario u ON au.sender_id = u.id
    WHERE au.receiver_id = (SELECT id FROM usuario WHERE nombreUser = ?) AND au.EstadoId = 1
    GROUP BY u.nombreUser;`,
    [myUser],
    function (error, results, fields) {
      if (error) {
        console.error('Error al obtener los usuarios sin solicitud:', error);
        return callback(error);
      }

      const MostrarAc = results.map(userr => userr.nombreUser);
      callback(null, results, MostrarAc); // Pasar solo 'MostrarAc' a la función de devolución de llamada
    }
  );
};


function executeMainEndpoint(request, response){

  if (request.session.loggedin) {

    console.log(senderGlobal);
  console.log(recipientGlobal);

    const myUser = request.session.username;
    const selectedUser = request.session.userSelection;    
    
    MostrarSolicitudesParaAceptarORechazar(myUser, (error, MostrarAc) => {
      if (error) {
        console.error('Error al obtener las solicitudes:', error);
        return response.send('Error retrieving requests.');
      }

      obtenerUsuariosSoli(myUser, (error, usersSoli) => {
        if (error) {
          console.error('Error al obtener los usuarios:', error);
          return response.send('Error retrieving users.');
        }

        obtenerUsuarios(myUser, (error, users) => {
          if (error) {
            console.error('Error al obtener los usuarios:', error);
            return response.send('Error retrieving users.');
          }

           

          obtenerMensajesAntiguos(myUser, selectedUser, (error, oldMessages) => {
            if (error) {
              console.error('Error al obtener los mensajes antiguos:', error);
              return response.send('Error retrieving old messages.');
            }
          
            obtenerDibujosAntiguos(myUser, recipientGlobal, (error, drawingsData) => {
              if (error) {
                console.error('Error al obtener los dibujos antiguos:', error);
                return response.send('Error retrieving old drawings.');
              }
          
              response.render('main', { username: myUser, users, selectedUser, oldMessages, drawingsData, usersSoli, MostrarAc });
            });
          });
        });
      });
    });
  } else {
    response.send('Please login to view this page!');
  }
}

app.get('/main', function (request, response) {

  executeMainEndpoint(request, response);
  
});



// Middleware para procesar el cuerpo de las solicitudes JSON
app.use(bodyParser.json());

// Endpoint para guardar el dibujo en la base de datos
app.post('/guardar_dibujo', (req, res) => {
  const { nombre, imagen, descripcion } = req.body;

  if (!nombre || !imagen) {
    return res.status(400).json({ message: 'Falta el nombre o la imagen' });
  }

  // Guardar el dibujo en la base de datos
  const query = 'INSERT INTO dibujo (sender, recipient, image, created_at) VALUES (?, ?, ?, NOW())';
  connection.query(query, [nombre, descripcion, imagen], (err, result) => {
    if (err) {
      console.error('Error al guardar el dibujo en la base de datos:', err);
      return res.status(500).json({ message: 'Error al guardar el dibujo' });
    }


    res.json({ message: 'Dibujo guardado correctamente', drawingId: result.insertId });
  });
});




// Socket.IO
io.on('connection', (socket) => {
  console.log('A user connected');

  // Solicitar el nombre de usuario al usuario conectado
  socket.on('username', (username) => {
    console.log('Received username: ' + username);

    // Agregar el nombre de usuario a la sesión del socket
    socket.username = username;
  });

  // Manejar el envío de mensajes
  socket.on('chat message', (data) => {
    console.log('Received message: ' + data.message);

    // Obtener el nombre de usuario emisor y destinatario
    const sender = socket.username;
    const recipient = data.recipient;
    const message = data.message;

    // Guardar el mensaje en la base de datos
    connection.query('INSERT INTO messages (sender, recipient, message) VALUES (?, ?, ?)', [sender, recipient, message], function (error, results, fields) {
      if (error) {
        console.error('Error al guardar el mensaje en la base de datos:', error);
      } else {
        // Emitir el mensaje a los sockets correspondientes
        io.emit('chat message', { message, sender, recipient });
      }
    });
  });

  // Manejar la solicitud de mensajes antiguos
socket.on('request old messages', (data) => {
    const sender = socket.username;
    const recipient = data.recipient;

    
  
    // Obtener los mensajes enviados por el usuario actual
    const sentMessagesQuery = 'SELECT * FROM messages WHERE sender = ? AND recipient = ? ORDER BY created_at';
    connection.query(sentMessagesQuery, [sender, recipient], function (error, sentMessages, fields) {
      if (error) {
        console.error('Error al obtener los mensajes enviados:', error);
        return;
      }
  
      // Obtener los mensajes enviados por el usuario actual
const sentMessagesQuery = 'SELECT * FROM messages WHERE sender = ? AND recipient = ? ORDER BY created_at';
connection.query(sentMessagesQuery, [sender, recipient], function (error, sentMessages, fields) {
  if (error) {
    console.error('Error al obtener los mensajes enviados:', error);
    return;
  }

  // Obtener los mensajes recibidos por el usuario actual
  const receivedMessagesQuery = 'SELECT * FROM messages WHERE sender = ? AND recipient = ? ORDER BY created_at';
  connection.query(receivedMessagesQuery, [recipient, sender], function (error, receivedMessages, fields) {
    if (error) {
      console.error('Error al obtener los mensajes recibidos:', error);
      return;
    }

    // Combinar los mensajes enviados y recibidos en orden cronológico
    const messages = [...sentMessages, ...receivedMessages].sort((a, b) => a.created_at - b.created_at);

    // Enviar los mensajes antiguos al cliente
    socket.emit('old messages', { recipient, messages });
  });
});
    });
    
  });


  app.use(bodyParser.json());

  app.get('/actualizarDibujos', (request, response) => {
    const sender = request.query.sender;
    const recipient = request.query.recipient;
  
    // Realizar la consulta a la base de datos para obtener los dibujos
    const dibujos = `SELECT * FROM dibujo WHERE (sender = ? AND recipient = ?) OR (recipient = ? AND sender = ?) ORDER BY created_at`;
    connection.query(dibujos, [sender, recipient, sender, recipient], function (error, results, fields) {
      if (error) {
        console.error('Error al obtener los dibujos:', error);
        return response.send('Error retrieving drawings.');
      }


      console.log(results)

      
    });
  });
  
  
  
  


// Enviar Solicitud de amistad
app.post('/enviarSolicitud', function (request, response) {
  const myUser = request.session.username;
  const receiver_id = request.body.receiver_id;
  const receiver_username = request.body.receiver_username;
  const estado = 1;

    connection.query('INSERT INTO amigoUser (sender_id, receiver_id, EstadoId, created_at) VALUES ((SELECT id FROM usuario WHERE nombreUser=?), ?, ?, NOW())', [myUser, receiver_id, estado], function (error, results, fields) {
      if (error) {
        console.error('Error al actualizar la solicitud:', error);
        return response.send('Error updating the request.');
      }
      
      response.redirect('/main');
    });
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// rechazar solicitud
app.post('/rechazarSolicitud', function (request, response) {
  const remitenteId = request.body.remitenteId;
  const myUser = request.session.username;

  const sqlQuery = `
    UPDATE amigoUser
    SET EstadoId = 2
    WHERE sender_id = ? AND receiver_id = (SELECT id FROM usuario WHERE nombreUser = ?) AND EstadoId = 1;
  `;

  connection.query(sqlQuery, [remitenteId, myUser], function (error, results, fields) {
    if (error) {
      console.error('Error al actualizar la solicitud:', error);
      return response.send('Error updating the request.');
    }

    // Redireccionar al cliente a la página principal para obtener los datos actualizados
    response.redirect('/main');
  });
});

app.post('/aceptarSolicitud', function (request, response) {
  const remitenteId = request.body.remitenteId;
  const myUser = request.session.username;

  const sqlQuery = `
    UPDATE amigoUser
    SET EstadoId = 3
    WHERE sender_id = ? AND receiver_id = (SELECT id FROM usuario WHERE nombreUser = ?) AND EstadoId = 1;
  `;

  connection.query(sqlQuery, [remitenteId, myUser], function (error, results, fields) {
    if (error) {
      console.error('Error al actualizar la solicitud:', error);
      return response.send('Error updating the request.');
    }

    // Redireccionar al cliente a la página principal para obtener los datos actualizados
    response.redirect('/main');
  });
});



  

  // Manejar la desconexión de usuarios
  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

http.listen(3000, () => {
  console.log('Server listening on port 3000');
});
