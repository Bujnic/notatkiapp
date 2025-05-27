let token = localStorage.getItem("token");

const urlParams = new URLSearchParams(window.location.search);
const urlToken = urlParams.get("token");
if (urlToken) {
  token = urlToken;
  localStorage.setItem("token", token);
  window.history.replaceState({}, document.title, "/");
  document.getElementById("auth").style.display = "none";
  document.getElementById("notes-app").style.display = "block";
  loadNotes();
}

if (token) {
  document.getElementById("auth").style.display = "none";
  document.getElementById("notes-app").style.display = "block";
  loadNotes();
}

function register() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    alert("Proszę podać poprawny adres e-mail");
    return;
  }
  fetch("http://localhost:5001/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })
    .then((response) => {
      if (!response.ok) {
        return response.json().then((err) => {
          throw new Error(err.error || "Błąd rejestracji");
        });
      }
      return response.json();
    })
    .then(() => login())
    .catch((error) => alert(error.message));
}

function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  fetch("http://localhost:5001/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })
    .then((response) => {
      if (!response.ok) {
        return response.json().then((err) => {
          throw new Error(err.error || "Błąd logowania");
        });
      }
      return response.json();
    })
    .then((data) => {
      token = data.token;
      localStorage.setItem("token", token);
      document.getElementById("auth").style.display = "none";
      document.getElementById("notes-app").style.display = "block";
      loadNotes();
    })
    .catch((error) => alert(error.message));
}

function logout() {
  localStorage.removeItem("token");
  token = null;
  document.getElementById("auth").style.display = "block";
  document.getElementById("notes-app").style.display = "none";
  document.getElementById("notesList").innerHTML = "";
}

function loadNotes() {
  fetch("http://localhost:5001/notes", {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((response) => {
      if (!response.ok) throw new Error("Błąd ładowania notatek");
      return response.json();
    })
    .then((notes) => {
      const notesList = document.getElementById("notesList");
      notesList.innerHTML = "";
      notes.forEach((note) => {
        const li = document.createElement("li");
        li.setAttribute("data-id", note.id);
        li.innerHTML = `
                <span><strong>${note.title}</strong>: ${
          note.content
        } <small>(${new Date(note.created_at).toLocaleString()})</small></span>
                <button onclick="editNote(${note.id}, this)">Edytuj</button>
                <button onclick="deleteNote(${note.id})">Usuń</button>
            `;
        notesList.appendChild(li);
      });
    })
    .catch((error) => {
      alert(error.message);
      logout();
    });
}

function addNote() {
  const title = document.getElementById("newNoteTitle").value;
  const content = document.getElementById("newNote").value;
  if (!title || !content) {
    alert("Proszę wpisać tytuł i treść notatki");
    return;
  }
  fetch("http://localhost:5001/notes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ title, content }),
  })
    .then((response) => {
      if (!response.ok) throw new Error("Błąd dodawania notatki");
      return response.json();
    })
    .then(() => {
      document.getElementById("newNoteTitle").value = "";
      document.getElementById("newNote").value = "";
      loadNotes();
    })
    .catch((error) => alert(error.message));
}

function editNote(id, button) {
  const li = button.parentElement;
  const title = li.querySelector("span strong").textContent;
  const content = li
    .querySelector("span")
    .childNodes[1].textContent.split(" (")[0]
    .trim();
  const newTitle = prompt("Edytuj tytuł:", title);
  const newContent = prompt("Edytuj treść:", content);
  if (newTitle && newContent) {
    fetch(`http://localhost:5001/notes/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ title: newTitle, content: newContent }),
    })
      .then((response) => {
        if (!response.ok) throw new Error("Błąd edytowania notatki");
        return response.json();
      })
      .then(() => loadNotes())
      .catch((error) => alert(error.message));
  }
}

function deleteNote(id) {
  fetch(`http://localhost:5001/notes/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((response) => {
      if (!response.ok) throw new Error("Błąd usuwania notatki");
      return response.json();
    })
    .then(() => loadNotes())
    .catch((error) => alert(error.message));
}

function sortNotes(criteria) {
  fetch("http://localhost:5001/notes", {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((response) => response.json())
    .then((notes) => {
      let sortedNotes;
      if (criteria === "title") {
        sortedNotes = notes.sort((a, b) => a.title.localeCompare(b.title));
      } else {
        // Domyślnie sortuj po dacie (criteria === 'date')
        sortedNotes = notes.sort((a, b) => {
          const dateA = new Date(a.created_at);
          const dateB = new Date(b.created_at);
          return dateA > dateB ? -1 : 1;
        });
      }
      const notesList = document.getElementById("notesList");
      notesList.innerHTML = "";
      sortedNotes.forEach((note) => {
        const li = document.createElement("li");
        li.setAttribute("data-id", note.id);
        li.innerHTML = `
              <span><strong>${note.title}</strong>: ${
          note.content
        } <small>(${new Date(note.created_at).toLocaleString()})</small></span>
              <button onclick="editNote(${note.id}, this)">Edytuj</button>
              <button onclick="deleteNote(${note.id})">Usuń</button>
          `;
        notesList.appendChild(li);
      });
    })
    .catch((error) => alert("Błąd podczas sortowania: " + error.message));
}

function searchNotes() {
  const query = document.getElementById("searchInput").value.toLowerCase();
  fetch("http://localhost:5001/notes", {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((response) => response.json())
    .then((notes) => {
      const filteredNotes = notes.filter(
        (note) =>
          note.title.toLowerCase().includes(query) ||
          note.content.toLowerCase().includes(query)
      );
      const notesList = document.getElementById("notesList");
      notesList.innerHTML = "";
      filteredNotes.forEach((note) => {
        const li = document.createElement("li");
        li.setAttribute("data-id", note.id);
        li.innerHTML = `
                <span><strong>${note.title}</strong>: ${
          note.content
        } <small>(${new Date(note.created_at).toLocaleString()})</small></span>
                <button onclick="editNote(${note.id}, this)">Edytuj</button>
                <button onclick="deleteNote(${note.id})">Usuń</button>
            `;
        notesList.appendChild(li);
      });
    })
    .catch((error) => alert("Błąd podczas wyszukiwania: " + error.message));
}
