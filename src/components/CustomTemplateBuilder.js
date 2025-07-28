import React, { useState } from 'react';
import {
  Box, TextField, Button, Typography, IconButton, Stack, Paper
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth } from '../utils/firebaseConfig';

const db = getFirestore();

const CustomTemplateBuilder = ({ onTemplateSaved }) => {
  const [templateName, setTemplateName] = useState('');
  const [segments, setSegments] = useState([{ name: '', duration: 300 }]);

  const addSegment = () => setSegments([...segments, { name: '', duration: 300 }]);
  const removeSegment = (index) => setSegments(segments.filter((_, i) => i !== index));

  const updateSegment = (index, field, value) => {
    const updated = [...segments];
    updated[index][field] = field === 'duration' ? parseInt(value) : value;
    setSegments(updated);
  };

  const saveTemplate = async () => {
    const user = auth.currentUser;
    if (!user || !templateName.trim()) return;
    await addDoc(collection(db, 'templates'), {
      uid: user.uid,
      name: templateName.trim(),
      segments,
      createdAt: serverTimestamp()
    });
    setTemplateName('');
    setSegments([{ name: '', duration: 300 }]);
    onTemplateSaved();
  };

  return (
    <Paper sx={{ p: 3, mb: 4 }}>
      <Typography variant="h6">🎨 Create Custom Template</Typography>
      <TextField
        label="Template Name"
        value={templateName}
        onChange={(e) => setTemplateName(e.target.value)}
        fullWidth
        sx={{ my: 2 }}
      />
      {segments.map((seg, i) => (
        <Stack direction="row" spacing={2} alignItems="center" key={i} sx={{ mb: 1 }}>
          <TextField
            label="Segment Name"
            value={seg.name}
            onChange={(e) => updateSegment(i, 'name', e.target.value)}
            sx={{ flex: 1 }}
          />
          <TextField
            label="Duration (s)"
            type="number"
            value={seg.duration}
            onChange={(e) => updateSegment(i, 'duration', e.target.value)}
            sx={{ width: 120 }}
          />
          <IconButton onClick={() => removeSegment(i)} color="error">
            <DeleteIcon />
          </IconButton>
        </Stack>
      ))}
      <Button startIcon={<AddIcon />} onClick={addSegment} sx={{ mt: 1 }}>
        Add Segment
      </Button>
      <Box sx={{ textAlign: 'right', mt: 3 }}>
        <Button variant="contained" onClick={saveTemplate}>Save Template</Button>
      </Box>
    </Paper>
  );
};

export default CustomTemplateBuilder;
