const socket = io();






    $(document).ready(function() {
    // Escuchar el clic del botón con la clase "btnEnviarSolicitud"
    $('.btnRechazarSolicitud').click(function() {
      // Obtener los atributos "data-id" y "data-username" del botón
      const remitenteId = $(this).data('id');
      const remitenteNombre = $(this).data('username');
      
      // Realizar la solicitud POST a la ruta "/rechazarSolicitud"
      $.post('/rechazarSolicitud', {
        remitenteId: remitenteId,
        remitenteNombre: remitenteNombre
      }, function(data, status) {
        // Manejar la respuesta del servidor si es necesario
        console.log('Respuesta del servidor:', data);
        console.log('Estado de la solicitud:', status);
        
        // Si quieres hacer algo específico después de la respuesta del servidor, aquí es donde lo harías
      });
    });
  });

  $(document).ready(function() {
    // Escuchar el clic del botón con la clase "btnEnviarSolicitud"
    $('.btnAceptarSolicitud').click(function() {
      // Obtener los atributos "data-id" y "data-username" del botón
      const remitenteId = $(this).data('id');
      const remitenteNombre = $(this).data('username');
      
      // Realizar la solicitud POST a la ruta "/rechazarSolicitud"
      $.post('/aceptarSolicitud', {
        remitenteId: remitenteId,
        remitenteNombre: remitenteNombre
      }, function(data, status) {
        // Manejar la respuesta del servidor si es necesario
        console.log('Respuesta del servidor:', data);
        console.log('Estado de la solicitud:', status);
        
        // Si quieres hacer algo específico después de la respuesta del servidor, aquí es donde lo harías
      });
    });
  });

    document.querySelector('.herramientas').addEventListener('click', function() {
  var espacio = document.getElementById('espacioBlanco');
  espacio.style.display = (espacio.style.display === 'block') ? 'none' : 'block';
});



window.addEventListener('click', function(event) {
  var espacio = document.getElementById('espacioBlanco');
  var target = event.target;
  if (target !== espacio && target !== document.querySelector('.herramientas')) {
    espacio.style.display = 'none';
  }
});
     // Obtener el contenido del elemento <h1> con el id "UserNameId"
     const h1Element = document.getElementById('UserNameId');

     // Obtener el texto contenido en el elemento <h1>
     const usernameText = h1Element.textContent;

    // Solicitar el nombre de usuario al iniciar la conexión
    socket.emit('username', usernameText);

    // Manejo del envío de mensajes
    document.getElementById('chat-form').addEventListener('submit', (e) => {
           // Obtener el contenido del elemento <h1> con el id "UserNameId"
  const h1Element = document.getElementById('UserNameId');

  // Obtener el texto contenido en el elemento <h1>
  const usernameText = h1Element.textContent;
      e.preventDefault();
      const messageInput = document.getElementById('message-input');
      const recipientInput = document.getElementById('recipient-input');
      const message = messageInput.value.trim();
      const recipient = recipientInput.value.trim();
      if (message && recipient) {
        socket.emit('chat message', { message, recipient });
        messageInput.value = '';
        messageInput.focus();
      }
    });

    // Manejar los mensajes entrantes
    socket.on('chat message', (msg) => {

      // Obtener el contenido del elemento <h1> con el id "UserNameId"
  const h1Element = document.getElementById('UserNameId');

  // Obtener el texto contenido en el elemento <h1>
  const usernameText = h1Element.textContent;

      const { message, sender, recipient } = msg;
      const isMe = sender === usernameText && recipient === document.getElementById('recipient-input').value.trim();
      appendMessage(`${sender}: ${message}`, isMe);
    });

   // Manejar los mensajes antiguos
socket.on('old messages', (data) => {
  const { recipient, messages } = data;

  // Obtener el elemento de la lista de mensajes antiguos
  const oldMessagesList = document.querySelector('.old-messages ul');

  // Eliminar los mensajes antiguos
  while (oldMessagesList.firstChild) {
    oldMessagesList.removeChild(oldMessagesList.firstChild);
  }

  // Mostrar los nuevos mensajes en la interfaz
  messages.forEach((msg) => {
    const li = document.createElement('li');
    var lista = document.getElementById("miLista");
  lista.style.display = "block"; // Muestra la lista al hacer clic en el botón

    li.textContent = `${msg.sender}: ${msg.message}`;
    li.classList.add((msg.sender === recipient) ? 'others' : 'me');
    oldMessagesList.appendChild(li);
  });
});



    // Función para agregar mensajes a la lista de mensajes
    function appendMessage(message, isMe) {
      const messages = document.getElementById('messages');
      const li = document.createElement('li');
      li.textContent = message;
      if (isMe) {
        li.classList.add('me');
      } else {
        li.classList.add('others');
      }
      messages.appendChild(li);
    }



    