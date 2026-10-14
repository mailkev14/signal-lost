"""Optional UI smoke test. Requires Python + Playwright + Chromium, not needed to play.
Runs the offline build as inline HTML (no browser network access required).
Usage: CHROMIUM_PATH=/usr/bin/chromium python scripts/browser-smoke.py
"""
from pathlib import Path
import os
import re
import json
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'test-results'
OUTPUT.mkdir(exist_ok=True)
HTML = (ROOT / 'dist' / 'signal-lost-training.html').read_text()

def solve(page, kind):
    clues = page.locator('.intel-card p').all_inner_texts()
    if kind == 'sequence':
        first = re.search(r'^(\w+) begins', clues[0]).group(1)
        second, third = re.search(r'^(\w+) must be followed immediately by (\w+)', clues[1]).groups()
        last = re.search(r'^(\w+) is always', clues[2]).group(1)
        for symbol in [first, second, third, last]:
            page.locator(f'[data-action="glyph"][data-value="{symbol}"]').click()
        page.get_by_role('button', name='Transmit sequence').click()
    elif kind == 'frequency':
        beacon = page.locator('.console-readout b').inner_text()
        base = int(re.search(beacon + r': (\d+)', clues[0]).group(1))
        gain = int(re.search(r'by (\d+)', clues[1]).group(1))
        operation, offset = re.search(r'(ADD|SUBTRACT) (\d+)', clues[2]).groups()
        answer = base * gain + int(offset) * (1 if operation == 'ADD' else -1)
        page.locator('#numeric-answer').fill(str(answer))
        assert page.locator('#numeric-submit').is_enabled()
        page.locator('#numeric-submit').click()
    elif kind == 'grid':
        row, col = re.search(r'Begin at ([A-E])([1-5])', clues[0]).groups()
        dy = int(re.search(r'Move (\d+)', clues[1]).group(1)) * (-1 if 'UP' in clues[1] else 1)
        dx = int(re.search(r'Move (\d+)', clues[2]).group(1)) * (-1 if 'LEFT' in clues[2] else 1)
        answer = chr(ord(row) + dy) + str(int(col) + dx)
        page.locator(f'[data-action="coordinate"][data-value="{answer}"]').click()
        page.get_by_role('button', name='Set escape vector').click()
    else:
        packet = list(map(int, re.search(r'packet is (\d{4})', clues[0]).group(1)))
        if 'RIGHT TO LEFT' in clues[1]:
            packet.reverse()
        elif 'FIRST digit' in clues[1]:
            packet = packet[1:] + packet[:1]
        else:
            packet = [packet[0], packet[2], packet[1], packet[3]]
        shift = int(re.search(r'ADD (\d+)', clues[2]).group(1))
        answer = ''.join(str((n + shift) % 10) for n in packet)
        page.locator('#numeric-answer').fill(answer)
        page.locator('#numeric-submit').click()

with sync_playwright() as playwright:
    executable = os.getenv('CHROMIUM_PATH')
    options = {'headless': True, 'args': ['--no-sandbox']}
    if executable:
        options['executable_path'] = executable
    browser = playwright.chromium.launch(**options)
    page = browser.new_page(viewport={'width': 1440, 'height': 1040})
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.set_content(HTML, wait_until='load')
    page.wait_for_selector('.connection-card')
    page.screenshot(path=str(OUTPUT / 'landing-desktop.png'), full_page=True)
    page.get_by_role('button', name='How to play', exact=True).click()
    assert page.locator('#help-dialog').is_visible()
    page.get_by_role('button', name='Close instructions', exact=True).click()
    page.get_by_role('button', name='Try solo training').click()
    page.wait_for_selector('.glyph-grid')
    page.screenshot(path=str(OUTPUT / 'training-desktop.png'), full_page=True)
    for kind in ['sequence', 'frequency', 'grid', 'pin']:
        solve(page, kind)
        if kind != 'pin':
            page.wait_for_selector('.between-panel')
            page.locator('[data-action="next"]').click()
        else:
            page.wait_for_selector('.result-won')
    assert '04 / 04' in page.locator('.result-stats').inner_text()
    page.screenshot(path=str(OUTPUT / 'mission-complete.png'), full_page=True)
    page.get_by_role('button', name='Run another simulation').click()
    page.wait_for_selector('.glyph-grid')
    assert page.locator('.complete').count() == 0
    for width in [390, 320, 768]:
        page.set_viewport_size({'width': width, 'height': 844})
        assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), f'Overflow at {width}px'
        if width == 390:
            page.screenshot(path=str(OUTPUT / 'training-mobile.png'), full_page=True)
    # Fresh mobile landing; no stored session or network is involved.
    mobile = browser.new_page(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
    mobile.on('pageerror', lambda error: errors.append(str(error)))
    mobile.set_content(HTML, wait_until='load')
    mobile.wait_for_selector('.connection-card')
    assert mobile.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
    mobile.screenshot(path=str(OUTPUT / 'landing-mobile.png'), full_page=True)
    assert not errors, errors
    browser.close()
    result = {
        'result': 'PASS',
        'checks': ['desktop landing', 'help dialog', 'four-system training win', 'replay', '320/390/768px no horizontal overflow', 'mobile landing'],
        'javascript_errors': errors,
        'scope': 'Offline training UI in Chromium; live browser networking was not exercised by this script.',
    }
    (OUTPUT / 'browser-smoke.json').write_text(json.dumps(result, indent=2))
    print(json.dumps(result, indent=2))
