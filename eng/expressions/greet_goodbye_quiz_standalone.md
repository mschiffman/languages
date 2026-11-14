// Greetings & Goodbyes: the "Test yourself" quiz as a page of its own.
// FORMAT PROPOSAL: no script reads this file yet.
//
// One "## <type>" block per question, asked in this order.
// Phrases are the cards' English, written exactly as on the cards page.
//   +  the right answer
//   -  a wrong option:   - <phrase> | <mistake tag> | <note shown when chosen>
//      (the note is optional: without it, the card's own note is shown)
// Mistake tags: time, moment, register, literal, reply, words, meaning.

# Greetings & Goodbyes: Quiz
type: expression-quiz
page: greet_goodbye_test
from: greet_goodbye
menu: eng-expression-flash
order: shuffle

// ------------------------------------------------------------------
// MATCH, English with Burmese: list the cards; the Burmese is each card's own.
// ------------------------------------------------------------------
## match
How are you?
Not bad.
What's up?
Long time no see!
Nice to meet you.

## match
See you later.
See you tomorrow.
Take care.
I have to go.
Have a nice day.

// ------------------------------------------------------------------
// MATCH, a line with its reply:  <line> = <reply>
// ------------------------------------------------------------------
## match
How are you? = Good, thanks. And you?
Nice to meet you. = Nice to meet you too.
What's up? = Not much. You?
Have a nice day. = Thanks, you too!
How have you been? = Good! Busy, but good.

// ------------------------------------------------------------------
// SAY: a situation, choose what to say.
// SCENE: short parts joined by " · ", each starting with an emoji.
// ------------------------------------------------------------------
## say
SCENE: 👩‍🏫 Your teacher · ☀️ 9 am · You arrive at class.
MY: မနက် ၉ နာရီ။ စာသင်ခန်းကို ရောက်လာပြီး ဆရာမကို နှုတ်ဆက်တယ်။
+ Good morning.
- What's up? | register | Very casual: for friends, not for a teacher.
- Good evening. | time | Good evening is for after about 6 pm. Before 12 noon, say Good morning.
- Good night. | moment | Good night is a goodbye, at night or before bed. You are arriving.

// ------------------------------------------------------------------
// JUDGE: is this phrase OK here?  OK: yes / no.  TAG: the kind of mistake it tests.
// NOTE is optional: without it, the card's own note is shown.
// ------------------------------------------------------------------
## judge
SCENE: 🛒 2 pm · A customer walks into your shop.
MY: နေ့လယ် ၂ နာရီ။ ဆိုင်ထဲကို ဈေးဝယ်သူတစ်ယောက် ဝင်လာတယ်။
PHRASE: Good afternoon.
OK: yes
TAG: time

## say
SCENE: 🌙 8 pm · 🍽️ At a restaurant · You walk in.
MY: ည ၈ နာရီ။ စားသောက်ဆိုင်ထဲ ဝင်လာတယ်။
+ Good evening.
- Good night. | moment
- Good afternoon. | time | Good afternoon is from 12 noon until about 6 pm. At 8 pm, say Good evening.
- Hey! | register | Too casual for a waiter. Hey! is for close friends.

// ------------------------------------------------------------------
// REPLY: hear a line, choose the answer. SCENE and MY are optional here.
// ------------------------------------------------------------------
## reply
PROMPT: Nice to meet you.
+ Nice to meet you too.
- Good to see you. | moment | Good to see you is for people you already know. This is your first meeting.
- Long time no see! | moment | That's for an old friend you haven't seen for a long time. You have just met.
- Good, thanks. And you? | reply | That answers How are you?

// ------------------------------------------------------------------
// BUILD: tap the words into order. The words come from the answer.
// CUE: one short line. "-" lines are extra wrong words (decoys).
// ALSO (optional): another word order that is also right.
// ------------------------------------------------------------------
## build
CUE: 👫 A friend you haven't seen for months
+ How have you been?
- are | words | For someone you haven't seen for a while: How have you been? (How are you been? is not English.)

## say
SCENE: 👫 An old friend · 📅 You last met 3 years ago · You meet in the street.
MY: လမ်းမှာ သူငယ်ချင်းဟောင်းတစ်ယောက်နဲ့ ဆုံတယ်။ မတွေ့တာ ၃ နှစ် ရှိပြီ။
+ Long time no see!
- Nice to meet you. | moment | Only for the first time you meet someone. To an old friend, it sounds like you forgot them!
- Have a nice day. | moment | That's a goodbye. You are just meeting.

## judge
SCENE: 🤝 You meet your friend's mother for the first time.
MY: သူငယ်ချင်းရဲ့ အမေကို ပထမဆုံး တွေ့တယ်။
PHRASE: Nice to meet you.
OK: yes
TAG: moment

## reply
PROMPT: How are you?
+ Good, thanks. And you?
- Nice to meet you. | moment | That's for meeting someone for the first time.
- Not much. You? | reply | Not much answers What's up? To How are you?, say Good, thanks. And you?

## say
SCENE: 🏢 At work · ☕ Morning · You meet a coworker and want to ask how she is.
MY: အလုပ်မှာ မနက်ပိုင်း လုပ်ဖော်ကိုင်ဖက်တစ်ယောက်နဲ့ တွေ့တယ်။ သူ နေကောင်းလား မေးချင်တယ်။
+ How are you?
- Have you eaten? | literal | In Burmese, ထမင်းစားပြီးပြီလား is a greeting. In English, Have you eaten? is a real question about food. Say How are you?
- Where are you going? | literal | In Burmese, ဘယ်သွားမလို့လဲ is a greeting. In English, it sounds nosy. Say How are you?

## build
CUE: 🛍️ A customer is leaving your shop
+ Have a nice day.
- be | literal | Burmese says ဖြစ်ပါစေ (may it be), but English says Have a nice day.

## judge
SCENE: 🏢 7 pm · You're leaving the office. You say goodbye to your boss.
MY: ည ၇ နာရီ။ ရုံးက ပြန်တော့မယ်။ သူဌေးကို နှုတ်ဆက်တယ်။
PHRASE: Good evening.
OK: no
TAG: moment
NOTE: Good evening is hello, when you arrive. When you leave in the evening, say Good night or Have a nice evening.

## say
SCENE: 🏠 At a friend's home · 👴 You met her father today, for the first time · You're leaving.
MY: သူငယ်ချင်းအိမ်မှာ သူ့အဖေနဲ့ ဒီနေ့ ပထမဆုံး တွေ့ခဲ့တယ်။ အခု ပြန်တော့မယ်။
+ It was nice meeting you.
- Nice to meet you. | moment | That's for the start, when you meet. At the end: It was nice meeting you.
- Long time no see! | moment | That's for old friends you haven't seen for a long time.
- Talk to you later. | register | For friends, at the end of a phone call or chat.

## reply
PROMPT: How's it going?
+ Not bad.
- I'm going to the market. | literal | How's it going? is not about where you are going. It means How are you? Answer: Not bad. or Good, thanks.
- Nice to meet you too. | reply | That answers Nice to meet you.
- Goodbye. | moment | That ends the conversation. How's it going? asks how you are.

## build
CUE: 👋 The end of a nice chat
+ It was nice talking to you.
- talk | words | After It was nice, use the -ing form: It was nice talking to you.

## judge
SCENE: 👩‍🏫 You see your teacher in the street.
MY: လမ်းမှာ ဆရာမကို တွေ့တယ်။
PHRASE: Hey!
OK: no
TAG: register
NOTE: Hey! is for close friends. To a teacher, say Hello or Good morning.
