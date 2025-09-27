// RSS feed generation utilities
import { Article } from '../lib/supabase';

export interface RSSItem {
  id: string;
  title: string;
  content: string;
  published_at: string;
  author?: string;
}

export function escapeXml(unsafe: string): string {
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function buildRssXml(articles: Article[], siteInfo: {
  title: string;
  link: string;
  description: string;
}): string {
  const itemsXml = articles
    .filter(article => article.is_published)
    .map(article => {
      const author = article.user_profiles?.display_name || 'Unknown Author';
      return `    <item>
      <title>${escapeXml(article.title)}</title>
      <link>${siteInfo.link}/article/${article.id}</link>
      <guid isPermaLink="false">${article.id}</guid>
      <pubDate>${new Date(article.published_at).toUTCString()}</pubDate>
      <description>${escapeXml(article.content)}</description>
      <author>${escapeXml(author)}</author>
    </item>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(siteInfo.title)}</title>
    <link>${siteInfo.link}</link>
    <description>${escapeXml(siteInfo.description)}</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <generator>RSS Feed Blog - Supabase Powered</generator>
${itemsXml}
  </channel>
</rss>`;
}

export function downloadRssFile(xmlContent: string, filename: string = 'feed.xml'): void {
  const blob = new Blob([xmlContent], { type: 'application/rss+xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function generateRssAndDownload(articles: Article[], siteTitle: string = 'RSS Feed Blog'): void {
  const siteInfo = {
    title: siteTitle,
    link: window.location.origin,
    description: 'Stay updated with the latest articles and real-time notifications.'
  };
  
  if (!articles || articles.length === 0) {
    alert('No published articles available for RSS feed.');
    return;
  }
  
  const rssXml = buildRssXml(articles, siteInfo);
  downloadRssFile(rssXml);
}