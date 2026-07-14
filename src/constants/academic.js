const QUESTION_TYPES = Object.freeze(['MCQ', 'SHORT_QUESTION', 'LONG_QUESTION']);
const DIFFICULTIES = Object.freeze(['EASY', 'MEDIUM', 'HARD']);
const CONTENT_NODE_TYPES = Object.freeze(['CHAPTER', 'SECTION']);

const QuestionType = Object.freeze({
  MCQ: 'MCQ',
  SHORT_QUESTION: 'SHORT_QUESTION',
  LONG_QUESTION: 'LONG_QUESTION',
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
