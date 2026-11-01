# Wires the printables into the site: /printables page, nav + footer links,
# each card's Printables block, How to Play anatomy, independent-practice step edits.
import os, re, json, html as H
import pathlib; HERE = pathlib.Path(__file__).resolve().parent; PUB = str(HERE.parent.parent / 'public')
os.chdir(PUB)
P = json.load(open(str(HERE) + '/printables.json'))
by_card = {}
for p in P:
    for c in p['cards']:
        by_card.setdefault(c, []).append(p)

NAV_OLD = '<a href="/how-to-play">How to play</a></nav>'
NAV_NEW = '<a href="/how-to-play">How to play</a><a href="/printables">Printables</a></nav>'
FOOT_OLD = '<a href="/how-to-play">How to play</a> · <a href="https://lessonshuffle.com">'
FOOT_NEW = '<a href="/how-to-play">How to play</a> · <a href="/printables">Printables</a> · <a href="https://lessonshuffle.com">'

def plink(p):
    return f'<a href="/print/{p["slug"]}">{H.escape(p["title"])}</a>'

changed = 0
for f in sorted(os.listdir('.')):
    if not f.endswith('.html'):
        continue
    s = open(f).read(); o = s
    if '/printables">Printables</a></nav>' not in s:
        s = s.replace(NAV_OLD, NAV_NEW)
    if '/printables">Printables</a> · <a href="https://lessonshuffle.com">' not in s:
        s = s.replace(FOOT_OLD, FOOT_NEW)
    slug = f[:-5]
    if slug in by_card and 'id="resources"' in s:
        items = by_card[slug]
        txt = ('<p>Ready to print: ' + ', '.join(plink(p) for p in items) + '.</p>') if len(items) > 1 else f'<p>Ready to print: {plink(items[0])}.</p>'
        block = f'<div class="res"><h3>Printables</h3>{txt}</div>'
        if '<h3>Printables</h3>' in s:
            s = re.sub(r'<div class="res"><h3>Printables</h3>.*?</div>', block, s, count=1, flags=re.S)
        else:
            s = s.replace('<div class="res-grid">', '<div class="res-grid">' + block, 1)
    if s != o:
        open(f, 'w').write(s); changed += 1

# How to Play: card anatomy matches the tuck box
hp = open('how-to-play.html').read()
hp = re.sub(r'<section id="reading-a-card"><h2>Reading a card</h2>\s*<ul class="list">.*?</ul>',
    '<section id="reading-a-card"><h2>Reading a card</h2>\n<ul class="list"><li><b>Suit</b> (top left): which of the four suits the card belongs to.</li>'
    '<li><b>Difficulty</b> (top right): 1 to 3 apples. More apples means more planning or practice.</li>'
    '<li><b>Tagline</b> (dark bar): the move in a few words.</li>'
    '<li><b>The move</b> (card body): why it matters and what to do.</li>'
    '<li><b>Level up</b> (last line, marked ▲): a harder version for once the move feels easy.</li>'
    '<li><b>Steps</b> (QR code): the full guide, class slides and printables for that card.</li></ul>', hp, count=1, flags=re.S)
if '/printables' not in hp.split('<main')[1].split('</main>')[0]:
    hp = hp.replace('<div class="actions"><a class="btn-main" href="/">Browse all cards</a></div>',
                    '<div class="actions"><a class="btn-main" href="/">Browse all cards</a><a class="btn-ghost" href="/printables">Printables</a></div>', 1)
open('how-to-play.html', 'w').write(hp)

# /printables page from the How to Play shell
body = open(str(HERE) + '/printables_index_body.html').read()
shell = open('how-to-play.html').read()
head, rest = shell.split('<section class="card-hero"', 1)
tail = shell[shell.index('</main>'):]
head = (head.replace('<title>How to Play · Lesson Shuffle</title>', '<title>Printables · Lesson Shuffle</title>')
        .replace('https://cards.lessonshuffle.com/how-to-play', 'https://cards.lessonshuffle.com/printables'))
desc = 'Free printables for Lesson Shuffle cards: organizers, slips, role cards, posters and teacher trackers.'
head = re.sub(r'(<meta name="description" content=")[^"]*', r'\g<1>' + desc, head)
head = re.sub(r'(<meta property="og:title" content=")[^"]*', r'\g<1>Printables · Lesson Shuffle', head)
head = re.sub(r'(<meta property="og:description" content=")[^"]*', r'\g<1>' + desc, head)
hero = ('<section class="card-hero" aria-label="Page summary"><div class="wrap">\n'
        '  <div class="eyebrow"><span class="suit">Lesson Shuffle</span><span>Ready to print</span></div>\n'
        '  <h1>Printables</h1>\n'
        f'  <p class="tagline">{len(P)} ready-to-print sheets that make a card faster to run. US Letter, black-and-white friendly.</p>\n'
        '</div></section>\n<main class="wrap" id="main">\n'
        '<section><p>Open one, press Print, and you’re set. Each sheet is also linked from its card’s page, under Go deeper → Resources.</p></section>\n')
open('printables.html', 'w').write(head + hero + body + '\n' + tail)

# Independent practice: monitoring in Explicit Essentials and Shuffle Practice
def edit(fn, pairs):
    s = open(fn).read()
    for a, b in pairs:
        if b in s: continue  # already applied
        n = s.count(a)
        assert n >= 1, (fn, a[:50])
        s = s.replace(a, b)
    open(fn, 'w').write(s)

ee_old = 'Students try one or two alone while you circulate.'
ee_new = ('Students try two or three alone. Walk the room. Look at each student’s first answer. '
          'Send anyone stuck to your side table.')
edit('explicit-essentials.html', [(ee_old, ee_new),
     ('5. Guide student practice; 6. Check for understanding; 7. Obtain a high success rate',
      '5. Guide student practice; 6. Check for understanding; 7. Obtain a high success rate; 9. Require and monitor independent practice')])
edit('shuffle-practice.html', [('Students work on their own.', 'Students work on their own. Circulate and read the strategy names in the margins first: a wrong strategy shows up before a wrong answer.')])
print('pages changed', changed)
