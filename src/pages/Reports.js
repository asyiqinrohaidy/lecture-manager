// src/pages/Reports.js
import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Stack, Select, MenuItem, Card, Divider, CssBaseline,
  Accordion, AccordionSummary, AccordionDetails, Button, TextField, Menu
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend
} from 'chart.js';
import { useSearchParams } from 'react-router-dom';
import { auth } from '../utils/firebaseConfig';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { saveAs } from 'file-saver';
import Navbar from '../components/Navbar';
import { useThemeMode } from '../context/ThemeContext';
import { createTheme, ThemeProvider } from '@mui/material';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const defaultDurations = {
  lecture: [5, 45, 10],
  seminar: [5, 20, 15, 10, 10],
  lab: [10, 30, 15, 5],
};

const Reports = () => {
  const { darkMode } = useThemeMode();
  const [chartType, setChartType] = useState('bar');
  const [sessions, setSessions] = useState([]);
  const [filter, setFilter] = useState('lecture');
  const [searchParams] = useSearchParams();
  const [customTemplates, setCustomTemplates] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const theme = createTheme({
    palette: { mode: darkMode ? 'dark' : 'light' },
  });

  const open = Boolean(anchorEl);
  const handleExportClick = (event) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const db = getFirestore();

  // Load filter from URL
  useEffect(() => {
    const qParam = searchParams.get('filter');
    if (qParam) setFilter(qParam);
  }, [searchParams]);

  // Fetch sessions and custom templates
  useEffect(() => {
    const fetchData = async () => {
      const user = auth.currentUser;
      if (!user) return;

      // Fetch custom templates
      const templateQuery = query(collection(db, 'templates'), where('uid', '==', user.uid));
      const templateSnap = await getDocs(templateQuery);
      const templates = templateSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCustomTemplates(templates);

      // Fetch sessions
      const sessionQuery = query(collection(db, 'sessions'), where('uid', '==', user.uid));
      const sessionSnap = await getDocs(sessionQuery);
      const allData = sessionSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Filter by type and date range
      const filtered = allData.filter(s => {
        const ts = s.timestamp?.seconds ? new Date(s.timestamp.seconds * 1000) : null;
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;
        if (!ts) return false;
        if (start && ts < start) return false;
        if (end && ts > new Date(end.setHours(23, 59, 59, 999))) return false;
        return s.type === filter;
      });

      setSessions(filtered);
    };
    fetchData();
  }, [filter, startDate, endDate]);

  // Chart data
  const segmentStats = {};
  sessions.forEach((s) => {
    s.segments.forEach((seg) => {
      segmentStats[seg.name] = (segmentStats[seg.name] || 0) + Math.floor(seg.duration / 60);
    });
  });

  const chartData = {
    labels: Object.keys(segmentStats),
    datasets: [{
      label: 'Minutes',
      data: Object.values(segmentStats),
      backgroundColor: ['#42a5f5', '#66bb6a', '#ffa726', '#ef5350', '#ab47bc'],
    }],
  };

  // AI Feedback
  const generateFeedback = () => {
    let expected = defaultDurations[filter] || [];

    // If custom template is selected, use its saved durations
    const custom = customTemplates.find(t => t.name === filter);
    if (custom) {
      expected = custom.segments.map(s => Math.floor(s.duration / 60));
    }

    const grouped = {};
    sessions.forEach((session) => {
      session.segments.forEach((seg, idx) => {
        const actual = Math.round(seg.duration / 60);
        const expectedDuration = expected[idx];
        if (!grouped[seg.name]) grouped[seg.name] = [];

        if (expectedDuration === undefined) {
          grouped[seg.name].push(`🗓️ ${new Date(session.timestamp.seconds * 1000).toLocaleString()} – No baseline for feedback.`);
        } else if (actual === expectedDuration) {
          grouped[seg.name].push(`🗓️ ${new Date(session.timestamp.seconds * 1000).toLocaleString()} – Well-paced.`);
        } else if (actual < expectedDuration) {
          grouped[seg.name].push(`🗓️ ${new Date(session.timestamp.seconds * 1000).toLocaleString()} – Rushed.`);
        } else {
          grouped[seg.name].push(`🗓️ ${new Date(session.timestamp.seconds * 1000).toLocaleString()} – Too long.`);
        }
      });
    });
    return grouped;
  };

  const feedback = generateFeedback();

  // Export functions
  const exportToCSV = () => {
    const header = ['Timestamp', 'Segment', 'Duration (min)', 'Reminders', 'Completion Notes'];
    const rows = [];
    sessions.forEach((s) => {
      s.segments.forEach((seg) => {
        rows.push([
          new Date(s.timestamp.seconds * 1000).toLocaleString(),
          seg.name,
          Math.floor(seg.duration / 60),
          (seg.reminderNotes || []).join('; '),
          seg.contentNote || ''
        ]);
      });
    });

    const csvContent = [header, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'session_report.csv');
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(12);
    doc.text("Session Report", 10, 10);
    const tableRows = [];
    sessions.forEach((s) => {
      s.segments.forEach((seg) => {
        tableRows.push([
          new Date(s.timestamp.seconds * 1000).toLocaleString(),
          seg.name,
          Math.floor(seg.duration / 60),
          (seg.reminderNotes || []).join('; '),
          seg.contentNote || ''
        ]);
      });
    });

    autoTable(doc, {
      head: [['Timestamp', 'Segment', 'Duration', 'Reminders', 'Completion Notes']],
      body: tableRows,
      startY: 20,
    });

    doc.save('session_report.pdf');
  };

  const printReport = () => window.print();

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Navbar />
      <Box sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          📊 {filter ? filter.charAt(0).toUpperCase() + filter.slice(1) : ''} Report
        </Typography>

        <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
          <Select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <MenuItem value="lecture">Lecture</MenuItem>
            <MenuItem value="seminar">Seminar</MenuItem>
            <MenuItem value="lab">Lab</MenuItem>
            {customTemplates.map((template) => (
              <MenuItem key={template.id} value={template.name}>{template.name}</MenuItem>
            ))}
          </Select>
          <Select value={chartType} onChange={(e) => setChartType(e.target.value)}>
            <MenuItem value="bar">Bar Chart</MenuItem>
            <MenuItem value="pie">Pie Chart</MenuItem>
          </Select>
          <TextField
            type="date"
            label="Start Date"
            InputLabelProps={{ shrink: true }}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <TextField
            type="date"
            label="End Date"
            InputLabelProps={{ shrink: true }}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          <Button onClick={handleExportClick} variant="outlined" startIcon={<MoreVertIcon />}>
            Export / Print
          </Button>
          <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
            <MenuItem onClick={() => { exportToCSV(); handleClose(); }}>Export to CSV</MenuItem>
            <MenuItem onClick={() => { exportToPDF(); handleClose(); }}>Export to PDF</MenuItem>
            <MenuItem onClick={() => { printReport(); handleClose(); }}>Print</MenuItem>
          </Menu>
        </Stack>

        {/* Chart */}
        <Box sx={{ width: '100%', maxWidth: 500, height: 300, mx: 'auto', mb: 4 }}>
          {chartType === 'bar' ? (
            <Bar data={chartData} options={{ responsive: true, maintainAspectRatio: false }} />
          ) : (
            <Pie data={chartData} options={{ responsive: true, maintainAspectRatio: false }} />
          )}
        </Box>

        {/* AI Feedback */}
        <Card sx={{ p: 2, mb: 4 }}>
          <Typography variant="h6">🤖 AI Pacing Feedback</Typography>
          <Divider sx={{ mb: 2 }} />
          {Object.entries(feedback).map(([seg, notes]) => (
            <Box key={seg} sx={{ mb: 2 }}>
              <Typography sx={{ fontWeight: 'bold', color: 'primary.main' }}>{seg}</Typography>
              <ul>{notes.map((note, i) => <li key={i}>{note}</li>)}</ul>
            </Box>
          ))}
        </Card>

        {/* Sessions List */}
        {sessions.map((session) => (
          <Accordion key={session.id}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>🗓️ {new Date(session.timestamp.seconds * 1000).toLocaleString()}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <ul>
                {session.segments.map((seg, i) => (
                  <li key={i}>
                    <strong>{seg.name}</strong> – ⏱️ {Math.floor(seg.duration / 60)} min
                    {seg.reminderNotes?.length > 0 && (
                      <>
                        <br /><strong>Reminders:</strong>
                        <ul>{seg.reminderNotes.map((r, idx) => <li key={idx}>{r}</li>)}</ul>
                      </>
                    )}
                    {seg.contentNote && (
                      <>
                        <br /><strong>Completion Notes:</strong> {seg.contentNote}
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>
    </ThemeProvider>
  );
};

export default Reports;
