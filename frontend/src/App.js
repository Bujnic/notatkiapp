import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { motion } from "framer-motion";
import {
  Container,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Switch,
  Chip,
  Modal,
  Fade,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Logout as LogoutIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Download as DownloadIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Visibility as VisibilityIcon,
  Image as ImageIcon, // Dodaj ImageIcon tutaj
} from "@mui/icons-material";
import { FcGoogle } from "react-icons/fc";
import Tesseract from "tesseract.js"; // Import Tesseract.js
import "./App.css";

function App() {
  const [isEditingInModal, setIsEditingInModal] = useState(false);
  const [modalNoteTitle, setModalNoteTitle] = useState("");
  const [modalNoteContent, setModalNoteContent] = useState("");
  const [modalNoteCategory, setModalNoteCategory] = useState("");
  const [modalNoteTags, setModalNoteTags] = useState([]);
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [notes, setNotes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteContent, setNewNoteContent] = useState("");
  const [newNoteCategory, setNewNoteCategory] = useState("");
  const [newNoteTags, setNewNoteTags] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newTagName, setNewTagName] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem("darkMode") === "true"
  );
  const [editingNote, setEditingNote] = useState(null);
  const [expandedNotes, setExpandedNotes] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);

  useEffect(() => {
    const validateToken = async () => {
      setIsLoading(true);
      const storedToken = localStorage.getItem("token");
      console.log("Token przy starcie (localStorage):", storedToken);

      const urlParams = new URLSearchParams(window.location.search);
      const urlToken = urlParams.get("token");
      console.log("Token z URL:", urlToken);

      if (urlToken) {
        console.log("Znaleziono token w URL, zapisywanie...");
        localStorage.setItem("token", urlToken);
        setToken(urlToken);
        window.history.replaceState({}, document.title, "/");
      } else if (storedToken) {
        try {
          await axios.get("http://localhost:5001/notes", {
            headers: { Authorization: `Bearer ${storedToken}` },
          });
          setToken(storedToken);
        } catch (err) {
          console.log("Token nieważny, czyszczenie localStorage:", err.message);
          localStorage.removeItem("token");
          setToken("");
        }
      } else {
        setToken("");
      }
      setIsLoading(false);
    };

    validateToken();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (token) {
        try {
          setIsLoading(true);
          const [categoriesData, tagsData] = await Promise.all([
            fetchCategories(),
            fetchTags(),
          ]);
          console.log("Kategorie po pobraniu:", categoriesData);
          console.log("Tagi po pobraniu:", tagsData);
          setCategories(categoriesData || []);
          setTags(tagsData || []);
          await fetchNotes(categoriesData);
        } catch (err) {
          toast.error("Błąd pobierania danych: " + err.message);
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchData();
  }, [token]);

  useEffect(() => {
    localStorage.setItem("darkMode", darkMode);
    document.body.className = darkMode ? "dark-mode" : "";
  }, [darkMode]);

  const fetchNotes = useCallback(
    async (categoriesData) => {
      try {
        const res = await axios.get("http://localhost:5001/notes", {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log("Surowe dane notatek z backendu:", res.data);
        console.log("Kategorie przekazane do fetchNotes:", categoriesData);
        const updatedNotes = res.data.map((note) => {
          const category = (categoriesData || categories).find(
            (cat) => cat.id === note.category_id
          );
          return {
            ...note,
            category_name: category ? category.name : "Brak kategorii",
            tags: note.tags || [],
          };
        });
        console.log("Przetworzone notatki:", updatedNotes);
        setNotes(updatedNotes);
      } catch (err) {
        toast.error("Błąd pobierania notatek: " + err.message);
        setNotes([]);
      }
    },
    [token, categories]
  );

  const fetchCategories = useCallback(async () => {
    try {
      const res = await axios.get("http://localhost:5001/categories", {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("Pobrane kategorie:", res.data);
      setCategories(res.data || []);
      return res.data;
    } catch (err) {
      toast.error("Błąd pobierania kategorii: " + err.message);
      console.error("Szczegóły błędu pobierania kategorii:", err);
      setCategories([]);
      return [];
    }
  }, [token]);

  const fetchTags = useCallback(async () => {
    try {
      const res = await axios.get("http://localhost:5001/tags", {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("Pobrane tagi:", res.data);
      setTags(res.data || []);
      return res.data;
    } catch (err) {
      toast.error("Błąd pobierania tagów: " + err.message);
      console.error("Szczegóły błędu pobierania tagów:", err);
      setTags([]);
      return [];
    }
  }, [token]);
  const handleLogin = async () => {
    try {
      const res = await axios.post("http://localhost:5001/login", {
        email,
        password,
      });
      setToken(res.data.token);
      localStorage.setItem("token", res.data.token);
    } catch (err) {
      toast.error(
        "Błąd logowania: " + (err.response?.data?.error || err.message)
      );
    }
  };

  const handleRegister = async () => {
    try {
      await axios.post("http://localhost:5001/register", { email, password });
      toast.success("Rejestracja udana! Możesz się zalogować.");
    } catch (err) {
      toast.error(
        "Błąd rejestracji: " + (err.response?.data?.error || err.message)
      );
    }
  };

  const handleAddCategory = async () => {
    try {
      const res = await axios.post(
        "http://localhost:5001/categories",
        { name: newCategoryName },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCategories([...categories, res.data]);
      setNewCategoryName("");
      toast.success("Kategoria dodana!");
      await fetchNotes(categories);
    } catch (err) {
      toast.error("Błąd dodawania kategorii: " + err.message);
    }
  };

  const handleAddTag = async () => {
    try {
      const res = await axios.post(
        "http://localhost:5001/tags",
        { name: newTagName },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTags([...tags, res.data]);
      setNewTagName("");
      toast.success("Tag dodany!");
    } catch (err) {
      toast.error("Błąd dodawania tagu: " + err.message);
    }
  };

  const handleAddNote = async () => {
    try {
      const res = await axios.post(
        "http://localhost:5001/notes",
        {
          title: newNoteTitle,
          content: newNoteContent,
          category_id: newNoteCategory || null,
          tags: newNoteTags,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const category = categories.find(
        (cat) => cat.id === res.data.category_id
      );
      const newNote = {
        ...res.data,
        category_name: category ? category.name : null,
        tags: tags.filter((tag) => newNoteTags.includes(tag.id)),
      };
      setNotes([newNote, ...notes]);
      setNewNoteTitle("");
      setNewNoteContent("");
      setNewNoteCategory("");
      setNewNoteTags([]);
      toast.success("Notatka dodana!");
      await fetchNotes(categories);
    } catch (err) {
      toast.error("Błąd dodawania notatki: " + err.message);
    }
  };

  const handleEditNote = async (id) => {
    try {
      const titleToUse = isEditingInModal ? modalNoteTitle : newNoteTitle;
      const contentToUse = isEditingInModal ? modalNoteContent : newNoteContent;
      const categoryToUse = isEditingInModal
        ? modalNoteCategory
        : newNoteCategory;
      const tagsToUse = isEditingInModal ? modalNoteTags : newNoteTags;

      const res = await axios.put(
        `http://localhost:5001/notes/${id}`,
        {
          title: titleToUse,
          content: contentToUse,
          category_id: categoryToUse || null,
          tags: tagsToUse,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const category = categories.find(
        (cat) => cat.id === res.data.category_id
      );
      const updatedNote = {
        ...res.data,
        category_name: category ? category.name : null,
        tags: tags.filter((tag) => tagsToUse.includes(tag.id)),
      };
      setNotes(notes.map((note) => (note.id === id ? updatedNote : note)));

      if (isEditingInModal) {
        setIsEditingInModal(false);
        setOpenModal(false);
        setSelectedNote(null);
      } else {
        setEditingNote(null);
        setNewNoteTitle("");
        setNewNoteContent("");
        setNewNoteCategory("");
        setNewNoteTags([]);
      }

      toast.success("Notatka zaktualizowana!");
      await fetchNotes(categories);
    } catch (err) {
      toast.error("Błąd edytowania notatki: " + err.message);
    }
  };

  const handleDeleteNote = async (id) => {
    try {
      await axios.delete(`http://localhost:5001/notes/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotes(notes.filter((note) => note.id !== id));
      toast.success("Notatka usunięta!");
      await fetchNotes(categories);
    } catch (err) {
      toast.error("Błąd usuwania notatki: " + err.message);
    }
  };

  const handleToggleImportant = async (id, isImportant) => {
    try {
      const res = await axios.patch(
        `http://localhost:5001/notes/${id}/important`,
        { isImportant: isImportant ? 0 : 1 },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const category = categories.find(
        (cat) => cat.id === res.data.category_id
      );
      const updatedNote = {
        ...res.data,
        category_name: category ? category.name : null,
      };
      setNotes(notes.map((note) => (note.id === id ? updatedNote : note)));
      toast.success(
        isImportant ? "Usunięto ważność!" : "Oznaczono notatkę jako ważną!"
      );
      await fetchNotes(categories);
    } catch (err) {
      toast.error("Błąd oznaczania notatki: " + err.message);
    }
  };

  const handleExportNotes = () => {
    const exportData = notes.map((note) => ({
      title: note.title,
      content: note.content,
      category: note.category_name || "Brak kategorii",
      tags: note.tags ? note.tags.map((tag) => tag.name).join(", ") : "",
      created_at: note.created_at,
    }));
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "notatki.json";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Notatki wyeksportowane!");
  };

  const handleSort = (type) => {
    setSortBy(type);
    let sortedNotes = [...notes];
    if (type === "date") {
      sortedNotes.sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );
    } else if (type === "title") {
      sortedNotes.sort((a, b) => a.title.localeCompare(b.title));
    } else if (type === "important") {
      sortedNotes.sort((a, b) => b.isImportant - a.isImportant);
    }
    setNotes(sortedNotes);
  };

  const filteredNotes = notes
    .filter((note) =>
      filterCategory ? note.category_id === parseInt(filterCategory) : true
    )
    .filter((note) =>
      filterTag
        ? note.tags && note.tags.some((tag) => tag.id === parseInt(filterTag))
        : true
    )
    .filter((note) =>
      note.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const toggleNoteExpansion = (id) => {
    setExpandedNotes((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleLogout = () => {
    console.log("Wylogowanie wywołane");
    localStorage.removeItem("token");
    console.log(
      "localStorage po usunięciu tokenu:",
      localStorage.getItem("token")
    );
    setToken("");
    setNotes([]);
    setCategories([]);
    setTags([]);
    setNewNoteTitle("");
    setNewNoteContent("");
    setNewNoteCategory("");
    setNewNoteTags([]);
    setNewCategoryName("");
    setNewTagName("");
    setFilterCategory("");
    setFilterTag("");
    setSearchQuery("");
    setSortBy("date");
    setEditingNote(null);
    setExpandedNotes({});
    setIsLoading(true);
    window.location.href = "/";
  };

  const handleOpenModal = (note) => {
    setSelectedNote(note);
    setModalNoteTitle(note.title);
    setModalNoteContent(note.content);
    setModalNoteCategory(note.category_id || "");
    setModalNoteTags(note.tags ? note.tags.map((tag) => tag.id) : []);
    setOpenModal(true);
    setIsEditingInModal(false); // Reset trybu edycji przy otwieraniu modala
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setSelectedNote(null);
    setIsEditingInModal(false);
    setModalNoteTitle("");
    setModalNoteContent("");
    setModalNoteCategory("");
    setModalNoteTags([]);
  };

  const handleStartEditingInModal = () => {
    setIsEditingInModal(true);
  };

  const handleCancelEditingInModal = () => {
    setIsEditingInModal(false);
    setModalNoteTitle(selectedNote.title);
    setModalNoteContent(selectedNote.content);
    setModalNoteCategory(selectedNote.category_id || "");
    setModalNoteTags(
      selectedNote.tags ? selectedNote.tags.map((tag) => tag.id) : []
    );
  };
  // eslint-disable-next-line
  const [imageFile, setImageFile] = useState(null); // Stan dla przesłanego zdjęcia
  // eslint-disable-next-line
  const [ocrText, setOcrText] = useState(""); // Stan dla rozpoznanego tekstu
  // eslint-disable-next-line
  const [isProcessingOCR, setIsProcessingOCR] = useState(false); // Stan dla śledzenia procesu OCR

  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          background: darkMode
            ? "linear-gradient(135deg, #0d0d0d 0%, #1a1a2e 100%)"
            : "linear-gradient(135deg, #f0f4f8 0%, #d9e2ec 100%)",
        }}
      >
        <Typography
          variant="h6"
          sx={{ color: darkMode ? "#e0e0e0" : "#2d3748" }}
        >
          Ładowanie...
        </Typography>
      </Box>
    );
  }
  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setImageFile(file);
    setIsProcessingOCR(true);
    toast.info("Przetwarzanie obrazu...");

    try {
      const {
        data: { text },
      } = await Tesseract.recognize(file, "eng", {
        logger: (m) => console.log(m), // Logowanie postępu
      });
      setOcrText(text);
      setNewNoteContent(text); // Wypełnij pole treści notatki rozpoznanym tekstem
      setNewNoteTitle("Notatka z OCR"); // Domyślny tytuł
      toast.success("Tekst rozpoznany pomyślnie!");
    } catch (err) {
      toast.error("Błąd rozpoznawania tekstu: " + err.message);
      setOcrText("");
    } finally {
      setIsProcessingOCR(false);
    }
  };

  if (!token) {
    return (
      <Container
        maxWidth="sm"
        sx={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Typography variant="h4" align="center" gutterBottom>
            Logowanie
          </Typography>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              backgroundColor: darkMode ? "#333" : "#fff",
              padding: 3,
              borderRadius: 2,
              boxShadow: 3,
            }}
          >
            <TextField
              label="E-mail"
              variant="outlined"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              sx={{
                "& .MuiOutlinedInput-root": {
                  "& fieldset": {
                    borderColor: darkMode ? "#666" : "#ccc",
                  },
                  "&:hover fieldset": {
                    borderColor: darkMode ? "#888" : "#999",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: darkMode ? "#1e90ff" : "#1976d2",
                  },
                },
                "& .MuiInputLabel-root": {
                  color: darkMode ? "#bbb" : "#666",
                },
                "& .MuiInputBase-input": {
                  color: darkMode ? "#fff" : "#333",
                },
              }}
            />
            <TextField
              label="Hasło"
              variant="outlined"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              sx={{
                "& .MuiOutlinedInput-root": {
                  "& fieldset": {
                    borderColor: darkMode ? "#666" : "#ccc",
                  },
                  "&:hover fieldset": {
                    borderColor: darkMode ? "#888" : "#999",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: darkMode ? "#1e90ff" : "#1976d2",
                  },
                },
                "& .MuiInputLabel-root": {
                  color: darkMode ? "#bbb" : "#666",
                },
                "& .MuiInputBase-input": {
                  color: darkMode ? "#fff" : "#333",
                },
              }}
            />
            <Button
              variant="contained"
              color="primary"
              onClick={handleLogin}
              startIcon={<AddIcon />}
            >
              Zaloguj się
            </Button>
            <Button
              variant="contained"
              color="success"
              onClick={handleRegister}
              startIcon={<AddIcon />}
            >
              Zarejestruj się
            </Button>
            <Button
              variant="contained"
              sx={{ backgroundColor: "#fff", color: "#333" }}
              startIcon={<FcGoogle />}
              href="http://localhost:5001/auth/google"
            >
              Zaloguj się przez Google
            </Button>
          </Box>
        </motion.div>
        <ToastContainer />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 4,
          }}
        >
          <Typography variant="h4">Moje notatki</Typography>
          <Button
            variant="contained"
            color="error"
            startIcon={<LogoutIcon />}
            onClick={handleLogout}
          >
            Wyloguj się
          </Button>
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Dodaj kategorię
          </Typography>
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <TextField
              label="Nazwa kategorii"
              variant="outlined"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              sx={{
                flex: 1,
                minWidth: 200,
                "& .MuiOutlinedInput-root": {
                  "& fieldset": {
                    borderColor: darkMode ? "#666" : "#ccc",
                  },
                  "&:hover fieldset": {
                    borderColor: darkMode ? "#888" : "#999",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: darkMode ? "#1e90ff" : "#1976d2",
                  },
                },
                "& .MuiInputLabel-root": {
                  color: darkMode ? "#bbb" : "#666",
                },
                "& .MuiInputBase-input": {
                  color: darkMode ? "#fff" : "#333",
                },
              }}
            />
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleAddCategory}
            >
              Dodaj kategorię
            </Button>
          </Box>
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Dodaj tag
          </Typography>
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <TextField
              label="Nazwa tagu (np. #projekt)"
              variant="outlined"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              sx={{
                flex: 1,
                minWidth: 200,
                "& .MuiOutlinedInput-root": {
                  "& fieldset": {
                    borderColor: darkMode ? "#666" : "#ccc",
                  },
                  "&:hover fieldset": {
                    borderColor: darkMode ? "#888" : "#999",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: darkMode ? "#1e90ff" : "#1976d2",
                  },
                },
                "& .MuiInputLabel-root": {
                  color: darkMode ? "#bbb" : "#666",
                },
                "& .MuiInputBase-input": {
                  color: darkMode ? "#fff" : "#333",
                },
              }}
            />
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleAddTag}
            >
              Dodaj tag
            </Button>
          </Box>
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Dodaj notatkę
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              label="Tytuł notatki"
              variant="outlined"
              value={newNoteTitle}
              onChange={(e) => setNewNoteTitle(e.target.value)}
              sx={{
                "& .MuiOutlinedInput-root": {
                  "& fieldset": {
                    borderColor: darkMode ? "#666" : "#ccc",
                  },
                  "&:hover fieldset": {
                    borderColor: darkMode ? "#888" : "#999",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: darkMode ? "#1e90ff" : "#1976d2",
                  },
                },
                "& .MuiInputLabel-root": {
                  color: darkMode ? "#bbb" : "#666",
                },
                "& .MuiInputBase-input": {
                  color: darkMode ? "#fff" : "#333",
                },
              }}
            />
            <TextField
              label="Wpisz notatkę"
              variant="outlined"
              multiline
              rows={4}
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              sx={{
                "& .MuiOutlinedInput-root": {
                  "& fieldset": {
                    borderColor: darkMode ? "#666" : "#ccc",
                  },
                  "&:hover fieldset": {
                    borderColor: darkMode ? "#888" : "#999",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: darkMode ? "#1e90ff" : "#1976d2",
                  },
                },
                "& .MuiInputLabel-root": {
                  color: darkMode ? "#bbb" : "#666",
                },
                "& .MuiInputBase-input": {
                  color: darkMode ? "#fff" : "#333",
                },
              }}
            />
            <FormControl variant="outlined">
              <InputLabel sx={{ color: darkMode ? "#bbb" : "#666" }}>
                Kategoria
              </InputLabel>
              <Select
                value={newNoteCategory}
                onChange={(e) => setNewNoteCategory(e.target.value)}
                label="Kategoria"
                sx={{
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: darkMode ? "#666" : "#ccc",
                  },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: darkMode ? "#888" : "#999",
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: darkMode ? "#1e90ff" : "#1976d2",
                  },
                  "& .MuiInputBase-input": {
                    color: darkMode ? "#fff" : "#333",
                  },
                }}
              >
                <MenuItem value="">Bez kategorii</MenuItem>
                {categories.map((category) => (
                  <MenuItem key={category.id} value={category.id}>
                    {category.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl variant="outlined">
              <InputLabel sx={{ color: darkMode ? "#bbb" : "#666" }}>
                Tagi
              </InputLabel>
              <Select
                multiple
                value={newNoteTags}
                onChange={(e) =>
                  setNewNoteTags(
                    Array.from(e.target.value, (value) => parseInt(value))
                  )
                }
                label="Tagi"
                renderValue={(selected) => (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {selected.map((value) => {
                      const tag = tags.find((t) => t.id === value);
                      return tag ? <Chip key={value} label={tag.name} /> : null;
                    })}
                  </Box>
                )}
                sx={{
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: darkMode ? "#666" : "#ccc",
                  },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: darkMode ? "#888" : "#999",
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: darkMode ? "#1e90ff" : "#1976d2",
                  },
                  "& .MuiInputBase-input": {
                    color: darkMode ? "#fff" : "#333",
                  },
                }}
              >
                {tags.map((tag) => (
                  <MenuItem key={tag.id} value={tag.id}>
                    {tag.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Button
                variant="contained"
                component="label"
                startIcon={<ImageIcon />}
                disabled={isProcessingOCR}
              >
                {isProcessingOCR ? "Przetwarzanie..." : "Prześlij zdjęcie"}
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleImageUpload}
                />
              </Button>
              {ocrText && (
                <Typography
                  variant="body2"
                  sx={{ color: darkMode ? "#ddd" : "#666" }}
                >
                  Rozpoznany tekst: {ocrText}
                </Typography>
              )}
            </Box>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={
                editingNote
                  ? () => handleEditNote(editingNote.id)
                  : handleAddNote
              }
            >
              {editingNote ? "Zapisz zmiany" : "Dodaj notatkę"}
            </Button>
          </Box>
        </Box>

        <Box sx={{ mb: 4, display: "flex", gap: 2, flexWrap: "wrap" }}>
          <FormControl variant="outlined" sx={{ minWidth: 200 }}>
            <InputLabel sx={{ color: darkMode ? "#bbb" : "#666" }}>
              Kategoria
            </InputLabel>
            <Select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              label="Kategoria"
              sx={{
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: darkMode ? "#666" : "#ccc",
                },
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: darkMode ? "#888" : "#999",
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor: darkMode ? "#1e90ff" : "#1976d2",
                },
                "& .MuiInputBase-input": {
                  color: darkMode ? "#fff" : "#333",
                },
              }}
            >
              <MenuItem value="">Wszystkie kategorie</MenuItem>
              {categories.map((category) => (
                <MenuItem key={category.id} value={category.id}>
                  {category.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl variant="outlined" sx={{ minWidth: 200 }}>
            <InputLabel sx={{ color: darkMode ? "#bbb" : "#666" }}>
              Tag
            </InputLabel>
            <Select
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
              label="Tag"
              sx={{
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: darkMode ? "#666" : "#ccc",
                },
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: darkMode ? "#888" : "#999",
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor: darkMode ? "#1e90ff" : "#1976d2",
                },
                "& .MuiInputBase-input": {
                  color: darkMode ? "#fff" : "#333",
                },
              }}
            >
              <MenuItem value="">Wszystkie tagi</MenuItem>
              {tags.map((tag) => (
                <MenuItem key={tag.id} value={tag.id}>
                  {tag.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant={sortBy === "date" ? "contained" : "outlined"}
            onClick={() => handleSort("date")}
            sx={{
              color: darkMode ? "#fff" : "#333",
              borderColor: darkMode ? "#666" : "#ccc",
              "&:hover": {
                borderColor: darkMode ? "#888" : "#999",
              },
            }}
          >
            Sortuj według daty
          </Button>
          <Button
            variant={sortBy === "title" ? "contained" : "outlined"}
            onClick={() => handleSort("title")}
            sx={{
              color: darkMode ? "#fff" : "#333",
              borderColor: darkMode ? "#666" : "#ccc",
              "&:hover": {
                borderColor: darkMode ? "#888" : "#999",
              },
            }}
          >
            Sortuj według tytułu
          </Button>
          <Button
            variant={sortBy === "important" ? "contained" : "outlined"}
            onClick={() => handleSort("important")}
            sx={{
              color: darkMode ? "#fff" : "#333",
              borderColor: darkMode ? "#666" : "#ccc",
              "&:hover": {
                borderColor: darkMode ? "#888" : "#999",
              },
            }}
          >
            Sortuj według ważności
          </Button>
          <Typography
            sx={{ color: darkMode ? "#fff" : "#333", alignSelf: "center" }}
          >
            Aktualne sortowanie:{" "}
            {sortBy === "date"
              ? "Data"
              : sortBy === "title"
              ? "Tytuł"
              : "Ważność"}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Switch
              checked={darkMode}
              onChange={() => setDarkMode(!darkMode)}
              icon={<LightModeIcon />}
              checkedIcon={<DarkModeIcon />}
            />
            <Typography sx={{ color: darkMode ? "#fff" : "#333" }}>
              {darkMode ? "Tryb ciemny" : "Tryb jasny"}
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExportNotes}
            sx={{
              color: darkMode ? "#fff" : "#333",
              borderColor: darkMode ? "#666" : "#ccc",
              "&:hover": {
                borderColor: darkMode ? "#888" : "#999",
              },
            }}
          >
            Eksportuj notatki
          </Button>
          <TextField
            label="Szukaj notatek"
            variant="outlined"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{
              minWidth: 200,
              "& .MuiOutlinedInput-root": {
                "& fieldset": {
                  borderColor: darkMode ? "#666" : "#ccc",
                },
                "&:hover fieldset": {
                  borderColor: darkMode ? "#888" : "#999",
                },
                "&.Mui-focused fieldset": {
                  borderColor: darkMode ? "#1e90ff" : "#1976d2",
                },
              },
              "& .MuiInputLabel-root": {
                color: darkMode ? "#bbb" : "#666",
              },
              "& .MuiInputBase-input": {
                color: darkMode ? "#fff" : "#333",
              },
            }}
          />
        </Box>

        <Box>
          {filteredNotes.map((note) => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card
                sx={{
                  mb: 2,
                  borderLeft: note.isImportant ? "5px solid #ffd700" : "none",
                  transition: "transform 0.2s",
                  "&:hover": { transform: "scale(1.02)" },
                  backgroundColor: darkMode ? "#333" : "#fff",
                }}
              >
                <CardContent>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      cursor: "pointer",
                    }}
                    onClick={() => toggleNoteExpansion(note.id)}
                  >
                    <Typography
                      variant="h6"
                      sx={{ color: darkMode ? "#fff" : "#333" }}
                    >
                      {note.title}{" "}
                      {note.category_name && (
                        <Chip
                          label={note.category_name}
                          size="small"
                          sx={{ ml: 1 }}
                        />
                      )}
                      {note.tags &&
                        note.tags.map((tag) => (
                          <Chip
                            key={tag.id}
                            label={tag.name}
                            size="small"
                            sx={{ ml: 1 }}
                          />
                        ))}
                    </Typography>
                    <IconButton>
                      {expandedNotes[note.id] ? (
                        <ExpandLessIcon />
                      ) : (
                        <ExpandMoreIcon />
                      )}
                    </IconButton>
                  </Box>
                  {expandedNotes[note.id] && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Typography
                        variant="body2"
                        sx={{ mt: 1, color: darkMode ? "#ddd" : "#666" }}
                      >
                        {note.content}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ color: darkMode ? "#bbb" : "#999" }}
                      >
                        {note.created_at}
                      </Typography>
                    </motion.div>
                  )}
                </CardContent>
                <CardActions>
                  <IconButton
                    onClick={() =>
                      handleToggleImportant(note.id, note.isImportant)
                    }
                    color={note.isImportant ? "warning" : "default"}
                  >
                    {note.isImportant ? <StarIcon /> : <StarBorderIcon />}
                  </IconButton>
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenModal(note);
                    }}
                    color="default"
                  >
                    <VisibilityIcon />
                  </IconButton>
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingNote(note);
                      setNewNoteTitle(note.title);
                      setNewNoteContent(note.content);
                      setNewNoteCategory(note.category_id || "");
                      setNewNoteTags(
                        note.tags ? note.tags.map((tag) => tag.id) : []
                      );
                    }}
                    color="primary"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteNote(note.id);
                    }}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </CardActions>
              </Card>
            </motion.div>
          ))}
        </Box>

        <Modal
          open={openModal}
          onClose={handleCloseModal}
          closeAfterTransition
          BackdropProps={{
            timeout: 500,
          }}
        >
          <Fade in={openModal}>
            <Box
              sx={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: 400,
                bgcolor: darkMode ? "#333" : "#fff",
                border: "2px solid #000",
                boxShadow: 24,
                p: 4,
                borderRadius: 2,
              }}
            >
              {selectedNote && (
                <>
                  {isEditingInModal ? (
                    <>
                      <TextField
                        label="Tytuł notatki"
                        variant="outlined"
                        value={modalNoteTitle}
                        onChange={(e) => setModalNoteTitle(e.target.value)}
                        fullWidth
                        sx={{ mb: 2 }}
                      />
                      <TextField
                        label="Treść notatki"
                        variant="outlined"
                        multiline
                        rows={4}
                        value={modalNoteContent}
                        onChange={(e) => setModalNoteContent(e.target.value)}
                        fullWidth
                        sx={{ mb: 2 }}
                      />
                      <FormControl variant="outlined" fullWidth sx={{ mb: 2 }}>
                        <InputLabel>Kategoria</InputLabel>
                        <Select
                          value={modalNoteCategory}
                          onChange={(e) => setModalNoteCategory(e.target.value)}
                          label="Kategoria"
                        >
                          <MenuItem value="">Bez kategorii</MenuItem>
                          {categories.map((category) => (
                            <MenuItem key={category.id} value={category.id}>
                              {category.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <FormControl variant="outlined" fullWidth sx={{ mb: 2 }}>
                        <InputLabel>Tagi</InputLabel>
                        <Select
                          multiple
                          value={modalNoteTags}
                          onChange={(e) =>
                            setModalNoteTags(
                              Array.from(e.target.value, (value) =>
                                parseInt(value)
                              )
                            )
                          }
                          label="Tagi"
                          renderValue={(selected) => (
                            <Box
                              sx={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 0.5,
                              }}
                            >
                              {selected.map((value) => {
                                const tag = tags.find((t) => t.id === value);
                                return tag ? (
                                  <Chip key={value} label={tag.name} />
                                ) : null;
                              })}
                            </Box>
                          )}
                        >
                          {tags.map((tag) => (
                            <MenuItem key={tag.id} value={tag.id}>
                              {tag.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
                        <Button
                          onClick={() => handleEditNote(selectedNote.id)}
                          variant="contained"
                          color="primary"
                        >
                          Zapisz
                        </Button>
                        <Button
                          onClick={handleCancelEditingInModal}
                          variant="outlined"
                          color="secondary"
                        >
                          Anuluj
                        </Button>
                      </Box>
                    </>
                  ) : (
                    <>
                      <Typography
                        variant="h6"
                        component="h2"
                        sx={{ color: darkMode ? "#fff" : "#333" }}
                      >
                        {selectedNote.title}
                      </Typography>
                      <Typography
                        sx={{ mt: 2, color: darkMode ? "#ddd" : "#666" }}
                      >
                        {selectedNote.content}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          mt: 2,
                          display: "block",
                          color: darkMode ? "#bbb" : "#999",
                        }}
                      >
                        Utworzono: {selectedNote.created_at}
                      </Typography>
                      {selectedNote.category_name && (
                        <Chip
                          label={selectedNote.category_name}
                          size="small"
                          sx={{ mt: 1 }}
                        />
                      )}
                      {selectedNote.tags && selectedNote.tags.length > 0 && (
                        <Box sx={{ mt: 1 }}>
                          {selectedNote.tags.map((tag) => (
                            <Chip
                              key={tag.id}
                              label={tag.name}
                              size="small"
                              sx={{ mr: 1 }}
                            />
                          ))}
                        </Box>
                      )}
                      <Box sx={{ display: "flex", gap: 2, mt: 3 }}>
                        <Button
                          onClick={handleStartEditingInModal}
                          variant="contained"
                          color="primary"
                          startIcon={<EditIcon />}
                        >
                          Edytuj
                        </Button>
                        <Button
                          onClick={handleCloseModal}
                          variant="outlined"
                          color="secondary"
                        >
                          Zamknij
                        </Button>
                      </Box>
                    </>
                  )}
                </>
              )}
            </Box>
          </Fade>
        </Modal>
      </motion.div>
      <ToastContainer />
    </Container>
  );
}

export default App;
