// src/components/Timer.js
import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Button, Collapse, Alert, TextField
} from '@mui/material';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth } from '../utils/firebaseConfig';

const db = getFirestore();
const audio = new Audio('/sounds/ding.mp3');

const Timer = ({ segments, type }) => {
  const [currentSegment, setCurrentSegment] = useState(0);
  const [timeLeft, setTimeLeft] = useState(segments[0]?.duration || 0);
  const [isRunning, setIsRunning] = useState(false);
  const [actualSegments, setActualSegments] = useState(segments.map(s => ({ ...s })));
  const [completionNotes, setCompletionNotes] = useState(() => segments.map(() => ''));
  const [showChecklist, setShowChecklist] = useState(false);

  const segmentTimeSpent = useRef(0);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    return `${m}:${(s % 60).toString().padStart(2, '0')}`;
  };

  const addTime = (s) => setTimeLeft(prev => Math.max(prev + s, 0));

  const toggleTimer = () => setIsRunning(prev => !prev);

  const resetTimer = () => {
    setIsRunning(false);
    setCurrentSegment(0);
    setActualSegments(segments.map(s => ({ ...s })));
    setTimeLeft(segments[0]?.duration || 0);
    setCompletionNotes(segments.map(() => ''));
    segmentTimeSpent.current = 0;
  };

  const saveSessionToFirebase = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const payload = actualSegments.map((seg, i) => ({
      name: seg.name,
      duration: seg.duration,
      reminderNotes: seg.reminderNotes || [],
      completionNote: completionNotes[i] || ''
    }));

    await addDoc(collection(db, 'sessions'), {
      uid: user.uid,
      type,
      timestamp: serverTimestamp(),
      segments: payload
    });

    alert('✅ Session saved to report!');
  };

  useEffect(() => {
    let interval;

    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(t => t - 1);
        segmentTimeSpent.current += 1;

        setActualSegments(prev => {
          const updated = [...prev];
          if (updated[currentSegment]) {
            updated[currentSegment].duration = segmentTimeSpent.current;
          }
          return updated;
        });
      }, 1000);
    }

    if (isRunning && timeLeft === 0) {
      if (segments[currentSegment]?.reminderNotes?.length) {
        setIsRunning(false);
        setShowChecklist(true);
        setTimeout(() => {
          setShowChecklist(false);
          proceedToNextSegment();
        }, 10000);
      } else {
        proceedToNextSegment();
      }
    }

    return () => clearInterval(interval);
  }, [isRunning, timeLeft, currentSegment]);

  const proceedToNextSegment = () => {
    if (currentSegment + 1 < segments.length) {
      audio.play();
      segmentTimeSpent.current = 0;
      setCurrentSegment(i => i + 1);
      setTimeLeft(segments[currentSegment + 1]?.duration || 0);
      setIsRunning(true);
    } else {
      audio.play();
      setIsRunning(false);
      saveSessionToFirebase();
    }
  };

  useEffect(() => {
    resetTimer();
  }, [segments]);

  const handleNoteChange = (index, value) => {
    setCompletionNotes(prev => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Segment: <strong>{segments[currentSegment]?.name}</strong>
      </Typography>

      <Typography variant="h3" gutterBottom>{formatTime(timeLeft)}</Typography>

      <Button variant="contained" onClick={toggleTimer} sx={{ mr: 1 }}>
        {isRunning ? 'Pause' : 'Start'}
      </Button>
      <Button variant="outlined" onClick={resetTimer}>Reset</Button>

      <Box mt={2}>
        <Button onClick={() => addTime(60)} size="small" sx={{ mr: 1 }}>+1 min</Button>
        <Button onClick={() => addTime(-60)} size="small">-1 min</Button>
      </Box>

      <Collapse in={showChecklist}>
        <Alert severity="info" sx={{ mt: 3 }}>
          <Typography variant="subtitle1">📝 Checklist:</Typography>
          <ul>
            {segments[currentSegment]?.reminderNotes?.map((note, i) => (
              <li key={i}>{note}</li>
            ))}
          </ul>
        </Alert>
      </Collapse>

      <Box mt={4}>
        <Typography variant="h6">🧾 Content Completion Notes</Typography>
        {segments.map((seg, idx) => (
          <Box key={idx} sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>{seg.name}</Typography>
            <TextField
              multiline
              fullWidth
              minRows={2}
              value={completionNotes[idx]}
              onChange={(e) => handleNoteChange(idx, e.target.value)}
              placeholder="Write your completion note here..."
            />
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default Timer;
