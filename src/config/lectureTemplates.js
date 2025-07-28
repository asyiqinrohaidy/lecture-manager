const lectureTemplates = {
  lecture: [
    { name: 'Introduction', duration: 5 * 60 },
    { name: 'Main Content', 
      duration: 45 * 60,
      reminderNotes: [
        'Have you covered the key points?',
        'Did you explain the main concepts clearly?',
        'Any examples or case studies discussed?'
      ]
    },
    { name: 'Q&A / Summary', duration: 10 * 60 }
  ],
  seminar: [
    { name: 'Opening Check-in & Ground Rules', duration: 5 * 60 },
    { name: 'Reading-Based Discussion', duration: 20 * 60 },
    { name: 'Group Debate or Activity', duration: 15 * 60 },
    { name: 'Tutor Feedback & Clarifications', duration: 10 * 60 },
    { name: 'Wrap-up & Reflection', duration: 10 * 60 }
  ],
  lab: [
    { name: 'Instructions / Setup', duration: 10 * 60 },
    { name: 'Hands-on Experimentation', duration: 30 * 60 },
    { name: 'Data Collection & Discussion', duration: 15 * 60 },
    { name: 'Wrap-up / Clean-up', duration: 5 * 60 }
  ]
};

export default lectureTemplates;


