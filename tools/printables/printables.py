# Builds the Lesson Shuffle printables: public/print/<slug>.html, public/print.css,
# and the body of /printables. v2: branded header with icon, numbered directions on the
# sheet, a screen-only teacher guide, Phosphor duotone icons and a QR to the card guide.
import os, re, html as H
import segno
import pathlib; HERE = pathlib.Path(__file__).resolve().parent; PUB = str(HERE.parent.parent / 'public')
PH = str(HERE / 'node_modules/@phosphor-icons/core/assets/duotone') + '/'
SUIT = {'d': ('#6ca9d8', 'Instructional Delivery'), 'c': ('#80c783', 'Collaboration & Discussion'),
        'a': ('#ffd54f', 'Assessment & Retrieval'), 's': ('#e57373', 'Classroom Systems & Equity')}
SUIT_NAME = {c: n for c, n in SUIT.values()}

def card_title(slug):
    s = open(f'{PUB}/{slug}.html').read()
    return H.unescape(re.search(r'<title>(.*?)(?: · |</title>)', s).group(1)).strip()

def suit_of(slug):
    return re.search(r'--suit:(#[0-9a-f]{6})', open(f'{PUB}/{slug}.html').read()).group(1)

# ---------- icons ----------
def ic(name, cls='ic', label=None):
    a = f' role="img" aria-label="{H.escape(label)}"' if label else ' aria-hidden="true"'
    return f'<svg class="{cls}"{a} viewBox="0 0 256 256"><use href="#i-{name}"/></svg>'

def symbol(name):
    s = open(PH + name + '-duotone.svg').read()
    inner = re.search(r'<svg[^>]*>(.*)</svg>', s, re.S).group(1)
    inner = inner.replace('opacity="0.2"', 'style="fill:var(--du);opacity:var(--duo,.55)"')
    return f'<symbol id="i-{name}" viewBox="0 0 256 256">{inner}</symbol>'

def sprite(html):
    names = sorted(set(re.findall(r'href="#i-([a-z0-9-]+)"', html)))
    return '<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">' + ''.join(symbol(n) for n in names) + '</svg>'

def icon_inline(name, size=28):
    s = open(PH + name + '-duotone.svg').read()
    return s.replace('<svg ', f'<svg width="{size}" height="{size}" aria-hidden="true" ', 1).replace('opacity="0.2"', 'opacity="0.35"')

def qr_svg(url):
    q = segno.make(url, error='m')
    m = q.matrix; n = len(m); b = 2; d = []
    for y, row in enumerate(m):
        x = 0
        while x < n:
            if row[x]:
                s = x
                while x < n and row[x]: x += 1
                d.append(f'M{s + b} {y + b}h{x - s}v1h-{x - s}z')
            else:
                x += 1
    w = n + 2 * b
    return f'<svg class="qr" viewBox="0 0 {w} {w}" role="img" aria-label="QR code for {H.escape(url)}"><rect width="{w}" height="{w}" fill="#fff"/><path d="{"".join(d)}" fill="#26384a"/></svg>'

def clockface(h):
    import math
    a = math.radians(h % 12 * 30 - 90)
    x, y = 12 + 6.2 * math.cos(a), 12 + 6.2 * math.sin(a)
    ticks = ''.join(f'<line x1="{12 + 9 * math.cos(math.radians(t * 30)):.2f}" y1="{12 + 9 * math.sin(math.radians(t * 30)):.2f}" x2="{12 + 10.2 * math.cos(math.radians(t * 30)):.2f}" y2="{12 + 10.2 * math.sin(math.radians(t * 30)):.2f}"/>' for t in range(12))
    return (f'<svg class="cf" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" class="cf-o"/>'
            f'<g class="cf-t">{ticks}</g><line x1="12" y1="12" x2="12" y2="4" class="cf-m"/>'
            f'<line x1="12" y1="12" x2="{x:.2f}" y2="{y:.2f}" class="cf-h"/><circle cx="12" cy="12" r="1.3" class="cf-c"/></svg>')

SHAPES = {'A': '<circle cx="50" cy="50" r="40"/>', 'B': '<polygon points="50,8 94,88 6,88"/>',
          'C': '<rect x="12" y="12" width="76" height="76" rx="6"/>', 'D': '<polygon points="50,6 61,38 95,38 67,58 78,92 50,71 22,92 33,58 5,38 39,38"/>'}
SHAPE_NAME = {'A': 'circle', 'B': 'triangle', 'C': 'square', 'D': 'star'}
def shape(k, cls='shp'):
    return f'<svg class="{cls}" viewBox="0 0 100 100" aria-hidden="true">{SHAPES[k]}</svg>'

# ---------- building blocks ----------
def lines(n, cls=''):
    return f'<div class="ln {cls}">' + '<i></i>' * n + '</div>'
def lab(label, icon=None):
    return (ic(icon, 'ic li') if icon else '') + f'<b>{label}</b>'
def field(label, n=1, hint='', sm=False, icon=None):
    h = f' <span class="hint">{hint}</span>' if hint else ''
    return f'<div class="fld">{lab(label, icon)}{h}{lines(n, "sm" if sm else "")}</div>'
def box(label, h, hint='', icon=None):
    hh = f' <span class="hint">{hint}</span>' if hint else ''
    return f'<div class="bx" style="min-height:{h}in"><div class="bxh">{lab(label, icon)}{hh}</div></div>'
def name_date(extra=''):
    return f'<div class="nd"><span>Name <i></i></span><span>Date <i></i></span>{extra}</div>'
def nd(*labels):
    return '<div class="nd">' + ''.join(f'<span>{x} <i></i></span>' for x in labels) + '</div>'
def cut(items, cols=1):
    return f'<div class="cut c{cols}">' + ''.join(f'<div class="piece">{x}</div>' for x in items) + '</div>'
def table(headers, rows, widths=None, rowh=.42):
    w = ''.join(f'<col style="width:{x}">' for x in widths) if widths else ''
    th = ''.join(f'<th>{x}</th>' for x in headers)
    body = ''
    for r in rows:
        body += f'<tr style="height:{rowh}in">' + ''.join(f'<td>{x}</td>' for x in r) + '</tr>'
    return f'<table class="grid"><colgroup>{w}</colgroup><thead><tr>{th}</tr></thead><tbody>{body}</tbody></table>'
def blank_rows(n, cols, first=None):
    return [[(first[i] if first and i < len(first) else '')] + [''] * (cols - 1) for i in range(n)]
def th(label, icon):
    return f'<span class="thi">{ic(icon, "ic ti")}{label}</span>'
def dirs(steps, title='Directions'):
    return (f'<div class="dirs"><b class="dh">{title}</b><ol>' +
            ''.join(f'<li><span class="n">{i}</span><span>{s}</span></li>' for i, s in enumerate(steps, 1)) + '</ol></div>')
def mini(steps):
    return '<ol class="mini">' + ''.join(f'<li><span class="n">{i}</span>{s}</li>' for i, s in enumerate(steps, 1)) + '</ol>'

# ---------- the printables ----------
P = []
def add(slug, title, icon, cards, who, intro, pages, guide, dir_steps=None, note=''):
    P.append(dict(slug=slug, title=title, icon=icon, cards=cards, who=who, intro=intro, pages=pages,
                  guide=guide, dirs=dir_steps, note=note))

# ===== Collaboration & Discussion =====
hours = [12] + list(range(1, 12))
clock = ''.join(f'<div class="hr">{clockface(h)}<b>{h} o’clock</b><i></i></div>' for h in hours)
add('clock-partners', 'Clock Partners', 'clock', ['think-pair-rotate-share'], 'Students',
    'Twelve ready-made partners, set up once. To rotate, your teacher calls a time.',
    [name_date() + f'<div class="clock">{clock}</div>' +
     '<div class="tips">' + ic('lightbulb', 'ic li') + '<span><b>Stuck?</b> If your partner is absent, pair with someone whose partner is also out, or join a pair to make three.</span></div>'],
    ['Print one per student on regular paper.',
     'Give about 10 minutes, once, for students to fill all 12 hours.',
     'To pair up, call a time: “Find your 3 o’clock partner.”',
     'Students keep it in a folder. Redo it each semester.',
     'Younger students: use only 12, 3, 6 and 9.'],
    ['Stand up with this sheet and a pencil.',
     'Find a classmate with the same hour open. Write each other’s names on that hour.',
     'Each name goes on your clock only once.',
     'Fill as many hours as you can. Ask your teacher to help with any blanks.'])

def acard(k):
    return (f'<div class="acard"><span class="ix tl">{k}{shape(k, "shp sm")}</span>'
            f'<div class="amid">{shape(k, "shp bg")}<span class="big">{k}</span></div>'
            f'<span class="ix br">{k}{shape(k, "shp sm")}</span></div>')
add('answer-cards', 'A B C D Answer Cards', 'cards', ['change-my-mind', 'boards-up'], 'Students',
    'Private answer cards for multiple-choice votes. Each letter has its own shape, so everyone can read it from across the room.',
    [cut([acard(k) for k in 'ABCD'], 2)],
    ['Print on cardstock, one sheet per student.',
     'Cut along the dashed lines and keep each set in an envelope or clipped together.',
     'Ask a multiple-choice question. Students hold their pick against their chest.',
     'On “Show me,” everyone flips at once. Scan the room before you say a word.'],
    note='Shapes: A circle, B triangle, C square, D star.')

def sign(k):
    return (f'<div class="sign"><div class="sgtop">{shape(k, "shp sg")}<div class="huge">{k}</div></div>'
            f'<div class="fld pos">{lab("Position", "map-pin")}{lines(3)}</div></div>')
add('corner-signs', 'Corner Signs', 'map-pin', ['move-and-speak'], 'Teacher',
    'One sign for each corner of the room.',
    [sign(k) for k in 'ABCD'],
    ['Print four pages, one per corner, on cardstock if you can.',
     'Before class, write one position on each sign (or stick a note on it).',
     'Tape one sign in each corner, high enough to see over heads.',
     'Read the question, then students walk to their corner and build their best argument together.'],
    note='Prints four pages.')

add('echo-and-elevate-poster', 'Echo & Elevate Starters', 'arrow-fat-lines-up', ['echo-and-elevate'], 'Classroom poster',
    'Post it where everyone can see it during discussion.',
    ['<div class="poster">'
     f'<div class="pst"><div class="psh"><span class="pn">1</span>{ic("arrow-counter-clockwise", "ic pi")}<span>Echo it</span><em>Say it back in your own words.</em></div>'
     '<p>“So you’re saying…”</p><p>“What I heard is…”</p></div>'
     f'<div class="pst"><div class="psh"><span class="pn">2</span>{ic("arrow-fat-up", "ic pi")}<span>Elevate it</span><em>Build on it or push back.</em></div>'
     '<p>“I’d add…”</p><p>“That makes me think…”</p><p>“I disagree because…”</p></div></div>'],
    ['Print in color if you can. Letter size works; a poster printer is even better.',
     'Post it near the board, where students look when they talk.',
     'When students stop responding to each other, point to the poster instead of jumping in.'])

bm = (f'<div class="bmk"><div class="bmh">{ic("book-open-text", "ic bi")}<h2 class="h3">Say something</h2></div>'
      '<p class="bms">At the line, stop. Each partner picks one before you read on.</p><ul class="opts">'
      f'<li>{ic("binoculars", "ic oi")}<span><b>Predict</b> “I predict… because…”</span></li>'
      f'<li>{ic("question", "ic oi")}<span><b>Question</b> “Why did…?” “How does…?”</span></li>'
      f'<li>{ic("link", "ic oi")}<span><b>Connect</b> “This connects to…”</span></li></ul>'
      '<p class="bmf">Don’t use the same move two stops in a row.</p></div>')
add('text-talks-bookmarks', 'Text Talks Bookmarks', 'book-open-text', ['text-talks'], 'Students',
    'Each partner keeps one in the text while reading.',
    [cut([bm] * 4, 2)],
    ['Print one sheet per four students. Cut into four bookmarks.',
     'Draw a line or stick a note at each stopping point in the text before class.',
     'Give one bookmark per student. Partners read to the line, stop, and each say something.'],
    note='Cut into four.')

add('teach-swap-note-catcher', 'Teach Swap Note-Catcher', 'arrows-left-right', ['teach-swap'], 'Students',
    'One row for each part of the topic.',
    [name_date() + table(['Part', th('Topic', 'tag'), th('The 3 most important points', 'list-numbers'), th('The expert’s question: my answer', 'question')],
                         [[f'<b class="pt">{x}</b>', '', '<ol class="pts"><li></li><li></li><li></li></ol>', ''] for x in 'ABCD'],
                         ['8%', '18%', '44%', '30%'], rowh=1.62)],
    ['Print one per student.',
     'Split the topic into four parts, A to D, and give each expert group one part.',
     'Put students in expert groups, one per part. Experts write three key points and one question.',
     'Check each expert group’s three points before they go home to teach.',
     'Re-form home groups with one expert from each part. Experts teach, listeners fill in the note catcher.',
     'Notes go away for the short quiz at the end.'],
    ['<b>Expert group:</b> fill in your own row together.',
     '<b>Home group:</b> fill in the other rows as each expert teaches you.',
     '<b>Quiz:</b> notes away. Show what you learned.'])

add('feedback-flow-sheet', 'Feedback Flow Comment Sheet', 'chat-circle-dots', ['feedback-flow'], 'Students',
    'This sheet stays next to the draft. Readers rotate; the author stays put.',
    [nd('Draft by', 'Title') +
     ''.join(f'<div class="round"><div class="rh">{ic("chat-circle-dots", "ic li")}<b>Round {n}</b> Focus question: <i></i></div>{field("I noticed…", 2, sm=True)}{field("Try…", 1, sm=True)}<div class="sig">Reader’s initials <i></i></div></div>' for n in (1, 2, 3)) +
     field('<b>Author:</b> the one comment I’ll use, and what I’ll change', 2, icon='pencil-line')],
    ['Print one per student.',
     'Each student leaves their draft and sheet at their seat.',
     'Post the round’s focus question. Readers move to a new draft each round; authors stay put.',
     'Run three rounds, 3 to 4 minutes each. One reader, one comment, then move.',
     'Save the last few minutes for authors to pick a comment and revise.'],
    ['<b>Reader:</b> read the draft and answer only this round’s focus question.',
     'Write one thing you noticed and one thing to try. Initial it, then move on.',
     '<b>Author:</b> at the end, pick the comment you’ll use.'])

roles = [('package', 'Materials Manager', 'Hands out and collects supplies.'),
         ('laptop', 'Tech Helper', 'Helps classmates log in and troubleshoot.'),
         ('chats', 'Discussion Captain', 'Makes sure everyone in the group speaks.'),
         ('timer', 'Timekeeper', 'Watches the clock and gives 2-minute warnings.'),
         ('pencil-line', 'Recorder', 'Writes down the group’s answer.')]
add('task-masters-role-chart', 'Task Masters Role Chart', 'identification-badge', ['task-masters'], 'Classroom poster',
    'Post it, fill in names, and move every name down one role each week.',
    [table(['Role', 'The job in one line', 'This week'],
           [[f'<span class="role-r">{ic(i, "ic ri")}<b>{r}</b></span>', j, ''] for i, r, j in roles] + [[f'<span class="role-r">{ic("plus-circle", "ic ri")}<b class="u2"></b></span>', '', '']],
           ['34%', '40%', '26%'], rowh=1.12) +
     '<p class="note">Week of <i class="u"></i> · Rotate on <i class="u sm"></i></p>'],
    ['Print one copy to post. Laminate it if you want to reuse it with a dry-erase marker.',
     'Use the blank row for a role your class needs.',
     'Each week, move every name down one role so everyone tries each job.'])

# ===== Instructional Delivery =====
ww = ('<div class="ww"><div class="fld wd">' + lab('Word', 'text-aa') + lines(1) + '</div>'
      '<div class="fld">' + lab('What it means, in my words', 'chat-text') + lines(2, 'sm') + '</div>'
      '<div class="two"><div class="fld">' + lab('Example', 'check-circle') + lines(2, 'sm') + '</div><div class="fld">' + lab('Non-example', 'x-circle') + lines(2, 'sm') + '</div></div>'
      '<div class="two"><div class="fld">' + lab('My sentence', 'user') + ' <span class="hint">about my life</span>' + lines(2, 'sm') + '</div>'
      '<div class="bx sk"><div class="bxh">' + lab('Sketch it', 'pencil-simple') + '</div></div></div></div>')
add('word-wise-organizer', 'Word Wise Organizer', 'text-aa', ['word-wise'], 'Students',
    'One box per word. Keep it: the words come back this week.',
    [name_date() + cut([ww, ww], 1)],
    ['Print one sheet per two words, per student.',
     'Say the word, give a kid-friendly meaning, and show one example and one non-example.',
     'Students write their own sentence about their lives and sketch the word.',
     'Revisit each word at least twice this week.'],
    ['Write the word and what it means in your own words.',
     'Add an example and a non-example.',
     'Use it in a sentence about your life, then sketch it.'])

rr = [('notepad', 'Summarizer', 'Say the most important idea of this section in one or two sentences.', '“This part was mostly about…”'),
      ('question', 'Questioner', 'Ask the group one question the text answers, and one it makes you wonder.', '“Who can find where it says…?” “I wonder why…”'),
      ('magnifying-glass', 'Clarifier', 'Find a word or idea that could be confusing and help the group figure it out.', '“A tricky word was ___. I think it means ___ because…”'),
      ('binoculars', 'Predictor', 'Use clues from the text to guess what comes next.', '“I predict ___ because the text says…”')]
add('reading-relay-role-cards', 'Reading Relay Role Cards', 'book-open', ['reading-relay'], 'Students',
    'One set per group of four. After each section, pass your card to the left.',
    [cut([f'<div class="role">{ic(i, "ic rbig")}<h2 class="h3">{r}</h2><p><b>Your job:</b> {j}</p><p class="say"><b>Say:</b> {s}</p></div>' for i, r, j, s in rr], 2)],
    ['Print on cardstock, one set per group of four.',
     'Cut into four cards and keep each set in an envelope.',
     'Chunk the reading into at least four sections. After each section, students do their card’s job. Then everyone passes the card left.',
     'By the fourth section, everyone has played every role.'],
    note='Cut into four.')

cc = ('<div class="nd"><span>Name <i></i></span></div>'
      '<div class="ccv">' + ic('lightning', 'ic cci') + '<p class="frame">How is <i class="u"></i> like <i class="u"></i> ?</p></div>' +
      field('1. On my own: they’re alike because…', 3, sm=True, icon='lightbulb') + field('2. Where the comparison breaks', 2, sm=True, icon='lightning') +
      field('3. What my partner said', 2, sm=True, icon='chats'))
add('concept-clash-organizer', 'Concept Clash Organizer', 'lightning', ['concept-clash'], 'Students',
    'Think on your own first, then test your comparison with a partner.',
    [cut([cc] * 2, 1)],
    ['Print one per two students and cut in half.',
     'Pick two concepts from today’s lesson and fill in the blanks. Post it. Unlikely pairs work best.',
     'Students write alone for two minutes, then talk with a partner.',
     'Take three answers. Ask where each comparison breaks.'],
    note='Cut into two half sheets.')

add('question-storm-log', 'Question Storm Log', 'cloud-lightning', ['question-storm'], 'Students (one per group)',
    'The recorder writes every question exactly as it’s said.',
    [nd('Group', 'Date') +
     '<div class="rules"><div class="rl">' +
     f'<span>{ic("lightning", "ic li")}As many questions as you can.</span><span>{ic("hand-palm", "ic li")}Don’t stop to answer or discuss.</span><span>{ic("pencil-line", "ic li")}Write each one exactly as it’s said.</span></div>'
     '<div class="fld"><b>The prompt</b>' + lines(1) + '</div></div>' +
     table(['#', 'Question', 'C or O'], [[str(i), '', ''] for i in range(1, 15)], ['7%', '81%', '12%'], rowh=.35) +
     f'<p class="note">{ic("seal-check", "ic li")}<b>C</b> = closed (a one-word answer). <b>O</b> = open (needs explaining). Circle the one question worth a whole lesson.</p>'],
    ['Print one per group of three or four.',
     'Show the prompt: an image, quote or short clip.',
     'Storm for five minutes. Then groups mark each question C or O.',
     'Each group picks the one question worth a whole lesson.'],
    ['Pick a recorder. Everyone else asks questions.',
     'Storm for five minutes. No answers.',
     'Mark each question C or O, then circle your best one.'])

add('reality-check-planner', 'Reality Check Planner', 'globe', ['reality-check'], 'Students (one per group)',
    'Work through the four boxes in order, then get ready to pitch.',
    [nd('Group', 'Date') +
     '<div class="quad">' + box('1. What’s the problem, in one sentence?', 2.95, icon='warning') + box('2. Which idea from today applies?', 2.95, icon='lightbulb') +
     box('3. What’s the fix?', 2.95, icon='wrench') + box('4. How would we know it worked?', 2.95, icon='chart-line-up') + '</div>' +
     field('Our one-minute pitch', 2, icon='megaphone-simple')],
    ['Print one per group.',
     'Pose one local problem students can see, like cafeteria waste or hallway traffic.',
     'Give about 10 minutes for the four boxes.',
     'Each group pitches in one minute. Pick the best pitch. Students or you share it with the person who can act (for example, the principal or custodian).'],
    ['Fill the boxes in order, 1 to 4.',
     'Write a pitch you can say in one minute.',
     'Everyone in the group should be ready to give it.'])

add('mixed-practice-sheet', 'Mixed Practice Sheet', 'shuffle', ['shuffle-practice', 'explicit-essentials'], 'Students',
    'Mixed problems are tricky because you have to pick the strategy first.',
    [name_date() + table(['#', th('Strategy I’ll use', 'path'), th('My work and answer', 'pencil-line'), th('Partner picked the same?', 'users-three')],
                         [[str(i), '', '', '<span class="yn">Yes · No</span>'] for i in range(1, 11)], ['6%', '26%', '50%', '18%'], rowh=.55) +
     field('Where we disagreed, and who convinced whom', 2, icon='chats')],
    ['Print one per student.',
     'Write or post 10 problems: mostly today’s, with two or three older ones mixed in.',
     'Circulate and read the strategy column first. A wrong strategy shows up before a wrong answer.'],
    ['Before you solve, write the strategy you’ll use.',
     'Solve it and show your work.',
     'Compare strategies with a partner, then talk through any differences.'])

add('practice-check', 'Practice Check', 'check-circle', ['explicit-essentials', 'shuffle-practice', 'boards-up'], 'Teacher',
    'For independent practice: check every student’s first problem early on.',
    [nd('Class', 'Date', 'Skill') +
     table(['Student', th('Got it', 'check-circle'), th('Close', 'approximate-equals'), th('Stuck', 'x-circle'), 'Notes'], blank_rows(18, 5), ['30%', '11%', '11%', '11%', '37%'], rowh=.33) +
     f'<div class="tips">{ic("target", "ic li")}<span><b>Most students should get it right.</b> If many are stuck, stop and work another example with the class.</span></div>'],
    ['Print one per class, or slide it into a clipboard sleeve.',
     'Write names in before class so you can check fast.',
     'Walk the room early in practice. Check each student\'s first problem. Start with students who usually need help.',
     'Pull anyone marked stuck to a side table for a quick reteach while the rest keep going.'],
    ['Walk the room early in practice.',
     'Mark each student’s first problem: got it, close or stuck.',
     'Reteach the stuck group at a side table.'], )

# ===== Assessment & Retrieval =====
bb = ('<div class="nd"><span>Name <i></i></span></div>'
      f'<div class="ccv">{ic("brain", "ic cci")}<p class="frame">Everything I remember about <i class="u w"></i></p></div>' +
      mini(['Notes closed.', 'Write, sketch or list for 60 seconds.', 'Open notes and add what you missed in a different color.']) +
      box('From memory', 1.65, icon='brain') + box('What I missed', .65, 'use a different color', icon='eye'))
add('brain-busters-sheet', 'Brain Busters Sheet', 'brain', ['brain-busters'], 'Students',
    'Notes away. Get it out of your head first, then check.',
    [cut([bb] * 2, 1)],
    ['Print one per two students and cut in half.',
     'After a lesson segment, name the topic. Students close their notes and write or sketch everything they remember for 60 seconds.',
     'Students open notes and add what they missed in a different color.',
     'Partners compare and find what both forgot. Reteach that.'],
    note='Cut into two half sheets.')

fbk = ('<div class="nd"><span>Name <i></i></span></div>' +
       ''.join(f'<div class="fb">{ic("clock-counter-clockwise", "ic li")}<b>{x}</b>{lines(2, "xs")}</div>' for x in ('Last week', 'Last month', 'Last unit')))
add('flash-back-sheet', 'Flash Back Sheet', 'clock-counter-clockwise', ['flash-back'], 'Students',
    'No notes. Answer all three, guess if you’re not sure, then correct in a different color.',
    [cut([fbk] * 3, 1)],
    ['Print one sheet per three students and cut into slips.',
     'Post three questions: one from last week, one from last month, one from last unit.',
     'Students answer from memory. Then show the answers (or let them check notes). They fix mistakes in a different color.',
     'Twice a week is plenty.'],
    note='Cut into three slips.')

add('see-think-wonder', 'See, Think, Wonder', 'eye', ['visible-thinking'], 'Students',
    'Look closely. Write only what you can see first. No guesses yet.',
    [name_date() + '<div class="cols3">' +
     box('I see…', 6.9, 'just the facts', icon='eye') + box('I think… because…', 6.9, 'point to what makes you say that', icon='lightbulb') + box('I wonder…', 6.9, 'questions it raises', icon='question') + '</div>'],
    ['Print one per student, or project it and use notebooks.',
     'Show one image, object or short clip. Give a minute of silent looking first.',
     'Fill the columns left to right, then share a few.',
     'Save the wonders. They make good questions for tomorrow.'],
    ['Look closely for one minute without writing.',
     'Fill in the columns left to right.',
     'Every “I think” needs a “because.”'])

ggg = ('<div class="nd"><span>Name <i></i></span></div>' + field('Today’s goal', 1, sm=True, icon='target') +
       '<div class="ggg">' + field('Glow', 1, 'one thing that went well, and the goal it meets', sm=True, icon='sun') +
       field('Grow', 1, 'one thing that could be better', sm=True, icon='plant') +
       field('Go', 1, 'one action for next time, starting with a verb', sm=True, icon='arrow-right') + '</div>')
add('glow-grow-go-slips', 'Glow, Grow, Go Slips', 'plant', ['glow-grow-go'], 'Students',
    'Look back at what you made and at today’s goal.',
    [cut([ggg] * 3, 1)],
    ['Print one sheet per three students and cut into slips.',
     'Post today’s goal so students can copy it.',
     'At the end of a task, students fill one slip about their own work, or a partner’s.',
     'Collect them. Skim the Grow lines for what to reteach. Go lines show what students plan to do.'],
    note='Cut into three slips.')

ff = ('<div class="nd"><span>Name <i></i></span></div>' + field('Today we’re learning to…', 1, icon='crosshair') +
      '<div class="ican-h"><span>Rate yourself: 1 = not yet · 2 = with help · 3 = I could teach it</span><span class="rk">circle one</span></div>' +
      ''.join(f'<div class="ican"><b>I can</b><i></i><span class="rate"><span>1</span><span>2</span><span>3</span></span></div>' for _ in range(3)) +
      '')
add('focus-frame-check', 'Focus Frame Self-Check', 'crosshair', ['focus-frame'], 'Students',
    'Copy today’s “I can” statements from the board. At the end of class, circle a number for each.',
    [cut([ff] * 3, 1)],
    ['Print one sheet per three students and cut into slips.',
     'Post today’s goal and two or three “I can” statements.',
     'Check them at the start, middle and end of class.',
     'Collect the slips. Lots of 1s on the same line? Start there tomorrow.'],
    note='Cut into three slips.')

mm = ('<div class="nd"><span>Name <i></i></span><span>Quiz <i></i></span></div>' +
      field('1. How did I prepare? What exactly did I do, and for how long?', 2, icon='notepad') +
      field('2. Looking at what I got right and wrong, what worked?', 2, icon='check-circle') +
      field('3. Next time I will…', 1, icon='arrow-right') +
      '<div class="pick"><b>Pick one to try:</b><span>☐ Quiz myself</span><span>☐ Space it out</span><span>☐ Explain it to someone</span><span>☐ Mix up problem types</span></div>')
add('meta-matters-reflection', 'Meta Matters Reflection', 'lightbulb', ['meta-matters'], 'Students',
    'Use it when a quiz comes back. Be honest: this is for you.',
    [cut([mm] * 2, 1)],
    ['Print one per two students and cut in half.',
     'Hand it out with the graded quiz. Have students fill it in before they dwell on the score.',
     'Students answer all three, then pick one strategy to try.',
     'Before the next quiz, ask who tried their strategy and how it went.'],
    note='Cut into two half sheets.')

sd = (f'<div class="sdh">{ic("leaf", "ic li")}<b>Seeds of Insight</b><span class="hint">no names</span></div>' +
      field('What helped you learn today?', 4, sm=True, icon='thumbs-up') + field('What got in the way?', 4, sm=True, icon='warning'))
add('seeds-of-insight-slips', 'Seeds of Insight Slips', 'leaf', ['seeds-of-insight'], 'Students',
    'No names. Be honest: it helps your teacher plan.',
    [cut([sd] * 4, 2)],
    ['Print one sheet per four students and cut into slips.',
     'Once a week, hand them out in the last three minutes.',
     'Read them, change one thing, and tell students what you changed.'],
    note='Cut into four.')

add('growth-goals-tracker', 'Growth Goals Tracker', 'chart-line-up', ['growth-goals'], 'Students',
    'One per student. Keep it in a folder and pull it out every Friday.',
    [nd('Name', 'Goal buddy') +
     field('The skill I want to get better at', 1, icon='target') +
     field('How I’ll know I’ve met it', 1, 'a number I can count or a thing I can show', icon='seal-check') +
     '<p class="hint ex">Examples: “Spell 18 of 20 words correctly on Friday’s check.” “Write a paragraph with a topic sentence and three details without help.”</p>' +
     table(['Week', th('My score or evidence', 'chart-line-up'), th('One thing I did to practice', 'pencil-line'), 'Buddy’s initials'], [[str(i), '', '', ''] for i in range(1, 7)], ['10%', '34%', '40%', '16%'], rowh=.52) +
     '<h2>Goal met?</h2>' + field('☐ Yes! My buddy’s next challenge for me', 1) + field('☐ Not yet. What I’ll change next week', 1)],
    ['Print one per student.',
     'Help students write a goal they can count or show. Use the examples on the sheet.',
     'Pair students as goal buddies. Each buddy asks to see the evidence and initials the row.',
     'Every Friday, buddies check in for two minutes and initial the row.',
     'When a goal is met, the buddy sets the next challenge.'],
    ['Write one skill goal you can count or show.',
     'Each Friday, record your evidence and what you did to practice.',
     'Your goal buddy initials your row.'])

wf = ('<div class="nd"><span>Name <i></i></span></div>' + field('The question', 1, sm=True, icon='question') +
      field('My answer and my reason', 4, 'stuck? start with “I think… because…”', sm=True, icon='pencil-line') + field('One question I still have', 1, sm=True, icon='question') +
      field('After the talk: one sentence I’d change or add', 2, sm=True, icon='arrows-clockwise'))
add('write-first-sheet', 'Write First Sheet', 'notepad', ['write-first'], 'Students',
    'Pens moving the whole time. Then read your writing to your partner, word for word.',
    [cut([wf] * 2, 1)],
    ['Print one per two students and cut in half.',
     'Post the question. Start a two-minute timer: pens moving the whole time.',
     'Pairs share from their writing, word for word, before the class talks.',
     'After the discussion, students revise one sentence.'],
    note='Cut into two half sheets.')

# ===== Classroom Systems & Equity =====
qs = [('user', 'What do you like to be called?'), ('house', 'What do you do when you’re not at school?'),
      ('game-controller', 'A show, game, book, YouTuber or musician you’re into right now:'), ('soccer-ball', 'A sport, club, team or activity you’re part of:'),
      ('star', 'Something you’re really good at that school doesn’t see:'), ('sparkle', 'Something you’re looking forward to this year:'),
      ('lightbulb', 'One thing that helps you learn best:'), ('heart', 'One thing you’d like me to know about you:')]
add('get-to-know-you', 'Get to Know You Survey', 'user-circle', ['passing-connection', 'culture-check', 'hook-line'], 'Students, plus a teacher tracker',
    'Your teacher wants to know you. Answer what you’re comfortable sharing.',
    ['<div class="nd"><span>Name <i></i></span></div><ol class="survey">' + ''.join(f'<li>{ic(i, "ic sq")}<div><b>{q}</b>{lines(2)}</div></li>' for i, q in qs) + '</ol>',
     f'<h2 class="trk">{ic("lock-simple", "ic li")}Teacher tracker <span class="hint">keep separate from student work</span></h2>' +
     table(['Student', 'Detail to ask about', 'Week connected', 'Notes'], blank_rows(17, 4), ['24%', '34%', '14%', '28%'], rowh=.42)],
    ['Print page 1 for every student. Page 2 is your private tracker.',
     'Give it in the first weeks. Skip any question that doesn’t fit your students.',
     'Each week, pick one student and use one detail to start a short chat in passing.',
     'Keep answers private. To use a Google Form instead, copy the questions into a new form.'],
    note='Page 2 is your private tracker.')

add('connection-log', 'Connection Log', 'star', ['hidden-hero', 'kudos-call'], 'Teacher',
    'Rotate through every student. Put a dot by anyone you haven’t recognized lately.',
    [nd('Class', 'Weeks of') +
     table(['Student', th('Hidden Hero: date', 'star'), 'The action I named', th('Kudos call: date', 'phone-call'), 'What I shared home'], blank_rows(21, 5), ['22%', '13%', '26%', '13%', '26%'], rowh=.33)],
    ['Print one per class.',
     'Write every student’s name down the left side.',
     'Log each specific compliment and each positive call home.',
     'Before you pick next week’s students, look for empty rows.'])

add('goal-getter-tracker', 'Goal Getter Tracker', 'target', ['goal-getter'], 'Teacher',
    'One goal at a time. Two minutes a week to check in.',
    ['<div class="goalbox">' + ic('target', 'ic gi') + '<p class="frame big2">By <i class="u"></i>, I will <i class="u w"></i></p></div><p class="hint ex">Example: “By December 1, I will use a whiteboard check three times a week.”</p>' +
     nd('Colleague checking on me') +
     table(['Week', th('Times I did it (tally)', 'check-circle'), th('One thing I noticed in student work', 'eye')], [[str(i), '', ''] for i in range(1, 9)], ['10%', '28%', '62%'], rowh=.54) +
     '<h2>Close it</h2>' + field('☐ Met it. My new goal', 1) + field('☐ Not yet. My smaller version', 1)],
    ['Print one for yourself.',
     'Write one measurable goal with a date. Use the example as a model.',
     'Tell a colleague and ask them to check on you.',
     'Two minutes each week: tally, note what you saw, adjust.'])

add('learning-walk-notes', 'Learning Walk Notes', 'binoculars', ['learning-walk'], 'Teacher',
    'You’re there to borrow ideas, not to evaluate. Watch for your focus only.',
    [nd('Visiting', 'Date and time') +
     field('My focus question', 1, 'for example: “How does she get groups started so fast?”', icon='crosshair') +
     '<div class="two tall">' + box('What the teacher said', 3.9, icon='chats') + box('What the teacher and students did', 3.9, icon='users-three') + '</div>' +
     field('One move I’ll try, in one sentence', 2, icon='lightbulb') + field('When I’ll try it', 1, icon='calendar') +
     f'<div class="pick">{ic("envelope-simple", "ic li")}<span>☐ Thank-you note sent, naming what I learned</span></div>'],
    ['Print one per visit.',
     'Ask the teacher first and agree on 10 minutes.',
     'Pick one focus question and watch only for that.',
     'Leave a thank-you note naming what you learned. Then invite them to watch you try it.'])

add('door-greeting-chart', 'Door Greeting Chart', 'door', ['door-greeter'], 'Classroom poster',
    'Post it by the door. Students point to the greeting they want.',
    ['<div class="greet"><h2 class="gh">Pick your greeting</h2>' + ''.join(f'<div class="g" style="--g:{c}">{ic(i, "ic gico")}<span>{w}</span></div>' for i, w, c in
     [('hand-palm', 'High five', '#6ca9d8'), ('hand-fist', 'Fist bump', '#80c783'), ('handshake', 'Handshake', '#ffd54f'), ('hand-waving', 'Wave', '#e57373')]) + '</div>'],
    ['Print in color and post it at eye level next to the door.',
     'Stand at the door with a warm-up already on the board.',
     'Each student points to a greeting. Say their name as you do it.'])

LOGO = '<img src="/logo.webp?v=2" alt="Lesson Shuffle" width="440" height="300" class="plogo">'
PAGE_ICON = {}

def page(p):
    cards = p['cards']
    color = suit_of(cards[0])
    suit = SUIT_NAME[color]
    nm = [H.escape(card_title(c)) for c in cards]
    foot = ('For the ' + nm[0] + ' card') if len(nm) == 1 else ('For the ' + ', '.join(nm[:-1]) + (',' if len(nm) > 2 else '') + ' and ' + nm[-1] + ' cards')
    url = f'cards.lessonshuffle.com/{cards[0]}'
    qr = qr_svg('https://' + url)
    sheets = ''
    for i, body in enumerate(p['pages']):
        top = ''
        if i == 0:
            top = f'<p class="intro">{p["intro"]}</p>' + (dirs(p['dirs']) if p['dirs'] else '')
        sheets += (f'<section class="sheet"><header class="ph"><div class="pic">{ic(p["icon"], "ic hi")}</div>'
                   f'<div class="pti"><span class="pk">Lesson Shuffle printable · {H.escape(suit)}</span>'
                   f'<h1>{H.escape(p["title"])}</h1></div>{LOGO}</header>'
                   + top + body +
                   f'<footer class="pf"><div class="pfl"><b>{foot}</b><span>Full guide, slides and more printables: {url}</span></div>'
                   f'<div class="pfq">{qr}<span>Scan for the guide</span></div></footer></section>')
    n = len(p['pages'])
    links = ''.join(f'<a class="gcard" href="/{c}"><img src="/cards/{c}.webp" width="341" height="585" alt="The {H.escape(card_title(c))} card"><span>{H.escape(card_title(c))}</span></a>' for c in cards)
    note = f'<p class="gnote">{p["note"]}</p>' if p['note'] else ''
    guide = (f'<section class="guide" aria-labelledby="gh"><div class="gtxt"><h2 id="gh">How to use it</h2>'
             f'<ol class="gsteps">' + ''.join(f'<li><span class="n">{k}</span><span>{s}</span></li>' for k, s in enumerate(p['guide'], 1)) + f'</ol>{note}'
             f'<p class="gmeta">{H.escape(p["who"])} · {n} page{"s" if n > 1 else ""}, US Letter · black-and-white friendly</p></div>'
             f'<div class="gcards"><span class="gk">Goes with</span>{links}</div></section>')
    body = guide + sheets
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{H.escape(p["title"])} · Lesson Shuffle printable</title><meta name="description" content="{H.escape(p["intro"])}">
<link rel="icon" href="/favicon.png"><link rel="stylesheet" href="/print.css?v=3"></head>
<body style="--suit:{color}">{sprite(body)}<header class="bar"><div class="bar-in"><a href="/printables" class="back">← All printables</a>
<div class="meta"><b>{H.escape(p["title"])}</b><span>{H.escape(suit)} · For {" · ".join(f'<a href="/{c}">{H.escape(card_title(c))}</a>' for c in cards)}</span></div>
<button type="button" onclick="window.print()" class="pbtn">{ic("printer", "ic bi2")}Print</button></div></header>
<main>{body}</main></body></html>'''

CSS = r'''@font-face{font-family:"Days One";font-weight:400;font-display:swap;src:url(/fonts/days-one-latin-400-normal.woff2) format("woff2")}
@font-face{font-family:"Rubik";font-weight:400;font-display:swap;src:url(/fonts/rubik-latin-400-normal.woff2) format("woff2")}
@font-face{font-family:"Rubik";font-weight:500;font-display:swap;src:url(/fonts/rubik-latin-500-normal.woff2) format("woff2")}
@font-face{font-family:"Rubik";font-weight:700;font-display:swap;src:url(/fonts/rubik-latin-700-normal.woff2) format("woff2")}
:root{--ink:#26384a;--navy:#305f82;--rule:#9aa8b3;--soft:#c9d3da;color-scheme:light}
body{--tint:color-mix(in srgb,var(--suit) 16%,#fff)}
*{box-sizing:border-box}
body{margin:0;background:#e9eef1;color:var(--ink);font:400 12pt/1.4 "Rubik",system-ui,sans-serif}
a{color:var(--navy)}
.ic{--du:var(--suit);width:1em;height:1em;fill:var(--navy);flex:none;vertical-align:-.14em}
.bar{background:#fff;border-bottom:4px solid var(--suit);position:sticky;top:0;z-index:2}
.bar-in{max-width:8.5in;margin:0 auto;padding:.7rem 1rem;display:flex;gap:1rem;align-items:center;flex-wrap:wrap}
.back{font-weight:500;white-space:nowrap}
.meta{flex:1;min-width:14rem;font-size:.92rem}.meta b{display:block;font:400 1.15rem "Days One",sans-serif;color:var(--navy)}
.meta span{color:#5b6b78}
.pbtn{display:inline-flex;gap:.45rem;align-items:center;background:var(--navy);color:#fff;border:0;border-radius:.5rem;padding:.65rem 1.4rem;font:500 1rem "Rubik",sans-serif;cursor:pointer}
.pbtn .ic{fill:#fff;width:1.2em;height:1.2em;--du:#fff;--duo:.35}
.pbtn:hover{filter:brightness(1.12)}.pbtn:focus-visible,.back:focus-visible,.gcard:focus-visible{outline:3px solid var(--suit);outline-offset:2px}
main{padding:1.2rem .6rem 3rem}
.guide{width:8.5in;max-width:100%;margin:0 auto 1.2rem;background:#fff;border-radius:.6rem;border-top:6px solid var(--suit);padding:1rem 1.2rem;display:flex;gap:1.2rem;box-shadow:0 2px 10px rgba(0,0,0,.08)}
.gtxt{flex:1;min-width:0}.guide h2{font:400 1.2rem "Days One",sans-serif;color:var(--navy);margin:0 0 .5rem}
.gsteps{list-style:none;margin:0;padding:0;display:grid;gap:.45rem}.gsteps li{display:flex;gap:.6rem;align-items:flex-start;font-size:.98rem;line-height:1.4}
.n{flex:none;display:inline-grid;place-items:center;width:1.55em;height:1.55em;border-radius:50%;background:var(--navy);color:#fff;font:500 .82em "Rubik",sans-serif}
.gnote{margin:.6rem 0 0;font-size:.92rem;color:#3c4c5a}.gmeta{margin:.6rem 0 0;font-size:.85rem;color:#5b6b78}
.gcards{display:flex;flex-direction:column;gap:.5rem;align-items:center;width:7.5rem;flex:none}.gk{font-size:.75rem;letter-spacing:.08em;text-transform:uppercase;color:#5b6b78}
.gcard{display:flex;flex-direction:column;align-items:center;text-decoration:none;font-size:.82rem;font-weight:500;text-align:center;gap:.2rem}
.gcard img{width:6.2rem;height:auto;border-radius:.4rem;box-shadow:0 1px 6px rgba(0,0,0,.18)}
.guide:has(.gcard:nth-of-type(2)) .gcard img{width:4.6rem}
@media (max-width:640px){.guide{flex-direction:column}.gcards{width:auto;flex-direction:row;flex-wrap:wrap;justify-content:center}}
.sheet{background:#fff;width:8.5in;max-width:100%;min-height:11in;margin:0 auto 1.2rem;padding:.45in .5in .4in;box-shadow:0 2px 10px rgba(0,0,0,.12);display:flex;flex-direction:column}
@media (max-width:8.6in){.sheet{min-height:0;padding:1rem}}
@media screen and (max-width:8.6in){.sheet{overflow-x:auto}}
.ph{display:flex;align-items:center;gap:.14in;border-bottom:3px solid var(--suit);padding-bottom:.08in;margin-bottom:.1in}
.pic{width:.56in;height:.56in;border-radius:50%;background:var(--tint);border:2px solid var(--suit);display:grid;place-items:center;flex:none}
.hi{width:.36in;height:.36in}
.pti{flex:1;min-width:0}
.pk{font-size:7.5pt;letter-spacing:.08em;text-transform:uppercase;color:#5b6b78}
.ph h1{margin:0;font:400 19pt/1.1 "Days One",sans-serif;color:var(--navy)}
.plogo{width:.9in;height:auto}
.intro{margin:0 0 .08in;font-size:10.5pt;color:#3c4c5a}
.dirs{display:flex;gap:.12in;align-items:flex-start;background:var(--tint);border-radius:.08in;padding:.07in .12in;margin:0 0 .1in}
.dh{font:400 9pt "Days One",sans-serif;color:var(--navy);text-transform:uppercase;letter-spacing:.04em;padding-top:.02in;flex:none}
.dirs ol{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:.04in .18in;flex:1}
.dirs li{display:flex;gap:.06in;align-items:flex-start;font-size:9.5pt;line-height:1.3;flex:1 1 2in}
.dirs .n{font-size:8pt}
.mini{list-style:none;margin:.02in 0 .04in;padding:0;display:flex;gap:.16in;flex-wrap:wrap;font-size:9pt;color:#3c4c5a}.mini li{display:flex;gap:.05in;align-items:center}.mini .n{font-size:7pt}
.pf{margin-top:auto;padding-top:.08in;display:flex;justify-content:space-between;align-items:center;gap:.2in;border-top:1px solid var(--soft)}
.pfl{display:flex;flex-direction:column;font-size:8pt;color:#5b6b78}.pfl b{font-weight:500;color:var(--navy);font-size:8.5pt}
.pfq{display:flex;align-items:center;gap:.06in;font-size:7pt;color:#5b6b78;text-align:right}.pfq span{width:.6in}
.qr{width:.56in;height:.56in}
h2{font:500 12.5pt "Rubik",sans-serif;color:var(--navy);margin:.12in 0 .05in;display:flex;gap:.06in;align-items:center}
h3,h2.h3{font:400 14pt "Days One",sans-serif;color:var(--navy);margin:0 0 .06in}
.hint{font-size:9pt;color:#5b6b78;font-weight:400}.hint.ex{margin:.04in 0}
.nd{display:flex;gap:.25in;margin:.02in 0 .08in;flex-wrap:wrap}.nd span{display:flex;flex:1;gap:.08in;align-items:flex-end;font-size:10pt;min-width:1.6in}
.nd i{flex:1;border-bottom:1px solid var(--rule);height:1.1em}
.fld{margin:.06in 0}.fld>b,.bxh b{font-weight:500;font-size:10.5pt}
.li{width:1.15em;height:1.15em;margin-right:.05in;vertical-align:-.22em}
.ln i{display:block;border-bottom:1px solid var(--rule);height:.32in}.ln.sm i{height:.255in}.ln.xs i{height:.215in}
.bx{border:1.5px solid var(--soft);border-radius:.08in;padding:.06in .1in;margin:.06in 0}
.bxh{display:flex;align-items:center;flex-wrap:wrap;gap:0 .06in}
.two{display:grid;grid-template-columns:1fr 1fr;gap:.18in}.two>.bx,.two>.fld{margin:.04in 0}
.quad{display:grid;grid-template-columns:1fr 1fr;gap:.14in}.quad .bx{margin:0}
.cols3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:.12in}.cols3 .bx{margin:0}.cols3 .bxh{flex-direction:column;align-items:flex-start}
.cols3 .li{width:.42in;height:.42in;margin:0 0 .03in}
.cut{display:grid;flex:1}.cut.c1{grid-auto-rows:1fr}.cut.c2{grid-template-columns:1fr 1fr;grid-auto-rows:1fr}
.piece{border:1.5px dashed #a9b6bf;padding:.1in .16in;margin:-0.75px;display:flex;flex-direction:column;justify-content:flex-start;position:relative}
.cut .piece:first-child::before{content:"✂";position:absolute;top:-.11in;left:.2in;font-size:10pt;color:#8a99a5;background:#fff;padding:0 .03in;line-height:1}
.ccv{display:flex;gap:.08in;align-items:center}.cci{width:.36in;height:.36in}
.acard{position:relative;flex:1;display:flex;align-items:center;justify-content:center;border:3px solid var(--suit);border-radius:.18in;margin:.06in}
.amid{position:relative;display:grid;place-items:center;width:2.6in;height:2.6in}
.shp{fill:none;stroke:var(--navy);stroke-width:5}.shp.bg{position:absolute;inset:0;width:100%;height:100%;fill:var(--tint);stroke:var(--suit);stroke-width:4}
.big{position:relative;font:400 1.6in/1 "Days One",sans-serif;color:var(--navy)}
.ix{position:absolute;display:flex;flex-direction:column;align-items:center;font:400 22pt/1 "Days One",sans-serif;color:var(--navy);gap:.04in}
.ix.tl{top:.12in;left:.16in}.ix.br{bottom:.12in;right:.16in;transform:rotate(180deg)}.shp.sm{width:.22in;height:.22in;stroke-width:9;fill:var(--tint)}
.sign{display:flex;flex-direction:column;flex:1;justify-content:center}
.sgtop{position:relative;display:grid;place-items:center;height:5.4in}
.shp.sg{position:absolute;width:5.2in;height:5.2in;fill:var(--tint);stroke:var(--suit);stroke-width:2.5}
.huge{position:relative;font:400 3.2in/1 "Days One",sans-serif;color:var(--navy)}
.pos .ln i{height:.42in}
.poster{display:grid;gap:.25in;flex:1;align-content:center}
.pst{border:4px solid var(--suit);border-radius:.2in;padding:.22in .36in}
.psh{display:flex;align-items:center;gap:.12in;flex-wrap:wrap}.psh span:not(.pn){font:400 26pt "Days One",sans-serif;color:var(--navy)}
.psh em{flex-basis:100%;font-style:normal;font-size:13pt;color:#3c4c5a;margin-top:.02in}
.pn{display:grid;place-items:center;width:.5in;height:.5in;border-radius:50%;background:var(--navy);color:#fff;font:500 18pt "Rubik",sans-serif}
.pi{width:.62in;height:.62in}
.pst p{font:400 28pt/1.2 "Days One",sans-serif;color:var(--navy);margin:.1in 0 0;padding-left:.2in;border-left:6px solid var(--tint)}
.bmk{display:flex;flex-direction:column;flex:1}.bmh{display:flex;gap:.08in;align-items:center}.bi{width:.36in;height:.36in}.bmh .h3{margin:0}
.bms{font-size:10pt;color:#3c4c5a;margin:.04in 0}
.opts{list-style:none;padding:0;margin:.1in 0;font-size:12.5pt;display:grid;gap:.22in}.opts li{display:flex;gap:.1in;align-items:center}.oi{width:.48in;height:.48in}
.opts b{display:block;font:400 12pt "Days One",sans-serif;color:var(--navy)}
.bmf{margin:auto 0 0;font-size:9pt;color:#5b6b78}
table.grid{width:100%;border-collapse:collapse;table-layout:fixed;margin:.06in 0}
.grid th{background:var(--tint);color:var(--navy);font-weight:500;font-size:9.5pt;text-align:left;padding:.05in .07in;border:1px solid var(--soft)}
.thi{display:flex;gap:.05in;align-items:center}.ti{width:1.2em;height:1.2em}
.grid td{border:1px solid var(--soft);padding:.04in .07in;vertical-align:top;font-size:10pt}
.pt{font:400 18pt "Days One",sans-serif;color:var(--navy)}
.pts{margin:0;padding-left:1.1em}.pts li{height:.45in;border-bottom:1px solid #e3e9ed}
.round{border:1.5px solid var(--soft);border-radius:.08in;padding:.05in .12in;margin:.06in 0}
.rh{display:flex;gap:.06in;align-items:flex-end;font-size:10.5pt}.rh i{flex:1;border-bottom:1px solid var(--rule);height:1.1em}
.sig{font-size:9pt;color:#5b6b78;display:flex;gap:.08in;justify-content:flex-end}.sig i{width:.8in;border-bottom:1px solid var(--rule)}
.role-r{display:flex;gap:.1in;align-items:center}.ri{width:.42in;height:.42in}.u2{display:inline-block;width:1.2in;border-bottom:1px solid var(--rule);height:1.1em}
.role{display:flex;flex-direction:column;gap:.03in;justify-content:center;flex:1}.role .h3{font-size:17pt;text-transform:uppercase}
.rbig{width:.6in;height:.6in}
.role p{margin:.03in 0;font-size:12pt}.role .say{color:#3c4c5a}
.frame{font-size:12pt;margin:.06in 0;display:flex;gap:.08in;align-items:flex-end;flex-wrap:wrap;flex:1}
.u{display:inline-block;border-bottom:1px solid var(--rule);min-width:1.4in;height:1.2em}.u.w{min-width:2.8in;flex:1}.u.sm{min-width:.9in}
.big2{font-size:14pt;line-height:2}
.goalbox{display:flex;gap:.12in;align-items:center;background:var(--tint);border-radius:.1in;padding:.04in .14in}.gi{width:.5in;height:.5in}
.rules{border:1.5px solid var(--soft);border-radius:.08in;padding:.06in .14in;margin:.02in 0 .06in;font-size:10pt}
.rl{display:flex;flex-wrap:wrap;gap:.04in .25in}.rl span{display:flex;align-items:center}
.note{font-size:9.5pt;color:#5b6b78;margin:.06in 0;display:flex;gap:.06in;align-items:center;flex-wrap:wrap}
.yn{font-size:9pt;color:#5b6b78}
.fb{margin:.03in 0}.fb b{font-weight:500;font-size:10.5pt}
.ggg .fld{margin:.03in 0}
.ican-h{display:flex;justify-content:space-between;font-size:8pt;color:#5b6b78;margin-top:.04in}.ican-h .rk{width:1.1in;text-align:center}
.ican{display:flex;gap:.1in;align-items:flex-end;margin:.05in 0;font-size:11pt}.ican i{flex:1;border-bottom:1px solid var(--rule);height:1.2em}
.rate{display:flex;gap:.1in;width:1.1in;justify-content:center}.rate span{display:grid;place-items:center;width:.26in;height:.26in;border:1.5px solid var(--navy);border-radius:50%;font-weight:500;color:var(--navy);font-size:9.5pt}
.pick{font-size:10.5pt;margin:.06in 0;display:flex;gap:.06in .18in;align-items:center;flex-wrap:wrap}
.sdh{display:flex;align-items:center;gap:.04in;margin-bottom:.02in}.sdh b{font:400 11pt "Days One",sans-serif;color:var(--navy);flex:1}
.clock{display:grid;grid-template-columns:1fr 1fr;gap:.04in .4in;margin-top:.04in}
.hr{display:flex;gap:.1in;align-items:flex-end;height:.8in}.hr b{width:.95in;font-weight:500;color:var(--navy)}.hr i{flex:1;border-bottom:1px solid var(--rule);height:1.2em}
.cf{width:.46in;height:.46in;flex:none;align-self:center}.cf-o{fill:var(--tint);stroke:var(--navy);stroke-width:1.3}.cf-t line{stroke:var(--navy);stroke-width:.8}
.cf-m{stroke:var(--navy);stroke-width:1;stroke-linecap:round}.cf-h{stroke:var(--navy);stroke-width:2;stroke-linecap:round}.cf-c{fill:var(--navy)}
.tips{margin-top:.14in;font-size:10pt;background:var(--tint);border-radius:.08in;padding:.08in .14in;display:flex;gap:.06in;align-items:flex-start}
.survey{list-style:none;padding:0;margin:.02in 0;display:grid;gap:.02in}.survey li{display:flex;gap:.1in;align-items:flex-start}.survey li>div{flex:1}
.survey b{font-weight:500;font-size:10.5pt}.survey .ln i{height:.355in}.sq{width:.36in;height:.36in;margin-top:.02in}
.trk{margin-top:0}
.tall .bx{margin:.04in 0}
.sk{min-height:.9in;margin:.04in 0}
.greet{flex:1;display:grid;grid-template-columns:1fr 1fr;gap:.25in;align-content:center}
.gh{grid-column:1/-1;justify-content:center;font:400 30pt "Days One",sans-serif;color:var(--navy);margin:0 0 .1in}
.g{border:6px solid var(--g);border-radius:.25in;height:3.3in;display:flex;flex-direction:column;gap:.12in;align-items:center;justify-content:center;text-align:center}
.g .ic{--du:var(--g);--duo:.7}.gico{width:1.5in;height:1.5in}
.g span{font:400 28pt/1.1 "Days One",sans-serif;color:var(--navy)}
.ww{display:flex;flex-direction:column}.ww .ln i{height:.28in}.ww .ln.sm i{height:.25in}
@page{size:letter;margin:0}
@media print{body{background:#fff}.bar,.guide{display:none}main{padding:0}
.sheet{box-shadow:none;margin:0;width:8.5in;height:10.98in;min-height:0;page-break-after:always;break-after:page;overflow:hidden}
.sheet:last-child{page-break-after:auto;break-after:auto}
*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
'''

def index_page():
    groups = {}
    order = ['#6ca9d8', '#80c783', '#ffd54f', '#e57373']
    for p in P:
        groups.setdefault(suit_of(p['cards'][0]), []).append(p)
    body = ''
    for col in order:
        items = sorted(groups.get(col, []), key=lambda p: p['title'])
        lis = ''.join(f'<li><a href="/print/{p["slug"]}"><span class="pico" style="color:#305f82;fill:#305f82">{icon_inline(p["icon"], 30).replace("<path", f"<path", 1)}</span><span class="ptx"><b>{H.escape(p["title"])}</b><span>{" · ".join(H.escape(card_title(c)) for c in p["cards"])} · {p["who"]}</span></span></a></li>' for p in items)
        body += f'<section class="pgrp" style="--suit:{col}"><h2>{H.escape(SUIT_NAME[col])}</h2><ul class="plist">{lis}</ul></section>'
    return body

if __name__ == '__main__':
    os.makedirs(f'{PUB}/print', exist_ok=True)
    open(f'{PUB}/print.css', 'w').write(CSS)
    for p in P:
        open(f'{PUB}/print/{p["slug"]}.html', 'w').write(page(p))
    import json
    json.dump([{k: p[k] for k in ('slug', 'title', 'cards', 'who', 'icon')} for p in P], open(str(HERE) + '/printables.json', 'w'), indent=1)
    open(str(HERE) + '/printables_index_body.html', 'w').write(index_page())
    print(len(P), 'printables')
