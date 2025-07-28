// src/components/VoiceAwareTimer.js
import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Button, Dialog, DialogTitle,
  DialogContent, DialogActions
} from '@mui/material';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth } from '../utils/firebaseConfig';

const db = getFirestore();
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;

const VoiceAwareTimer = ({ segments }) => {
  const [currentSegment, setCurrentSegment] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [overrunModalOpen, setOverrunModalOpen] = useState(false);
  const [detectedSegment, setDetectedSegment] = useState('');
  const [actualSegments, setActualSegments] = useState([]);
  const segmentTimeSpent = useRef(0);

  // Setup initial timeLeft and clone segments for tracking actual durations
  useEffect(() => {
    if (segments.length > 0) {
      setTimeLeft(segments[0]?.duration || 0);
      setActualSegments(segments.map(s => ({ ...s, duration: 0 })));
    }
  }, [segments]);

  // Voice recognition setup
  useEffect(() => {
    if (!recognition) return;

    recognition.continuous = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase();
      const keywords = {
        introduction: ['introduction', 'welcome', 'today we will'],
        'main content': ['main point', 'important concept', 'key idea'],
        'q&a / summary': ['questions', 'summary', 'to summarise'],
      };

      for (let [segment, words] of Object.entries(keywords)) {
        if (words.some(word => transcript.includes(word))) {
          setDetectedSegment(segment);
        }
      }
    };

    if (isRunning) recognition.start();
    else recognition.stop();

    return () => recognition.stop();
  }, [isRunning]);

  // Timer logic and overrun handling
  useEffect(() => {
    let interval;

    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
        segmentTimeSpent.current += 1;

        // Update duration in actualSegments
        setActualSegments((prevSegs) => {
          const updated = [...prevSegs];
          if (updated[currentSegment]) {
            updated[currentSegment].duration = segmentTimeSpent.current;
          }
          return updated;
        });
      }, 1000);
    }

    if (isRunning && timeLeft === 0) {
      if (detectedSegment === segments[currentSegment]?.name.toLowerCase()) {
        setIsRunning(false);
        setOverrunModalOpen(true);
      } else {
        proceedToNextSegment();
      }
    }

    return () => clearInterval(interval);
  }, [isRunning, timeLeft, detectedSegment, currentSegment, segments]);

  const proceedToNextSegment = async () => {
    if (currentSegment + 1 < segments.length) {
      setCurrentSegment(prev => prev + 1);
      setTimeLeft(segments[currentSegment + 1]?.duration || 0);
      segmentTimeSpent.current = 0;
      setIsRunning(true);
    } else {
      setIsRunning(false);
      await saveSessionToFirebase();
      alert("🎉 Lecture Complete. Session saved.");
    }
  };

  const saveSessionToFirebase = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const cleanSegments = actualSegments
      .filter(seg => seg.name && seg.name.trim() !== '')
      .map(seg => ({
        name: seg.name.trim(),
        duration: seg.duration,
      }));

    if (cleanSegments.length === 0) return;

    await addDoc(collection(db, 'sessions'), {
      uid: user.uid,
      timestamp: serverTimestamp(),
      type: segments[0]?.type || 'lecture', // optional type tag if passed
      segments: cleanSegments,
    });
  };

  const toggleTimer = () => setIsRunning((prev) => !prev);
  const addTime = (seconds) => {
    setTimeLeft((prev) => Math.max(prev + seconds, 0));
  };

  if (segments.length === 0) {
    return <Typography>Loading segments...</Typography>;
  }

  return (
    <Box>
      <Typography variant="h6">Segment: {segments[currentSegment]?.name}</Typography>
      <Typography variant="h3">
        {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
      </Typography>

      <Button onClick={toggleTimer} variant="contained" sx={{ mr: 2 }}>
        {isRunning ? 'Pause' : 'Start'}
      </Button>
      <Button onClick={() => addTime(60)} variant="outlined">+1 min</Button>

      <Dialog open={overrunModalOpen} onClose={() => setOverrunModalOpen(false)}>
        <DialogTitle>⏱️ Segment Overrun</DialogTitle>
        <DialogContent>
          <Typography>
            You're still discussing "{segments[currentSegment]?.name}". Would you like to extend time?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            addTime(120);
            setIsRunning(true);
            setOverrunModalOpen(false);
          }}>Extend</Button>
          <Button onClick={() => {
            setOverrunModalOpen(false);
            proceedToNextSegment();
          }}>Move On</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default VoiceAwareTimer;
