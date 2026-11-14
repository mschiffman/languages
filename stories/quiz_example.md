// EXAMPLE ONLY: shows every way to write a quiz block. Not meant to be run.
// Lines that start with // are notes; new_quiz.py skips them.
// One .md file makes one quiz page.

# At School: Example Quiz
type: quiz
page: voc_atSchool_quiz_example
from: voc_atSchool
menu: ytstory

// ---------------------------------------------------------------------
// The quiz: one line per block. Blocks are asked in the order written,
// so put the easy formats first and the typing last.
// ---------------------------------------------------------------------
## quiz

// PICK: a picture, choose the word from 4.
// A number = that many questions, words picked at random on every play.
pick: 4

// PICK with your own words: one question per word listed.
pick: a pen, a pencil, a crayon

// LISTEN: hear the word, tap the right picture from 4.
listen: 5

// LISTEN with your own words.
listen: a desk, a chair

// MATCH: pictures on the left, words on the right.
// "2 x 4" = 2 questions, each with 4 pairs (2 to 6 pairs allowed).
match: 2 x 4

// MATCH with a bare number: that many questions of 4 pairs.
match: 1

// MATCH with your own words: ONE question, these are its pairs.
match: a teacher, a student, a school, a classroom

// ARTICLE: a picture and "___ eraser", choose a or an.
// Only words taught as "a ..." / "an ..." are used
// (not "a pair of scissors" or "a piece of paper").
article: 4

// ARTICLE with your own words: good for making sure "an" words come up.
article: an eraser, a ruler

// SPELL: a picture, tap the letters in order. The bare word is spelled
// ("pencil", not "a pencil"). "max 6" = only words of up to 6 letters.
spell: 3, max 6

// SPELL without a limit: words of up to 10 letters.
spell: 2

// SPELL with your own words.
spell: scissors, dictionary

// TYPE: a picture, type the phrase ("a book").
type: 4

// TYPE with your own words.
type: a pair of scissors, a piece of paper

// ---------------------------------------------------------------------
// Words that are easy to mix up. One group per line. In pick and listen,
// a word's wrong options come from its group first.
// ---------------------------------------------------------------------
## similar
a pen, a pencil, a crayon, a colored pencil, a highlighter
a book, a notebook, a dictionary, a piece of paper
a desk, a chair
a teacher, a student

// ---------------------------------------------------------------------
// Other spellings marked right in the typing questions.
//   <the lesson's answer> = <other form>, <another form>
// ---------------------------------------------------------------------
## also
a piece of paper = a sheet of paper
a colored pencil = a coloured pencil
a backpack = a school bag, a rucksack

// =====================================================================
// A NEW SET OF WORDS (no lesson page): the header and a "## words"
// section replace "from:". Remove the // to use it in a file of its own.
// =====================================================================
//
// # Fruit: Quiz
// type: quiz
// page: voc_fruit_quiz_mix
// slug: voc-fruit
// menu: ytstory
// size: 800
//
// ## words
// 1 | apple  | an apple
// 2 | banana | a banana
// 3 | grapes | a bunch of grapes
// 4 | orange | an orange
// 5 | water
//
// ## quiz
// pick: 4
// listen: 4
// match: 1 x 4
// type: 3
//
// Each word line: picture number | bare word | phrase.
//   - picture 3 is 3.png in G:\My Drive\_YOUTUBE\voc-fruit
//   - "5 | water" has no phrase: the word is used everywhere, and it is
//     left out of the a/an questions
//   - audio clips are numbered in line order, word then phrase:
//     01 apple, 02 an apple, 03 banana, 04 a banana ... 09 water
//   - size: 800 = converted pictures are 800 pixels on their longest side
