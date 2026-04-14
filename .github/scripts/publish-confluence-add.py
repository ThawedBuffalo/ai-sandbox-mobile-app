#!/usr/bin/env python3
import argparse
import base64
import html
import json
import os
import re
import sys
import urllib.parse
import urllib.request


def md_to_storage(markdown_text: str) -> str:
    lines = markdown_text.strip().splitlines()
    out = []
    in_ul = False
    in_ol = False

    def render_inline_md(text: str) -> str:
        rendered = html.escape(text)
        rendered = re.sub(r'`([^`]+)`', r'<code>\1</code>', rendered)
        rendered = re.sub(r'\[([^\]]+)\]\((https?://[^)]+)\)', r'<a href="\2">\1</a>', rendered)
        rendered = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', rendered)
        rendered = re.sub(r'(?<!\*)\*([^*]+)\*(?!\*)', r'<em>\1</em>', rendered)
        return rendered

    def is_table_line(text: str) -> bool:
        t = text.strip()
        return t.startswith('|') and t.endswith('|') and '|' in t[1:-1]

    def is_separator_cell(cell: str) -> bool:
        cell = cell.strip()
        if not cell:
            return False
        if cell.startswith(':'):
            cell = cell[1:]
        if cell.endswith(':'):
            cell = cell[:-1]
        return bool(cell) and set(cell) <= {'-'}

    def parse_table_row(text: str) -> list[str]:
        return [c.strip() for c in text.strip().strip('|').split('|')]

    def close_lists():
        nonlocal in_ul, in_ol
        if in_ul:
            out.append('</ul>')
            in_ul = False
        if in_ol:
            out.append('</ol>')
            in_ol = False

    i = 0
    while i < len(lines):
        raw = lines[i]
        line = raw.rstrip()
        if not line.strip():
            close_lists()
            i += 1
            continue

        if is_table_line(line):
            close_lists()
            header_cells = parse_table_row(line)
            sep_idx = i + 1
            has_separator = False
            if sep_idx < len(lines):
                sep_line = lines[sep_idx].rstrip()
                if is_table_line(sep_line):
                    sep_cells = parse_table_row(sep_line)
                    if len(sep_cells) == len(header_cells) and all(is_separator_cell(c) for c in sep_cells):
                        has_separator = True

            if has_separator:
                out.append('<table><tbody>')
                out.append('<tr>' + ''.join(f'<th>{render_inline_md(c)}</th>' for c in header_cells) + '</tr>')
                i = sep_idx + 1
                while i < len(lines):
                    row_line = lines[i].rstrip()
                    if not is_table_line(row_line):
                        break
                    row_cells = parse_table_row(row_line)
                    if len(row_cells) < len(header_cells):
                        row_cells.extend([''] * (len(header_cells) - len(row_cells)))
                    elif len(row_cells) > len(header_cells):
                        row_cells = row_cells[:len(header_cells)]
                    out.append('<tr>' + ''.join(f'<td>{render_inline_md(c)}</td>' for c in row_cells) + '</tr>')
                    i += 1
                out.append('</tbody></table>')
                continue

        heading_match = re.match(r'^(#{1,6})\s+(.+)$', line)
        if heading_match:
            close_lists()
            level = len(heading_match.group(1))
            text = heading_match.group(2).strip()
            out.append(f'<h{level}>{render_inline_md(text)}</h{level}>')
            i += 1
            continue
        if re.match(r'^\d+\.\s+', line):
            if in_ul:
                out.append('</ul>')
                in_ul = False
            if not in_ol:
                out.append('<ol>')
                in_ol = True
            text = re.sub(r'^\d+\.\s+', '', line)
            out.append(f'<li>{render_inline_md(text)}</li>')
            i += 1
            continue
        if line.lstrip().startswith('- '):
            if in_ol:
                out.append('</ol>')
                in_ol = False
            if not in_ul:
                out.append('<ul>')
                in_ul = True
            text = line.lstrip()[2:]
            out.append(f'<li>{render_inline_md(text)}</li>')
            i += 1
            continue

        close_lists()
        out.append(f'<p>{render_inline_md(line)}</p>')
        i += 1

    close_lists()
    return ''.join(out)


def request_json(url: str, headers: dict, method: str = 'GET', payload: dict | None = None) -> dict:
    data = None
    if payload is not None:
        data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, headers=headers, method=method, data=data)
    with urllib.request.urlopen(req) as resp:
        return json.load(resp)


def main() -> int:
    # ── Load project-config.json for defaults ──────────────────────────────────
    project_config = {}
    config_path = os.path.join(os.getcwd(), 'project-config.json')
    if os.path.isfile(config_path):
        try:
            with open(config_path, 'r', encoding='utf-8') as cf:
                project_config = json.load(cf)
        except Exception as e:
            print(f'Warning: Could not parse project-config.json: {e}', file=sys.stderr)

    confluence_cfg = project_config.get('confluence', {})

    parser = argparse.ArgumentParser()
    parser.add_argument('--title', required=True)
    parser.add_argument('--space-key', default=confluence_cfg.get('spaceKey'))
    parser.add_argument('--parent-id', default=confluence_cfg.get('parentPageId'))
    parser.add_argument('--md-path', required=True)
    args = parser.parse_args()

    if not args.space_key or not args.parent_id:
        print(json.dumps({'error': 'Missing --space-key or --parent-id. Set them via CLI args or in project-config.json.'}))
        return 1

    host = os.environ.get('JIRA_HOST', '').rstrip('/')
    email = os.environ.get('JIRA_EMAIL')
    token = os.environ.get('JIRA_API_TOKEN')
    if not host or not email or not token:
        print(json.dumps({'error': 'Missing JIRA_HOST/JIRA_EMAIL/JIRA_API_TOKEN'}))
        return 1

    with open(args.md_path, 'r', encoding='utf-8') as f:
        body_html = md_to_storage(f.read())

    auth = base64.b64encode(f'{email}:{token}'.encode('utf-8')).decode('utf-8')
    headers = {
        'Authorization': f'Basic {auth}',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
    }

    query = urllib.parse.urlencode({
        'title': args.title,
        'spaceKey': args.space_key,
        'expand': 'version',
    })
    search_url = f'{host}/wiki/rest/api/content?{query}'
    existing = request_json(search_url, headers)
    results = existing.get('results', [])

    if results:
        page = results[0]
        page_id = page['id']
        payload = {
            'id': page_id,
            'type': 'page',
            'title': args.title,
            'space': {'key': args.space_key},
            'ancestors': [{'id': args.parent_id}],
            'version': {'number': page['version']['number'] + 1},
            'body': {'storage': {'value': body_html, 'representation': 'storage'}},
        }
        result = request_json(f'{host}/wiki/rest/api/content/{page_id}', headers, method='PUT', payload=payload)
        method = 'PUT'
    else:
        payload = {
            'type': 'page',
            'title': args.title,
            'space': {'key': args.space_key},
            'ancestors': [{'id': args.parent_id}],
            'body': {'storage': {'value': body_html, 'representation': 'storage'}},
        }
        result = request_json(f'{host}/wiki/rest/api/content', headers, method='POST', payload=payload)
        method = 'POST'

    webui = result.get('_links', {}).get('webui', '')
    # Confluence REST API returns webui without the /wiki prefix; add it back.
    if webui and not webui.startswith('/wiki/'):
        webui = '/wiki' + webui
    full_url = f'{host}{webui}' if webui else ''
    print(json.dumps({
        'pageId': result.get('id'),
        'title': result.get('title'),
        'url': full_url,
        'method': method,
    }, indent=2))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
