import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { marked } from 'marked';

// Marked is configured once, at module load, with GitHub-flavoured defaults
// so a section body written in Markdown renders full rich text: fenced code
// blocks, tables, task lists, autolinks, and hard line breaks.
marked.setOptions({
  gfm: true,
  breaks: false,
});

// ── Blog helpers ──────────────────────────────────────────────
interface BlogSection {
  heading: string;
  body: string;
}

interface BlogPost {
  id: number;
  slug: string;
  title: string;
  meta_title: string;
  meta_description: string;
  category: string;
  tags: string[];
  author: string;
  published_at: string;
  read_time_minutes: number;
  cover_image: string;
  excerpt: string;
  content: {
    intro: string;
    sections: BlogSection[];
    conclusion: string;
  };
}

function loadBlogs(): BlogPost[] {
  const filePath = path.join(__dirname, '../../public/blogs.json');
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as BlogPost[];
}

function escHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Wrap raw code-looking blocks in fenced-code markers so legacy plain-text
// section bodies (no Markdown fences) still render as proper <pre><code>.
// A "code block" is a run of consecutive non-blank lines whose first non-space
// char is one of `{[<` (JSON, HTML, XML) or that start with a known shell tool.
function autoFenceCodeBlocks(text: string): string {
  const lines = text.split('\n');
  const out: string[] = [];
  let i = 0;
  const SHELL_START =
    /^\s*(npm|npx|yarn|pnpm|bun|bunx|curl|wget|git|docker|sudo|cat|echo|codex\s+mcp|claude\s+mcp|export|kubectl)\b/;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    const firstChar = trimmed[0];
    const isCodeStart =
      trimmed.length > 0 &&
      (firstChar === '{' || firstChar === '[' || firstChar === '<' || SHELL_START.test(trimmed));
    // Don't re-fence content the author already fenced.
    if (isCodeStart && !text.slice(0, text.indexOf(line)).endsWith('```\n')) {
      const buf: string[] = [];
      // Consume until a blank line (end of block).
      while (i < lines.length && lines[i].trim() !== '') {
        buf.push(lines[i]);
        i++;
      }
      const first = buf[0].trim()[0];
      const lang = first === '{' || first === '[' ? 'json' : first === '<' ? 'html' : 'bash';
      out.push('```' + lang);
      out.push(...buf);
      out.push('```');
    } else {
      out.push(line);
      i++;
    }
  }
  return out.join('\n');
}

// Render a section body (Markdown or legacy plain text) into rich HTML.
function renderMarkdown(text: string): string {
  return marked.parse(autoFenceCodeBlocks(text || ''), { async: false }) as string;
}

// ── Controller ────────────────────────────────────────────────
export const viewController = {
  home(_req: Request, res: Response): void {
    res.sendFile(path.join(__dirname, '../../public/index.html'));
  },

  results(_req: Request, res: Response): void {
    res.sendFile(path.join(__dirname, '../../public/results.html'));
  },

  privacyPolicy(_req: Request, res: Response): void {
    res.sendFile(path.join(__dirname, '../../public/privacy-policy.html'));
  },

  termsOfService(_req: Request, res: Response): void {
    res.sendFile(path.join(__dirname, '../../public/terms-of-service.html'));
  },

  cookiePolicy(_req: Request, res: Response): void {
    res.sendFile(path.join(__dirname, '../../public/cookie-policy.html'));
  },

  about(_req: Request, res: Response): void {
    res.sendFile(path.join(__dirname, '../../public/about.html'));
  },

  apiDocsPublic(_req: Request, res: Response): void {
    res.sendFile(path.join(__dirname, '../../public/api-docs-public.html'));
  },

  sitemapXml(_req: Request, res: Response): void {
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    res.setHeader('X-Robots-Tag', 'noindex');
    res.sendFile(path.join(__dirname, '../../public/sitemap.xml'));
  },

  robotsTxt(_req: Request, res: Response): void {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    res.setHeader('X-Robots-Tag', 'noindex');
    res.sendFile(path.join(__dirname, '../../public/robots.txt'));
  },

  llmsTxt(_req: Request, res: Response): void {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    res.sendFile(path.join(__dirname, '../../public/llms.txt'));
  },

  llmsFullTxt(_req: Request, res: Response): void {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    res.sendFile(path.join(__dirname, '../../public/llms-full.txt'));
  },

  notFound(_req: Request, res: Response): void {
    res.status(404).sendFile(path.join(__dirname, '../../public/404.html'));
  },

  // ── Blog listing ──────────────────────────────────────────
  blogList(_req: Request, res: Response): void {
    try {
      const blogs = loadBlogs();
      const templatePath = path.join(__dirname, '../../public/blogs.html');
      let html = fs.readFileSync(templatePath, 'utf-8');

      // Build blog cards
      const cards = blogs
        .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime())
        .map(
          (post) => `
      <a href="/blogs/${escHtml(post.slug)}" class="bg-white rounded-2xl shadow border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow block">
        <div class="p-6">
          <div class="flex items-center gap-3 mb-3">
            <span class="bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full">${escHtml(post.category)}</span>
            <span class="text-gray-500 text-xs">${post.read_time_minutes} min read</span>
          </div>
          <h2 class="text-lg font-bold text-gray-800 mb-2 leading-snug">${escHtml(post.title)}</h2>
          <p class="text-gray-600 text-sm mb-3 line-clamp-3">${escHtml(post.excerpt)}</p>
          <time class="text-gray-500 text-xs" datetime="${escHtml(post.published_at)}">${formatDate(post.published_at)}</time>
        </div>
      </a>`
        )
        .join('\n');

      // Build JSON-LD (CollectionPage + ItemList)
      const jsonLd = JSON.stringify(
        {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'Blog, WebCrawler.buzz',
          description:
            'Guides on web crawling, technical SEO, site audits, and getting the most out of your domain crawler.',
          url: 'https://webcrawler.buzz/blogs',
          isPartOf: {
            '@type': 'WebSite',
            name: 'WebCrawler.buzz',
            url: 'https://webcrawler.buzz/',
          },
          mainEntity: {
            '@type': 'ItemList',
            itemListElement: blogs.map((post, idx) => ({
              '@type': 'ListItem',
              position: idx + 1,
              url: `https://webcrawler.buzz/blogs/${post.slug}`,
              name: post.title,
            })),
          },
        },
        null,
        2
      );

      html = html.replace('{{BLOG_CARDS}}', cards);
      html = html.replace('{{JSONLD_BLOG_LIST}}', jsonLd);

      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (err: any) {
      console.error('[View] blogList error:', err.message);
      res.status(500).send('Internal server error.');
    }
  },

  // ── Individual blog post ──────────────────────────────────
  blogPost(req: Request, res: Response): void {
    try {
      const slug = req.params.slug as string;
      const blogs = loadBlogs();
      const post = blogs.find((b) => b.slug === slug);

      if (!post) {
        res.status(404).send('Blog post not found.');
        return;
      }

      const templatePath = path.join(__dirname, '../../public/blog-post.html');
      let html = fs.readFileSync(templatePath, 'utf-8');

      // Build sections HTML (bare tags — `.prose` styles them). Bodies pass
      // through the Markdown pipeline so fenced code, lists, links, tables,
      // and emphasis all render.
      const sectionsHtml = post.content.sections
        .map(
          (s) => `
        <h2>${escHtml(s.heading)}</h2>
        ${renderMarkdown(s.body)}`
        )
        .join('\n');

      // Build OG article:tag meta tags
      const ogTags = post.tags
        .map((t) => `<meta property="article:tag" content="${escHtml(t)}" />`)
        .join('\n  ');

      // Tag badges use the shared `.chip` class from theme.css.
      const tagBadges = post.tags
        .map((t) => `<span class="chip">${escHtml(t)}</span>`)
        .join('\n          ');

      // Build JSON-LD (Article)
      const jsonLd = JSON.stringify(
        {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: post.title,
          description: post.meta_description,
          image: `https://webcrawler.buzz${post.cover_image}`,
          url: `https://webcrawler.buzz/blogs/${post.slug}`,
          datePublished: post.published_at,
          dateModified: post.published_at,
          author: {
            '@type': 'Organization',
            name: post.author,
          },
          publisher: {
            '@type': 'Organization',
            name: 'WebCrawler.buzz',
            url: 'https://webcrawler.buzz/',
            logo: {
              '@type': 'ImageObject',
              url: 'https://webcrawler.buzz/webcrawler-logo.png',
            },
          },
          mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': `https://webcrawler.buzz/blogs/${post.slug}`,
          },
          keywords: post.tags.join(', '),
        },
        null,
        2
      );

      // Short title for breadcrumb (max 50 chars)
      const titleShort =
        post.title.length > 50 ? post.title.slice(0, 47) + '...' : post.title;

      // Replace all placeholders
      html = html.replace(/\{\{META_TITLE\}\}/g, escHtml(post.meta_title));
      html = html.replace(/\{\{META_DESCRIPTION\}\}/g, escHtml(post.meta_description));
      html = html.replace(
        /\{\{META_KEYWORDS\}\}/g,
        escHtml(post.tags.join(', '))
      );
      html = html.replace(/\{\{SLUG\}\}/g, escHtml(post.slug));
      html = html.replace(/\{\{COVER_IMAGE\}\}/g, escHtml(post.cover_image));
      html = html.replace(/\{\{PUBLISHED_AT\}\}/g, escHtml(post.published_at));
      html = html.replace(/\{\{AUTHOR\}\}/g, escHtml(post.author));
      html = html.replace('<!-- {{OG_ARTICLE_TAGS}} -->', ogTags);
      html = html.replace('{{JSONLD_ARTICLE}}', jsonLd);
      html = html.replace('{{TITLE_SHORT}}', escHtml(titleShort));
      html = html.replace('{{CATEGORY}}', escHtml(post.category));
      html = html.replace('{{READ_TIME}}', String(post.read_time_minutes));
      html = html.replace(
        '{{PUBLISHED_DATE_DISPLAY}}',
        formatDate(post.published_at)
      );
      html = html.replace('{{TITLE}}', escHtml(post.title));
      html = html.replace('{{EXCERPT}}', escHtml(post.excerpt));
      html = html.replace('{{INTRO}}', escHtml(post.content.intro));
      html = html.replace('{{SECTIONS}}', sectionsHtml);
      html = html.replace('{{CONCLUSION}}', escHtml(post.content.conclusion));
      html = html.replace('{{TAG_BADGES}}', tagBadges);

      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (err: any) {
      console.error('[View] blogPost error:', err.message);
      res.status(500).send('Internal server error.');
    }
  },
};
