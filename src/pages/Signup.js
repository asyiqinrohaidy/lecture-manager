// src/pages/Signup.js
import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from '../utils/firebaseConfig';
import { useNavigate, Link } from 'react-router-dom';
import {
  Box, TextField, Button, Typography, Paper, CssBaseline
} from '@mui/material';
import { useThemeMode } from '../context/ThemeContext';
import { ThemeProvider, createTheme } from '@mui/material/styles';

const Signup = () => {
  const navigate = useNavigate();
  const { darkMode } = useThemeMode(); // ✅ shared dark mode

  const theme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
    },
  });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const signupUser = async (e) => {
    e.preventDefault();
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      navigate('/dashboard');
    } catch (error) {
      alert("Signup failed: " + error.message);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'background.default'
      }}>
        <Paper elevation={3} sx={{ p: 4, maxWidth: 400, width: '100%' }}>
          <Typography variant="h5" gutterBottom>
            ✍️ Create a New Account
          </Typography>
          <form onSubmit={signupUser}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              margin="normal"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              margin="normal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button type="submit" variant="contained" fullWidth sx={{ mt: 2 }}>
              Sign Up
            </Button>
          </form>
          <Typography variant="body2" align="center" sx={{ mt: 2 }}>
            Already have an account? <Link to="/login">Login</Link>
          </Typography>
        </Paper>
      </Box>
    </ThemeProvider>
  );
};

export default Signup;
