const QUESTION_TYPES = Object.freeze(['MCQ', 'SHORT_ANSWER', 'LONG_ANSWER']);
const DIFFICULTIES = Object.freeze(['EASY', 'MEDIUM', 'HARD']);
const CONTENT_NODE_TYPES = Object.freeze(['CHAPTER', 'SECTION']);

const QuestionType = Object.freeze({
  MCQ: 'MCQ',
  SHORT_ANSWER: 'SHORT_ANSWER',
  LONG_ANSWER: 'LONG_ANSWER',
});

const Difficulty = Object.freeze({
  EASY: 'EASY',
  MEDIUM: 'MEDIUM',
  HARD: 'HARD',
});

const ContentNodeType = Object.freeze({
  CHAPTER: 'CHAPTER',
  SECTION: 'SECTION',
});

module.exports = {
  QUESTION_TYPES,
  DIFFICULTIES,
  CONTENT_NODE_TYPES,
  QuestionType,
  Difficulty,
  ContentNodeType,
};
