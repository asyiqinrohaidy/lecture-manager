// src/components/Navbar.js
import React from 'react';
import { AppBar, Toolbar, Typography, Button, Switch, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { auth } from '../utils/firebaseConfig';
import { useThemeMode } from '../context/ThemeContext';

const Navbar = () => {
  const navigate = useNavigate();
  const { darkMode, toggleTheme } = useThemeMode();

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/login');
  };

  return (
    <AppBar position="static" color="default" sx={{ mb: 2 }}>
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        <Box>
          <Button onClick={() => navigate('/dashboard')} color="inherit">Dashboard</Button>
          <Button onClick={() => navigate('/reports')} color="inherit">Reports</Button>
        </Box>
        <Box display="flex" alignItems="center" gap={2}>
          <Typography>Dark Mode</Typography>
          <Switch checked={darkMode} onChange={toggleTheme} />
          <Button onClick={handleLogout} variant="outlined" color="error">Logout</Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
