// src/pages/Dashboard.js
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Card, CardContent, Stack,
  TextField, IconButton
} from '@mui/material';
import Navbar from '../components/Navbar';
import Timer from '../components/Timer';
import lectureTemplates from '../config/lectureTemplates';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { getFirestore, collection, addDoc, getDocs, query, where, deleteDoc, doc } from 'firebase/firestore';
import { auth } from '../utils/firebaseConfig';

const db = getFirestore();

const Dashboard = () => {
  const [lectureType, setLectureType] = useState('lecture');
  const [segments, setSegments] = useState([]);
  const [customTemplates, setCustomTemplates] = useState([]);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newSegments, setNewSegments] = useState([{ name: '', duration: 5 * 60 }]);

  // Load default or custom template
  useEffect(() => {
    if (lectureType === 'custom') {
      setSegments(newSegments);
    } else if (lectureTemplates[lectureType]) {
      const template = lectureTemplates[lectureType].map(seg => ({
        ...seg,
        reminderNotes: seg.reminderNotes ? [...seg.reminderNotes] : []
      }));
      setSegments(template);
    } else {
      const found = customTemplates.find(t => t.name === lectureType);
      if (found) setSegments(found.segments);
    }
  }, [lectureType, customTemplates, newSegments]);

  // Fetch custom templates from Firestore
  useEffect(() => {
    const fetchTemplates = async () => {
      const user = auth.currentUser;
      if (!user) return;
      const q = query(collection(db, 'templates'), where('uid', '==', user.uid));
      const snap = await getDocs(q);
      const templates = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCustomTemplates(templates);
    };
    fetchTemplates();
  }, []);

  // Save new custom template
  const saveCustomTemplate = async () => {
    if (!newTemplateName.trim()) {
      alert('Please enter a template name');
      return;
    }
    const user = auth.currentUser;
    if (!user) return;
    await addDoc(collection(db, 'templates'), {
      uid: user.uid,
      name: newTemplateName.trim(),
      segments: newSegments
    });
    alert('Custom template saved!');
    setNewTemplateName('');
    setNewSegments([{ name: '', duration: 5 * 60 }]);

    // Reload templates
    const q = query(collection(db, 'templates'), where('uid', '==', user.uid));
    const snap = await getDocs(q);
    setCustomTemplates(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  // Delete a custom template
  const deleteTemplate = async (templateId) => {
    await deleteDoc(doc(db, 'templates', templateId));
    setCustomTemplates(customTemplates.filter(t => t.id !== templateId));
  };

  // Add a new segment to the custom template
  const addNewSegment = () => setNewSegments([...newSegments, { name: '', duration: 5 * 60 }]);

  // Update segment fields
  const updateNewSegment = (index, field, value) => {
    const updated = [...newSegments];
    updated[index][field] = field === 'duration' ? parseInt(value) * 60 : value;
    setNewSegments(updated);
  };

  // Remove a segment
  const removeNewSegment = (index) => {
    const updated = [...newSegments];
    updated.splice(index, 1);
    setNewSegments(updated);
  };

  return (
    <>
      <Navbar />
      <Box sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          👋 Welcome to your Lecture Dashboard
        </Typography>

        <Typography variant="body1" sx={{ mb: 3 }}>
          Choose a lecture style or create a custom template:
        </Typography>

        {/* Lecture type buttons */}
        <Stack direction="row" spacing={2} sx={{ mb: 4, flexWrap: 'wrap' }}>
          {Object.keys(lectureTemplates).map((type) => (
            <Button
              key={type}
              variant={lectureType === type ? 'contained' : 'outlined'}
              onClick={() => setLectureType(type)}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </Button>
          ))}
          {customTemplates.map((template) => (
            <Button
              key={template.id}
              variant={lectureType === template.name ? 'contained' : 'outlined'}
              onClick={() => setLectureType(template.name)}
              color="success"
            >
              {template.name}
            </Button>
          ))}
        </Stack>

        {/* Custom Template Builder */}
        <Card elevation={3} sx={{ maxWidth: 800, mx: 'auto', mb: 4 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>✨ Create Custom Template</Typography>
            <TextField
              label="Template Name"
              fullWidth
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              sx={{ mb: 2 }}
            />

            {newSegments.map((seg, idx) => (
              <Stack key={idx} direction="row" spacing={2} sx={{ mb: 2 }}>
                <TextField
                  label="Segment Name"
                  value={seg.name}
                  onChange={(e) => updateNewSegment(idx, 'name', e.target.value)}
                  fullWidth
                />
                <TextField
                  label="Duration (min)"
                  type="number"
                  value={Math.floor(seg.duration / 60)}
                  onChange={(e) => updateNewSegment(idx, 'duration', e.target.value)}
                  sx={{ width: 120 }}
                />
                <IconButton onClick={() => removeNewSegment(idx)} color="error">
                  <DeleteIcon />
                </IconButton>
              </Stack>
            ))}

            <Button startIcon={<AddIcon />} onClick={addNewSegment}>Add Segment</Button>
            <Button variant="contained" sx={{ ml: 2 }} onClick={saveCustomTemplate}>
              Save Template
            </Button>
          </CardContent>
        </Card>

        {/* Existing templates with delete option */}
        {customTemplates.length > 0 && (
          <Card elevation={2} sx={{ maxWidth: 800, mx: 'auto', mb: 4, p: 2 }}>
            <Typography variant="h6" gutterBottom>🗑 Manage Custom Templates</Typography>
            {customTemplates.map((template) => (
              <Stack direction="row" justifyContent="space-between" key={template.id} sx={{ mb: 1 }}>
                <Typography>{template.name}</Typography>
                <Button size="small" color="error" onClick={() => deleteTemplate(template.id)}>Delete</Button>
              </Stack>
            ))}
          </Card>
        )}

        {/* Timer */}
        <Card elevation={3} sx={{ maxWidth: 600, mx: 'auto' }}>
          <CardContent>
            <Timer segments={segments} type={lectureType} />
          </CardContent>
        </Card>

        {/* Reports Button */}
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Button
            variant="contained"
            color="secondary"
            href={`/reports?filter=${lectureType}`}
          >
            View Reports
          </Button>
        </Box>
      </Box>
    </>
  );
};

export default Dashboard;
